"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { parsePath } from "@/lib/path";
import { BreakableUrl } from "./BreakableUrl";
import { ConfirmDialog } from "./ConfirmDialog";
import { CopyButton } from "./CopyButton";
import { CreateEndpoint, type EndpointDraft } from "./CreateEndpoint";
import { ArrowRightIcon, PaperPlaneIcon, PlusIcon, TextAlignIcon, TrashIcon } from "./icons";
import { REASONS, jsonError, relativeTime, statusTone, testPathFor } from "./status";
import { useNow } from "./useNow";

export interface EndpointDTO {
  id: string;
  method: string;
  path: string;
  responseBody: string;
  statusCode: number;
  delayMs: number;
  failureRate: number;
  failureStatus: number;
  isActive: boolean;
  specificity: number;
}

export interface RecentCall {
  method: string;
  path: string;
  status: number;
  at: string;
}

/** The last day of traffic: requests per hour, oldest first, and the latest three. */
export interface Activity {
  hours: number[];
  recent: RecentCall[];
}

const STATUS_GROUPS: [string, number[]][] = [
  ["Success", [200, 201, 202, 204]],
  ["Redirect", [301]],
  ["Client error", [400, 401, 403, 404, 409, 422, 429]],
  ["Server error", [500, 502, 503]],
];
const FAILURE_OPTIONS = [400, 401, 403, 404, 429, 500, 502, 503];
const DELAY_PRESETS = [0, 300, 1000, 2000, 5000, 8000];
const MAX_DELAY = 8000;
/** How much of a test response to show before cutting it off. */
const MAX_TEST_CHARS = 4000;

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const sortRoutes = (list: EndpointDTO[]) =>
  // The server's ORDER BY path, method — so a new endpoint lands where a reload would put it.
  [...list].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

export function Dashboard({
  workspaceId,
  workspaceKey,
  origin,
  initialEndpoints,
  initialActivity,
  initialSelectedId,
  now: renderedAt,
}: {
  workspaceId: string;
  workspaceKey: string;
  origin: string;
  initialEndpoints: EndpointDTO[];
  initialActivity: Activity;
  /** Opened from a link, like the request log's "Open GET /orders". */
  initialSelectedId?: string;
  now: number;
}) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEndpoints.find((e) => e.id === initialSelectedId)?.id ?? initialEndpoints[0]?.id ?? null
  );
  // The drawer is open while there's a draft: empty, or an example's.
  const [draft, setDraft] = useState<EndpointDraft | null>(null);
  // The endpoint just created, so its row can rise into the list.
  const [freshId, setFreshId] = useState<string | null>(null);
  const [activity, setActivity] = useState(initialActivity);
  // Whether an endpoint has been picked since the page loaded: only then does
  // the open one fade in. On load it simply replaces the skeleton.
  const [picked, setPicked] = useState(false);
  const now = useNow(renderedAt);
  const pick = (id: string | null) => {
    setSelectedId(id);
    setPicked(true);
  };

  // The server's copy arrives again when the page is refreshed (after back
  // or forward, say): take it, keeping the open endpoint if it still exists.
  useEffect(() => {
    setEndpoints(initialEndpoints);
    setActivity(initialActivity);
    setSelectedId((id) => (initialEndpoints.some((e) => e.id === id) ? id : initialEndpoints[0]?.id ?? null));
  }, [initialEndpoints, initialActivity]);

  const selected = endpoints.find((e) => e.id === selectedId) ?? null;

  const update = (id: string, patch: Partial<EndpointDTO>) =>
    setEndpoints((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  // A test request lands in the log like any other call; this shows it in the
  // sidebar without waiting for a reload.
  const record = (call: RecentCall) =>
    setActivity((a) => ({
      hours: [...a.hours.slice(0, 23), a.hours[23] + 1],
      recent: [call, ...a.recent].slice(0, 3),
    }));

  return (
    <div className="ws-dash">
      <Sidebar
        workspaceKey={workspaceKey}
        endpoints={endpoints}
        selectedId={selectedId}
        freshId={freshId}
        activity={activity}
        now={now}
        loadedAt={renderedAt}
        onSelect={pick}
        onNew={() => setDraft({})}
      />

      {selected ? (
        <Detail
          key={selected.id}
          entering={picked}
          endpoint={selected}
          origin={origin}
          workspaceKey={workspaceKey}
          now={now}
          onChange={(patch) => update(selected.id, patch)}
          onCall={record}
          onDelete={() => {
            const index = endpoints.findIndex((e) => e.id === selected.id);
            const rest = endpoints.filter((e) => e.id !== selected.id);
            setEndpoints(rest);
            pick(rest[Math.min(index, rest.length - 1)]?.id ?? null);
          }}
        />
      ) : (
        <EmptyWorkspace workspaceKey={workspaceKey} origin={origin} onNew={setDraft} />
      )}

      {draft && (
        <CreateEndpoint
          workspaceId={workspaceId}
          workspaceKey={workspaceKey}
          origin={origin}
          initial={draft}
          onClose={() => setDraft(null)}
          onCreated={(endpoint) => {
            setEndpoints((list) => sortRoutes([...list.filter((e) => e.id !== endpoint.id), endpoint]));
            pick(endpoint.id);
            setFreshId(endpoint.id);
          }}
        />
      )}
    </div>
  );
}

/** Starting points for a first endpoint: a route and a sentence that describes it. */
const EXAMPLES: Required<EndpointDraft>[] = [
  { method: "GET", path: "/orders", description: "Twelve orders, one refunded, with customer names and totals" },
  { method: "GET", path: "/orders/:id", description: "A single order with line items, a total and a status" },
  { method: "GET", path: "/users/me", description: "A signed-in user's profile with plan and last login" },
  { method: "POST", path: "/sessions", description: "A login response with an access token and its expiry" },
  { method: "GET", path: "/products", description: "Three products, prices in EUR, one out of stock" },
];

/**
 * A workspace with nothing in it yet: the way in on the left, with the base
 * URL every endpoint will hang off, and examples to start from on the right.
 * An example opens the drawer filled in, one step from generating it.
 */
function EmptyWorkspace({
  workspaceKey,
  origin,
  onNew,
}: {
  workspaceKey: string;
  origin: string;
  onNew: (draft: EndpointDraft) => void;
}) {
  const base = `${origin}/m/${workspaceKey}`;
  return (
    <section className="ws-detail">
      <div className="ws-empty-split">
        <div className="ws-empty">
          <h2>No endpoints yet.</h2>
          <p>
            Create one and it&apos;s live straight away at this workspace&apos;s base URL. Describe it in a sentence or
            write the JSON yourself.
          </p>
          <div className="ws-empty-actions">
            <button type="button" className="ds-btn ds-btn-primary ds-btn-lg" onClick={() => onNew({})}>
              <PlusIcon size={18} />
              New endpoint
            </button>
          </div>
          <div className="ws-empty-base">
            <span className="ds-kicker">Base URL</span>
            <div className="ws-well">
              <code>
                <BreakableUrl value={base} />
              </code>
              <CopyButton value={base} variant="ghost" />
            </div>
            <span className="ws-note">
              Point your app at it now. Every endpoint you add answers under it, at its own path.
            </span>
          </div>
        </div>

        <div className="ws-examples">
          <span className="ds-kicker">Start from an example</span>
          <ul>
            {EXAMPLES.map((example) => (
              <li key={example.method + example.path}>
                <button type="button" className="ws-example" onClick={() => onNew(example)}>
                  <span className="ws-example-route">
                    <span className="ds-method">{example.method}</span>
                    <code>{example.path}</code>
                  </span>
                  <span className="ws-example-text">{example.description}</span>
                  <ArrowRightIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
          <span className="ws-note">
            Each opens the new-endpoint form with the route and description filled in. Change anything before you
            generate it.
          </span>
        </div>
      </div>
    </section>
  );
}

function Sidebar({
  workspaceKey,
  endpoints,
  selectedId,
  freshId,
  activity,
  now,
  loadedAt,
  onSelect,
  onNew,
}: {
  workspaceKey: string;
  endpoints: EndpointDTO[];
  selectedId: string | null;
  freshId: string | null;
  activity: Activity;
  now: number;
  /** When the page was rendered: calls after it are new, and fade in. */
  loadedAt: number;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const total = activity.hours.reduce((sum, n) => sum + n, 0);
  const busiest = Math.max(1, ...activity.hours);

  return (
    <aside className="ws-side" aria-label="Endpoints">
      {/* With no endpoints the empty state beside the list carries the one button. */}
      {endpoints.length > 0 && (
        <button type="button" className="ds-btn ds-btn-primary ds-btn-block ds-btn-lg" onClick={onNew}>
          <PlusIcon size={18} />
          New endpoint
        </button>
      )}

      {/* Empty, the list has nothing to add to "No endpoints yet." beside it. */}
      {endpoints.length > 0 && (
        <div className="ws-side-list">
          <span className="ds-kicker">{plural(endpoints.length, "endpoint", "endpoints")}</span>
          {endpoints.map((e) => (
            <button
              key={e.id}
              type="button"
              className={e.id === freshId ? "ws-ep ws-enter" : "ws-ep"}
              aria-current={e.id === selectedId ? "true" : undefined}
              data-inactive={!e.isActive}
              title={`${e.method} ${e.path}${e.isActive ? "" : " (off)"}`}
              onClick={() => onSelect(e.id)}
            >
              <span
                className="ws-dot ws-dot-round"
                data-tone={!e.isActive ? "off" : statusTone(e.statusCode)}
                aria-hidden="true"
              />
              <span className="ds-method">{e.method}</span>
              <code>{e.path}</code>
              <span className="ws-ep-spec">{e.specificity}</span>
            </button>
          ))}
        </div>
      )}
      {endpoints.length > 1 && (
        <p className="ws-note">
          The number is each route&apos;s specificity. When paths overlap, the higher score is checked first.
        </p>
      )}

      <div className="ws-side-block" style={{ marginTop: "var(--space-4)" }}>
        <span className="ds-kicker">Last 24 hours</span>
        <div className="ws-count-line">
          <span className="ws-figure-num">{total.toLocaleString("en-US")}</span>
          <span>{total === 1 ? "request" : "requests"}</span>
        </div>
        <div className="ws-hours" aria-hidden="true">
          {activity.hours.map((n, i) => (
            <span
              key={i}
              title={`${plural(n, "request", "requests")}, ${23 - i} h ago`}
              data-on={n > 0}
              data-now={i === 23 && n > 0}
              style={{ height: n ? `${Math.max(12, (n / busiest) * 100)}%` : 2 }}
            />
          ))}
        </div>
        <div className="ws-hours-scale">
          <span>24 h ago</span>
          <span>now</span>
        </div>
      </div>

      <div className="ws-side-block">
        <span className="ds-kicker">Recent requests</span>
        <div>
          {activity.recent.map((call, i) => (
            <div
              key={`${call.at}-${i}`}
              className={new Date(call.at).getTime() > loadedAt ? "ws-recent ws-swap" : "ws-recent"}
            >
              <span className="ws-dot" data-tone={statusTone(call.status)} aria-hidden="true" />
              <span className="ws-status-ink" data-tone={statusTone(call.status)}>
                {call.status}
              </span>
              <code title={`${call.method} ${call.path}`}>
                {call.method} {call.path}
              </code>
              <span>{relativeTime(call.at, now)}</span>
            </div>
          ))}
          {activity.recent.length === 0 && (
            <span className="ws-note">None yet. Send a test request to see one here.</span>
          )}
        </div>
        <Link
          href={`/w/${workspaceKey}/logs`}
          className="ds-btn ds-btn-ghost ds-btn-bare"
          style={{ alignSelf: "flex-start", fontSize: 15 }}
        >
          View request log <ArrowRightIcon size={16} />
        </Link>
      </div>
    </aside>
  );
}

type SaveState = "" | "saving" | "saved" | "error";

interface TestResult {
  /** 0 when the request never completed; null while it's in flight. */
  status: number | null;
  ms: number;
  body: string;
  path: string;
  at: string;
}

function specNote(path: string, score: number): string {
  let statics = 0;
  let params = 0;
  let wildcard = false;
  try {
    for (const s of parsePath(path)) {
      if (s.type === "static") statics++;
      else if (s.type === "param") params++;
      else wildcard = true;
    }
  } catch {
    return `Specificity ${score}.`;
  }
  const parts = [`${statics} static ${statics === 1 ? "segment" : "segments"} × 100`];
  if (params) parts.push(`${params} ${params === 1 ? "param" : "params"} × −10`);
  if (wildcard) parts.push("wildcard −50");
  return `Specificity ${score}: ${parts.join(", ")}.`;
}

function delayNote(ms: number): string {
  if (ms === 0) return "Responds right away";
  if (ms >= MAX_DELAY) return "At the timeout cap";
  if (ms < 1000) return "A typical network hop";
  return "Long enough to see loading states";
}

function failureNote(rate: number): string {
  if (rate === 0) return "Every call succeeds";
  if (rate === 100) return "Every call fails";
  return `1 in ${Math.round((100 / rate) * 10) / 10} calls fails`;
}

function bodyMeta(text: string): string {
  try {
    const value = JSON.parse(text);
    if (Array.isArray(value)) return plural(value.length, "record", "records");
    if (value && typeof value === "object") return plural(Object.keys(value).length, "field", "fields");
    return "a single value";
  } catch {
    return "";
  }
}

function Detail({
  endpoint,
  entering,
  origin,
  workspaceKey,
  now,
  onChange,
  onCall,
  onDelete,
}: {
  endpoint: EndpointDTO;
  /** Fade in: it was just picked, rather than arriving with the page. */
  entering: boolean;
  origin: string;
  workspaceKey: string;
  now: number;
  onChange: (patch: Partial<EndpointDTO>) => void;
  onCall: (call: RecentCall) => void;
  onDelete: () => void;
}) {
  const [body, setBody] = useState(endpoint.responseBody);
  const [save, setSave] = useState<SaveState>("");
  const [message, setMessage] = useState<string | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [sending, setSending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<number>();
  const mounted = useRef(true);

  const id = endpoint.id;
  const url = `${origin}/m/${workspaceKey}${endpoint.path}`;
  const testPath = testPathFor(endpoint.path);
  const bodyError = useMemo(() => jsonError(body), [body]);
  const meta = useMemo(() => bodyMeta(body), [body]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (settle.current) clearTimeout(settle.current);
      window.clearInterval(ticker.current);
    };
  }, []);

  const persist = (patch: Record<string, unknown>) => {
    if (timer.current) clearTimeout(timer.current);
    if (settle.current) clearTimeout(settle.current);
    setSave("saving");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/endpoints/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          setSave("saved");
          setMessage(null);
          // "Saved" fades out once it's been read.
          settle.current = setTimeout(() => setSave(""), 2000);
        } else {
          const data = await res.json().catch(() => ({}));
          setSave("error");
          setMessage(data.error ?? "Could not save");
        }
      } catch {
        setSave("error");
        setMessage("Could not reach the server, so that change isn't saved.");
      }
    }, 450);
  };

  const setField = <K extends keyof EndpointDTO>(field: K, value: EndpointDTO[K]) => {
    onChange({ [field]: value } as Partial<EndpointDTO>);
    persist({ [field]: value });
  };

  const sendTest = async () => {
    if (sending) return;
    // The last result stays up, dimmed, until the new one lands.
    setSending(true);
    setElapsed(0);
    const started = performance.now();
    window.clearInterval(ticker.current);
    ticker.current = window.setInterval(() => setElapsed(Math.round(performance.now() - started)), 50);

    let status = 0;
    let text: string;
    try {
      // The mock matches on method, so the test has to use the endpoint's.
      const hasBody = ["POST", "PUT", "PATCH"].includes(endpoint.method);
      // The same-origin path rather than the public URL on screen, so this
      // works on a deployment whose host isn't NEXT_PUBLIC_APP_URL.
      const res = await fetch(`/m/${workspaceKey}${testPath}`, {
        method: endpoint.method,
        cache: "no-store",
        headers: hasBody ? { "content-type": "application/json" } : undefined,
        body: hasBody ? "{}" : undefined,
      });
      status = res.status;
      const raw = await res.text();
      try {
        text = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        text = raw;
      }
    } catch (err) {
      text = err instanceof Error ? err.message : "The request didn't complete.";
    }
    window.clearInterval(ticker.current);
    if (!mounted.current) return;

    const at = new Date().toISOString();
    setTest({
      status,
      ms: Math.round(performance.now() - started),
      body: text.length > MAX_TEST_CHARS ? `${text.slice(0, MAX_TEST_CHARS)}\n…` : text,
      path: testPath,
      at,
    });
    setSending(false);
    if (status) onCall({ method: endpoint.method, path: testPath, status, at });
  };

  const remove = async () => {
    setDeleting(true);
    const res = await fetch(`/api/endpoints/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      onDelete();
      return;
    }
    setDeleting(false);
    setConfirmDelete(false);
    setMessage("Could not delete this endpoint. Try again.");
  };

  const statusIsError = endpoint.statusCode >= 400;
  const failCount = endpoint.isActive ? Math.round(endpoint.failureRate / 5) : 20;
  const failAt = new Set(
    Array.from({ length: failCount }, (_, i) => Math.floor(((i + 0.5) * 20) / Math.max(1, failCount)))
  );
  const delayText = (endpoint.delayMs / 1000).toFixed(1);
  const offStatus = endpoint.isActive ? endpoint.failureStatus : 404;

  return (
    <section className={entering ? "ws-detail ws-swap" : "ws-detail"} aria-label={`${endpoint.method} ${endpoint.path}`}>
      <div className="ws-detail-head">
        <div className="ws-title-row">
          <h1 className="ws-title">
            <span className="ws-title-method">{endpoint.method}</span>
            <code>
              <BreakableUrl value={endpoint.path} />
            </code>
          </h1>
          <div className="ws-title-side">
            <span className="ws-save" data-state={save} aria-live="polite">
              {save === "saving" ? "Saving…" : save === "saved" ? "Saved" : save === "error" ? "Not saved" : ""}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={endpoint.isActive}
              className="ws-switch"
              title={endpoint.isActive ? "Switch off: calls get a 404" : "Switch on"}
              onClick={() => setField("isActive", !endpoint.isActive)}
            >
              <span>{endpoint.isActive ? "Active" : "Off"}</span>
              <span className="ws-switch-track" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="ws-spec-note">{specNote(endpoint.path, endpoint.specificity)}</p>
        {message && (
          <p className="ws-alert ws-enter" role="alert">
            {message}
          </p>
        )}
        <div className="ws-url-row">
          <code>
            <BreakableUrl value={url} />
          </code>
          <div className="ws-btn-group">
            <CopyButton value={url} />
            <CopyButton
              value={`curl -s${endpoint.method === "GET" ? "" : ` -X ${endpoint.method}`} ${url}`}
              label="Copy curl"
              icon="terminal"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="ws-field-head">
          <label className="ds-kicker" htmlFor={`body-${id}`}>
            Response body
          </label>
          <span>{meta}</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="ds-btn ds-btn-ghost ds-btn-sm"
            disabled={Boolean(bodyError)}
            onClick={() => {
              const formatted = JSON.stringify(JSON.parse(body), null, 2);
              setBody(formatted);
              onChange({ responseBody: formatted });
              persist({ responseBody: JSON.parse(formatted) });
            }}
          >
            <TextAlignIcon size={16} />
            Format
          </button>
        </div>
        <textarea
          id={`body-${id}`}
          className="ws-editor"
          rows={15}
          value={body}
          spellCheck={false}
          aria-invalid={Boolean(bodyError)}
          onChange={(e) => {
            setBody(e.target.value);
            onChange({ responseBody: e.target.value });
            if (!jsonError(e.target.value)) persist({ responseBody: JSON.parse(e.target.value) });
          }}
        />
        {bodyError ? (
          <p className="ws-field-note" data-tone="bad">
            {bodyError.replace(/\.?$/, ".")} Nothing is saved until this parses.
          </p>
        ) : (
          <p className="ws-field-note">
            Tokens resolve on every call: <code>{"{{id}}"}</code> becomes the matched path param, and{" "}
            <code>{"{{query.page}}"}</code>, <code>{"{{now}}"}</code> and <code>{"{{index}}"}</code> work too.
          </p>
        )}
      </div>

      <div className="ws-controls">
        <div className="ws-control">
          <div className="ws-control-figure">
            <span className="ds-kicker">Status</span>
            <div className="ws-big" data-tone={statusTone(endpoint.statusCode)}>
              {endpoint.statusCode}
            </div>
            <span>{REASONS[endpoint.statusCode] ?? ""}</span>
          </div>
          <div className="ws-control-body" role="group" aria-label="Status code">
            {STATUS_GROUPS.map(([label, codes]) => (
              <div key={label} className="ws-chips">
                <span>{label}</span>
                {codes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className="ds-btn ds-btn-secondary ws-chip"
                    aria-pressed={endpoint.statusCode === code}
                    data-tone={code >= 400 ? "bad" : undefined}
                    title={`${code} ${REASONS[code]}`}
                    onClick={() => setField("statusCode", code)}
                  >
                    {code}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="ws-control">
          <div className="ws-control-figure">
            <label className="ds-kicker" htmlFor={`delay-${id}`}>
              Delay
            </label>
            <div className="ws-big">
              {delayText}
              <small>s</small>
            </div>
            <span>{delayNote(endpoint.delayMs)}</span>
          </div>
          <div className="ws-control-body">
            <input
              id={`delay-${id}`}
              className="ws-range"
              type="range"
              min={0}
              max={MAX_DELAY}
              step={100}
              value={endpoint.delayMs}
              onChange={(e) => setField("delayMs", Number(e.target.value))}
            />
            <div className="ws-range-scale" aria-hidden="true">
              <span>0</span>
              <span>2 s</span>
              <span>4 s</span>
              <span>6 s</span>
              <span>8 s cap</span>
            </div>
            <div className="ws-chips">
              <span>Presets</span>
              {DELAY_PRESETS.map((ms) => (
                <button
                  key={ms}
                  type="button"
                  className="ds-btn ds-btn-secondary ws-chip"
                  aria-pressed={endpoint.delayMs === ms}
                  title={`${ms.toLocaleString("en-US")} ms`}
                  onClick={() => setField("delayMs", ms)}
                >
                  {ms === 0 ? "None" : `${ms / 1000} s`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ws-control">
          <div className="ws-control-figure">
            <label className="ds-kicker" htmlFor={`failure-${id}`}>
              Failure rate
            </label>
            <div className="ws-big" data-tone={endpoint.failureRate ? "bad" : undefined}>
              {endpoint.failureRate}
              <small>%</small>
            </div>
            <span>{failureNote(endpoint.failureRate)}</span>
          </div>
          <div className="ws-control-body">
            <input
              id={`failure-${id}`}
              className="ws-range"
              data-tone="bad"
              type="range"
              min={0}
              max={100}
              step={5}
              value={endpoint.failureRate}
              onChange={(e) => setField("failureRate", Number(e.target.value))}
            />
            <div className="ws-range-scale" aria-hidden="true">
              <span>0</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <div className="ws-chips" role="group" aria-label="Status for a failed call">
              <span>Fails with</span>
              {FAILURE_OPTIONS.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="ds-btn ds-btn-secondary ws-chip"
                  aria-pressed={endpoint.failureStatus === code}
                  data-tone="bad"
                  title={`${code} ${REASONS[code]}`}
                  onClick={() => setField("failureStatus", code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <figure className="ws-spread">
          <div className="ws-spread-head">
            <span className="ds-kicker">The next 20 calls</span>
            <span>An expected spread, not a recording</span>
          </div>
          <div className="ws-cells" data-tone={statusIsError ? "bad" : undefined} aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => {
              const fails = failAt.has(i);
              return (
                <span
                  key={i}
                  data-fail={fails}
                  title={`Call ${i + 1}: ${
                    fails ? `${offStatus} at once` : `${endpoint.statusCode} after ${delayText} s`
                  }`}
                />
              );
            })}
          </div>
          <figcaption className="ws-legend">
            {!endpoint.isActive ? (
              <span>
                <span className="ws-swatch" data-tone="bad" />
                20 × 404 Not Found, while the endpoint is off
              </span>
            ) : (
              <>
                {failCount < 20 && (
                  <span>
                    <span className="ws-swatch" data-tone={statusIsError ? "soft-bad" : undefined} />
                    {20 - failCount} × {endpoint.statusCode} {REASONS[endpoint.statusCode] ?? ""}
                    {endpoint.delayMs ? ` after ${delayText} s` : ", right away"}
                  </span>
                )}
                {failCount > 0 && (
                  <span>
                    <span className="ws-swatch" data-tone="bad" />
                    {failCount} × {endpoint.failureStatus} {REASONS[endpoint.failureStatus] ?? ""}, right away
                  </span>
                )}
              </>
            )}
          </figcaption>
        </figure>
      </div>

      <div className="ws-stack-lg">
        <div className="ws-actions">
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            style={{ minHeight: 44, fontSize: 16 }}
            onClick={sendTest}
            disabled={sending}
          >
            <PaperPlaneIcon size={18} />
            {sending ? "Sending…" : "Send test request"}
          </button>
          <code>
            {endpoint.method} {testPath}
          </code>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="ds-btn ds-btn-ghost"
            data-tone="danger"
            style={{ fontSize: 15 }}
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon size={17} />
            Delete endpoint
          </button>
        </div>
        {(test || sending) && (
          <TestPanel
            method={endpoint.method}
            path={testPath}
            result={test}
            sending={sending}
            elapsed={elapsed}
            expectMs={endpoint.delayMs}
            now={now}
          />
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${endpoint.method} ${endpoint.path}?`}
          description="Calls to this path will return 404 straight away. This can't be undone."
          confirmLabel="Delete endpoint"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </section>
  );
}

/** A test call's answer: status, a progress rule while it waits, then the body. */
function TestPanel({
  method,
  path,
  result,
  sending,
  elapsed,
  expectMs,
  now,
}: {
  method: string;
  path: string;
  result: TestResult | null;
  sending: boolean;
  elapsed: number;
  expectMs: number;
  now: number;
}) {
  const status = result?.status ?? null;
  const tone = sending ? "live" : status ? statusTone(status) : "bad";
  const head = sending
    ? expectMs > 400
      ? `Waiting ${elapsed.toLocaleString("en-US")} ms`
      : "Sending…"
    : status
      ? `${status} ${REASONS[status] ?? ""} · ${result!.ms.toLocaleString("en-US")} ms`
      : "No response";
  const progress = sending ? Math.min(92, (elapsed / Math.max(1, expectMs + 60)) * 100) : 100;

  return (
    <div className="ws-test ws-enter" aria-busy={sending}>
      <div className="ws-test-head">
        <span className="ds-status" data-tone={tone} aria-live="polite">
          {head}
        </span>
        <span>
          {method} {result && !sending ? result.path : path}
          {result && !sending ? ` · ${relativeTime(result.at, now)}` : ""}
        </span>
      </div>
      <div className="ds-progress" data-tone={!sending && tone === "bad" ? "bad" : undefined}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <pre>{result ? result.body || "(empty body)" : `→ ${method} ${path}`}</pre>
    </div>
  );
}
