"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchSegments } from "@/lib/match";
import { parsePath, specificity, splitRequestPath } from "@/lib/path";
import { ConfirmDialog } from "./ConfirmDialog";
import { CopyButton } from "./CopyButton";
import { ArrowClockwiseIcon, ArrowRightIcon, BroomIcon, CheckCircleIcon, LightningIcon, QuestionIcon } from "./icons";
import { REASONS, formatMs, relativeTime, statusTone } from "./status";
import { useMediaQuery } from "./useMediaQuery";
import { useNow } from "./useNow";
import { KeyValueRows } from "./Skeletons";
// A log entry as the list has it; its path carries the query string, if any.
import type { LogSummary } from "@/lib/logs";


/** The rest of an entry, fetched when it's opened. */
interface LogDetail extends LogSummary {
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  responseBody: string | null;
  responseSize: number;
}

export interface RouteRef {
  id: string;
  method: string;
  path: string;
}

/** By status class, or "unmatched": calls no endpoint answered. */
type Filter = "all" | "2xx" | "4xx" | "5xx" | "unmatched";

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["2xx", "2xx"],
  ["4xx", "4xx"],
  ["5xx", "5xx"],
  ["unmatched", "No match"],
];

const POLL_MS = 5000;
const NULL_BODY = new Set([204, 205, 304]);

const bucket = (status: number): Exclude<Filter, "all"> => (status >= 500 ? "5xx" : status >= 400 ? "4xx" : "2xx");
const splitPath = (full: string) => {
  const at = full.indexOf("?");
  return at < 0 ? { path: full, qs: "" } : { path: full.slice(0, at), qs: full.slice(at + 1) };
};
const suggestion = (note: string | null) =>
  note?.startsWith("did you mean ") ? note.slice("did you mean ".length).replace(/\?$/, "") : null;

export function RequestLog({
  workspaceId,
  workspaceKey,
  origin,
  routes,
  initialLogs,
  now: renderedAt,
}: {
  workspaceId: string;
  workspaceKey: string;
  origin: string;
  routes: RouteRef[];
  /** The log as the server read it for the page, so it opens with its entries. */
  initialLogs: LogSummary[];
  now: number;
}) {
  const [logs, setLogs] = useState<LogSummary[]>(initialLogs);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, LogDetail>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const seen = useRef<Set<string>>(new Set(initialLogs.map((l) => l.id)));
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const now = useNow(renderedAt, 5000);
  const router = useRouter();

  // The server's copy arrives again when the page is refreshed (after back
  // or forward, or a clear): take it, without flashing what was already seen.
  useEffect(() => {
    initialLogs.forEach((l) => seen.current.add(l.id));
    setLogs(initialLogs);
  }, [initialLogs]);
  // Too narrow for the list and the entry side by side: an entry opens in
  // the list under its own row, and none is open until one is tapped.
  const inline = useMediaQuery("(max-width: 999px)");

  const load = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/logs`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return null;
    const data = (await res.json()) as { logs: LogSummary[] };
    // Entries that weren't there when the page opened flash once as they land.
    const arriving = new Set(data.logs.filter((l) => !seen.current.has(l.id)).map((l) => l.id));
    data.logs.forEach((l) => seen.current.add(l.id));
    setFresh(arriving);
    setLogs(data.logs);
    return data.logs;
  }, [workspaceId]);

  // The page arrived with the log, so this only keeps it current.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const needle = query.trim().toLowerCase();
  const counts = useMemo(() => {
    const c = { all: logs.length, "2xx": 0, "4xx": 0, "5xx": 0, unmatched: 0 };
    logs.forEach((l) => {
      c[bucket(l.statusCode)]++;
      if (!l.matched) c.unmatched++;
    });
    return c;
  }, [logs]);
  const inFilter = (l: LogSummary) =>
    filter === "all" || (filter === "unmatched" ? !l.matched : bucket(l.statusCode) === filter);
  const shown = logs.filter((l) => inFilter(l) && (!needle || l.path.toLowerCase().includes(needle)));
  const selected = shown.find((l) => l.id === selectedId) ?? (inline ? null : shown[0] ?? null);

  const stats = useMemo(() => {
    const errors = logs.filter((l) => l.statusCode >= 400).length;
    // Calls to a path no endpoint serves: a typo in the app, or an endpoint
    // still to make. Counted by path as well, since one missing route
    // called fifty times is one thing to fix.
    const unmatchedPaths = new Set(logs.filter((l) => !l.matched).map((l) => `${l.method} ${splitPath(l.path).path}`));
    return {
      errors,
      errorRate: logs.length ? Math.round((errors / logs.length) * 100) : 0,
      unmatchedPaths: unmatchedPaths.size,
      slowest: logs.length ? Math.max(...logs.map((l) => l.durationMs)) : null,
    };
  }, [logs]);

  // Fetch the open entry's headers and bodies once; entries never change.
  const selectedKey = selected?.id;
  useEffect(() => {
    if (!selectedKey || details[selectedKey]) return;
    let live = true;
    fetch(`/api/workspaces/${workspaceId}/logs/${selectedKey}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((full: LogDetail | null) => {
        if (live && full) setDetails((d) => ({ ...d, [full.id]: full }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [selectedKey, details, workspaceId]);

  const clear = async () => {
    setClearing(true);
    await fetch(`/api/workspaces/${workspaceId}/logs`, { method: "DELETE" }).catch(() => null);
    setLogs([]);
    setDetails({});
    setSelectedId(null);
    setClearing(false);
    setConfirmClear(false);
    // The workspace header's request count, and the endpoints page's
    // activity, are read on the server: refresh so they follow.
    router.refresh();
  };

  const replay = async (entry: LogSummary, detail: LogDetail | undefined) => {
    if (replaying) return;
    setReplaying(true);
    const hasBody = detail?.body !== null && detail?.body !== undefined && !["GET", "HEAD"].includes(entry.method);
    await fetch(`/m/${workspaceKey}${entry.path}`, {
      method: entry.method,
      cache: "no-store",
      headers: hasBody ? { "content-type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(detail!.body) : undefined,
    }).catch(() => null);
    const next = await load();
    setReplaying(false);
    if (next?.length) {
      setFilter("all");
      setQuery("");
      setSelectedId(next[0].id);
    }
  };

  const entry = (l: LogSummary, inlined: boolean) => (
    <Entry
      key={`entry-${l.id}`}
      entry={l}
      detail={details[l.id]}
      routes={routes}
      workspaceKey={workspaceKey}
      origin={origin}
      now={now}
      inline={inlined}
      // Beside the list, an entry fades in when one is picked; the first one,
      // open as the page loads, simply replaces the skeleton.
      entering={selectedId !== null}
      replaying={replaying}
      onReplay={() => replay(l, details[l.id])}
    />
  );

  return (
    <div>
      <div className="ws-log-head">
        <div>
          <h1 className="ws-display">Request log</h1>
          <p className="ws-lede">
            Every call to this workspace, newest first, with what was sent, which route answered and what went back.
          </p>
        </div>
        <div className="ws-stats">
          <Stat value={logs.length.toLocaleString("en-US")} label={logs.length === 1 ? "request" : "requests"} />
          <Stat value={`${stats.errorRate}%`} label="errors" bad={stats.errors > 0} />
          <Stat
            value={counts.unmatched.toLocaleString("en-US")}
            label={
              counts.unmatched
                ? `unmatched, ${stats.unmatchedPaths} ${stats.unmatchedPaths === 1 ? "path" : "paths"}`
                : "unmatched"
            }
            bad={counts.unmatched > 0}
            title={counts.unmatched ? "Show the requests no endpoint matched" : undefined}
            onClick={
              counts.unmatched
                ? () => {
                    setFilter("unmatched");
                    setQuery("");
                    setSelectedId(null);
                  }
                : undefined
            }
          />
          <Stat value={stats.slowest === null ? "—" : formatMs(stats.slowest)} label="slowest" />
        </div>
      </div>

      <div className="ws-toolbar ws-log-toolbar">
        <div className="ds-seg" role="radiogroup" aria-label="Filter by status">
          {FILTERS.map(([id, label]) => (
            <label key={id} className="ds-seg-opt">
              <input type="radio" name="log-filter" checked={filter === id} onChange={() => setFilter(id)} />
              {label} {counts[id]}
            </label>
          ))}
        </div>
        <input
          className="ds-input ds-input-mono"
          style={{ fontSize: 14 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by path"
          aria-label="Filter by path"
          spellCheck={false}
        />
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="ds-btn ds-btn-ghost"
          data-tone="danger"
          style={{ fontSize: 15 }}
          onClick={() => setConfirmClear(true)}
          disabled={logs.length === 0}
        >
          <BroomIcon size={17} />
          Clear log
        </button>
      </div>

      {logs.length > 0 ? (
        <div className="ws-log-body">
          <div className="ws-log-list">
            <div className="ws-log-grid ws-log-cols" aria-hidden="true">
              <span>Status</span>
              <span>Method</span>
              <span>Path</span>
              <span>Time</span>
              <span>When</span>
            </div>
            {shown.map((l) => {
              const tone = statusTone(l.statusCode);
              const tag = !l.matched ? "no match" : l.note === "injected failure" ? "injected" : l.delayMs ? "delayed" : "";
              const open = selected?.id === l.id;
              return (
                <Fragment key={l.id}>
                  {/* Inline, a second tap on an open row closes its entry. */}
                  <button
                    type="button"
                    className={`ws-log-row ws-log-grid${fresh.has(l.id) ? " ws-flash" : ""}`}
                    aria-current={open ? "true" : undefined}
                    aria-expanded={inline ? open : undefined}
                    onClick={() => setSelectedId(inline && open ? null : l.id)}
                  >
                    <span className="ws-log-status" data-tone={tone}>
                      <span className="ws-dot" data-tone={tone} />
                      {l.statusCode}
                    </span>
                    <span className="ds-method">{l.method}</span>
                    <span className="ws-log-path">
                      <code title={l.path}>{l.path}</code>
                      {tag && (
                        <span className="ws-log-tag" data-tone={tag === "delayed" ? undefined : "bad"}>
                          {tag}
                        </span>
                      )}
                    </span>
                    <span className="ws-log-ms">{formatMs(l.durationMs)}</span>
                    <span className="ws-log-ago">{relativeTime(l.createdAt, now).replace(" ago", "")}</span>
                  </button>
                  {inline && open && entry(l, true)}
                </Fragment>
              );
            })}
            {shown.length === 0 && <p className="ws-log-more">No requests match this filter.</p>}
            {logs.length >= 500 && shown.length > 0 && (
              <p className="ws-log-more">The log keeps the latest 500 requests.</p>
            )}
          </div>

          {!inline && selected && entry(selected, false)}
        </div>
      ) : (
        <p className="ws-empty" style={{ marginTop: "var(--space-8)", fontSize: 18, color: "var(--color-neutral-700)" }}>
          Nothing here yet. Call one of your mock URLs, or send a test request from an endpoint, and it shows up here.
        </p>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear the request log?"
          description={`All ${logs.length.toLocaleString("en-US")} ${
            logs.length === 1 ? "entry is" : "entries are"
          } removed for this workspace. Endpoints aren't affected.`}
          confirmLabel="Clear log"
          busy={clearing}
          onConfirm={clear}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  bad = false,
  title,
  onClick,
}: {
  value: string;
  label: string;
  bad?: boolean;
  title?: string;
  /** Makes the figure a button, for one that filters the list to what it counts. */
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="ws-figure-num" data-tone={bad ? "bad" : undefined}>
        {value}
      </span>
      <span>{label}</span>
    </>
  );
  return onClick ? (
    <button type="button" className="ws-stat ws-stat-button" onClick={onClick} title={title}>
      {body}
    </button>
  ) : (
    <div className="ws-stat">{body}</div>
  );
}

/** The selected request in full: what was sent, which route answered, and what went back. */
function Entry({
  entry,
  detail,
  routes,
  workspaceKey,
  origin,
  now,
  inline,
  entering,
  replaying,
  onReplay,
}: {
  entry: LogSummary;
  detail: LogDetail | undefined;
  routes: RouteRef[];
  workspaceKey: string;
  origin: string;
  now: number;
  /** Opened in the list under its row, rather than beside the list. */
  inline: boolean;
  entering: boolean;
  replaying: boolean;
  onReplay: () => void;
}) {
  const tone = statusTone(entry.statusCode);
  const { path } = splitPath(entry.path);
  const route = entry.endpointId ? routes.find((r) => r.id === entry.endpointId) ?? null : null;
  const injected = entry.note === "injected failure";

  // The route as it stands now. If its pattern still fits the request, the
  // params it captured can be worked out again here.
  const hit = useMemo(() => {
    if (!route) return null;
    try {
      return matchSegments(parsePath(route.path), splitRequestPath(path));
    } catch {
      return null;
    }
  }, [route, path]);
  const params = hit ? Object.entries(hit.params) : [];

  let explain: string;
  let Icon = CheckCircleIcon;
  if (!entry.matched) {
    Icon = QuestionIcon;
    const near = suggestion(entry.note);
    explain = near
      ? `No endpoint matched ${entry.method} ${path}. The 404 suggested ${near}, the closest path this workspace serves.`
      : `No endpoint matched ${entry.method} ${path}. The 404 body lists every path this workspace serves.`;
  } else if (!route) {
    explain = injected
      ? `Matched an endpoint that has since been deleted, then failure injection returned ${entry.statusCode}.`
      : "Matched an endpoint that has since been deleted.";
    if (injected) Icon = LightningIcon;
  } else if (injected) {
    Icon = LightningIcon;
    explain = `Matched ${route.path}, then failure injection fired and returned ${entry.statusCode} straight away, skipping the delay.`;
  } else {
    const captured = params.map(([k, v]) => `${k} = ${v}`).join(", ");
    explain =
      `Matched ${route.path} (specificity ${specificity(parsePath(route.path))})` +
      (captured ? ` with ${captured}` : "") +
      (hit?.wildcard ? `; the wildcard captured ${hit.wildcard}` : "") +
      ".";
  }

  const work = Math.max(0, entry.durationMs - entry.delayMs);
  const delayShare = entry.durationMs ? (entry.delayMs / entry.durationMs) * 100 : 0;
  const url = `${origin}/m/${workspaceKey}${entry.path}`;
  const sentBody = detail && detail.body !== null && detail.body !== undefined ? detail.body : null;
  const curl =
    `curl -s${entry.method === "GET" ? "" : ` -X ${entry.method}`} '${url}'` +
    (sentBody !== null ? ` -H 'content-type: application/json' -d '${JSON.stringify(sentBody)}'` : "");

  const rows: { k: string; v: string; accent?: boolean }[] = detail
    ? [
        ...Object.entries(detail.query ?? {}).map(([k, v]) => ({ k: `?${k}`, v: String(v), accent: true })),
        ...params.map(([k, v]) => ({ k: `:${k}`, v, accent: true })),
        ...Object.entries(detail.headers ?? {}).map(([k, v]) => ({ k, v: String(v) })),
      ]
    : [];

  const reqBody =
    sentBody === null
      ? null
      : typeof sentBody === "object" && sentBody !== null && "raw" in sentBody && Object.keys(sentBody).length === 1
        ? String((sentBody as { raw: unknown }).raw)
        : JSON.stringify(sentBody, null, 2);

  let respMeta = "";
  let respBody = "";
  if (detail) {
    if (detail.responseBody !== null) {
      respMeta = `application/json · ${detail.responseSize.toLocaleString("en-US")} bytes`;
      respBody = detail.responseBody;
    } else if (NULL_BODY.has(entry.statusCode)) {
      respMeta = "no body";
      respBody = "(empty body)";
    } else {
      respMeta = "not recorded";
      respBody = "This request was logged before responses were kept.";
    }
  }

  return (
    <article
      className={`ws-log-detail ${inline ? "ws-log-inline ws-enter" : entering ? "ws-swap" : ""}`}
      aria-label={`${entry.method} ${entry.path}`}
    >
      <div className="ws-stack">
        <div className="ws-ld-title">
          <span>{entry.method}</span>
          <code>{entry.path}</code>
        </div>
        <div className="ws-ld-line">
          <span className="ws-log-status" data-tone={tone}>
            <span className="ws-dot" data-tone={tone} />
            {entry.statusCode} {REASONS[entry.statusCode] ?? ""}
          </span>
          <span>{entry.durationMs.toLocaleString("en-US")} ms</span>
          <span className="ds-muted">
            {new Date(entry.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            · {relativeTime(entry.createdAt, now)}
          </span>
        </div>
        <p className="ws-ld-explain" data-tone={!entry.matched || injected ? "bad" : undefined}>
          <Icon size={20} />
          <span>{explain}</span>
        </p>
        <div className="ws-btn-group" style={{ marginTop: "var(--space-2)" }}>
          <CopyButton value={curl} label="Copy as curl" icon="terminal" />
          <button type="button" className="ds-btn ds-btn-secondary ds-btn-sm" onClick={onReplay} disabled={replaying}>
            <ArrowClockwiseIcon size={16} />
            {replaying ? "Replaying…" : "Replay"}
          </button>
          {route && (
            <Link href={`/w/${workspaceKey}?endpoint=${route.id}`} className="ds-btn ds-btn-ghost ds-btn-sm">
              Open {route.method} {route.path} <ArrowRightIcon size={16} />
            </Link>
          )}
        </div>
      </div>

      <figure className="ws-ld-section">
        <span className="ds-kicker">Timing</span>
        <div className="ws-timing" data-tone={tone === "bad" ? "bad" : undefined}>
          <span title="Configured delay" style={{ width: `${delayShare}%` }} />
          <span title="Routing and response" style={{ width: `${100 - delayShare}%` }} />
        </div>
        <figcaption className="ws-timing-legend">
          <span>
            <span className="ws-swatch" />
            Configured delay {entry.delayMs.toLocaleString("en-US")} ms
          </span>
          <span>
            <span className="ws-swatch" data-tone={tone === "bad" ? "bad" : "work"} />
            Routing and response {work.toLocaleString("en-US")} ms
          </span>
        </figcaption>
      </figure>

      <div className="ws-ld-section">
        <span className="ds-kicker">Request</span>
        {detail ? (
          <table className="ds-table ws-kv">
            <tbody>
              {rows.map((row) => (
                <tr key={row.k}>
                  <td data-tone={row.accent ? "accent" : undefined}>{row.k}</td>
                  <td>{row.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <KeyValueRows />
        )}
      </div>

      {reqBody !== null && (
        <div className="ws-ld-section">
          <span className="ds-kicker">Request body</span>
          <pre className="ws-code" style={{ maxHeight: 220 }}>
            {reqBody}
          </pre>
        </div>
      )}

      <div className="ws-ld-section">
        <div className="ws-ld-section-head">
          <span className="ds-kicker">Response</span>
          <span>{respMeta}</span>
        </div>
        {detail ? (
          <pre className="ws-code" style={{ maxHeight: 320 }}>
            {respBody}
          </pre>
        ) : (
          <span className="ws-skel" style={{ height: 120 }} />
        )}
      </div>
    </article>
  );
}
