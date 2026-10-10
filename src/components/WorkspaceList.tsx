"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { ArrowRightIcon, PlusIcon } from "./icons";
import { NewWorkspaceDialog } from "./NewWorkspaceDialog";

export interface WorkspaceRow {
  id: string;
  key: string;
  name: string;
  endpoints: number;
  createdAt: string;
  expiresAt: string | null;
}

type Filter = "all" | "live" | "expired";
type Lifetime = "kept" | "live" | "expired";

const HOUR = 3600e3;

/** The empty list's walk-through: what a workspace is for, step by step. */
const STEPS: [string, string][] = [
  ["Create a workspace", "Give it a name and it gets a base URL of its own, like {host}/m/a8f3k2."],
  ["Add endpoints", "Describe each one in a sentence, or write its JSON. It answers at its path straight away."],
  [
    "Point your app at it",
    "Use the base URL in place of the real API's. Add a delay or a failure rate to build the loading and error states.",
  ],
];

/** Dates in UTC, so the server's render and the browser's agree on them. */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function rel(ms: number): string {
  const h = Math.round(Math.abs(ms) / HOUR);
  if (h < 1) return "under an hour";
  if (h < 48) return `${h} ${h === 1 ? "hour" : "hours"}`;
  return `${Math.round(h / 24)} days`;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** The workspace list, with its filter, the table and the new-workspace dialog. */
export function WorkspaceList({ rows, origin, now }: { rows: WorkspaceRow[]; origin: string; now: number }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new workspace shows straight away, ahead of the refresh that confirms it.
  const [added, setAdded] = useState<WorkspaceRow[]>([]);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  useEffect(() => {
    setAdded((list) => list.filter((a) => !rows.some((r) => r.id === a.id)));
  }, [rows]);

  const list = [...added.filter((a) => !rows.some((r) => r.id === a.id)), ...rows];
  const lifetime = (w: WorkspaceRow): Lifetime =>
    !w.expiresAt ? "kept" : new Date(w.expiresAt).getTime() <= now ? "expired" : "live";
  const counts = {
    all: list.length,
    live: list.filter((w) => lifetime(w) !== "expired").length,
    expired: list.filter((w) => lifetime(w) === "expired").length,
  };
  const shown = list.filter(
    (w) => filter === "all" || (filter === "live" ? lifetime(w) !== "expired" : lifetime(w) === "expired")
  );
  const endpoints = list.reduce((n, w) => n + w.endpoints, 0);
  const summary = [
    plural(counts.all, "workspace", "workspaces"),
    plural(endpoints, "endpoint", "endpoints"),
    counts.expired ? `${counts.expired} expired` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const host = origin.replace(/^https?:\/\//, "");

  const create = async (name: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the workspace");
      setAdded((rows) => [
        { id: data.id, key: data.key, name: data.name, endpoints: 0, createdAt: data.createdAt, expiresAt: data.expiresAt },
        ...rows,
      ]);
      setFreshKey(data.key);
      setFilter("all");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the workspace");
    } finally {
      setBusy(false);
    }
  };

  const newButton = (
    <button type="button" className="ds-btn ds-btn-primary ds-btn-lg" onClick={() => setOpen(true)}>
      <PlusIcon size={18} />
      New workspace
    </button>
  );

  return (
    <>
      <div className="ws-index-head">
        <div>
          <h1 className="ws-index-title">Workspaces</h1>
          <p className="ws-lede">
            Each workspace is a set of mock endpoints under one shared base URL. Make one per project, or one per API
            surface you&apos;re building against.
          </p>
        </div>
        {/* With no workspaces the empty state below carries the one button. */}
        {list.length > 0 && newButton}
      </div>

      {list.length > 0 ? (
        <>
          <div className="ws-toolbar ws-index-toolbar">
            <div className="ds-seg" role="radiogroup" aria-label="Filter workspaces">
              {(
                [
                  ["all", "All"],
                  ["live", "Active"],
                  ["expired", "Expired"],
                ] as const
              ).map(([id, label]) => (
                <label key={id} className="ds-seg-opt">
                  <input type="radio" name="workspace-filter" checked={filter === id} onChange={() => setFilter(id)} />
                  {label} {counts[id]}
                </label>
              ))}
            </div>
            <span className="ws-summary">{summary}</span>
          </div>

          <div className="ws-table-wrap">
            <table className="ds-table ws-index-table">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Key</th>
                  <th style={{ textAlign: "right" }}>Endpoints</th>
                  <th>Created · lifetime</th>
                  <th>
                    <span className="ds-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((w) => {
                  const life = lifetime(w);
                  const href = `/w/${w.key}`;
                  return (
                    <tr key={w.id} className={w.key === freshKey ? "ws-index-new" : undefined}>
                      <td>
                        <Link href={href} className="ws-index-name">
                          {w.name}
                        </Link>
                        <div className="ws-index-base">
                          {host}/m/{w.key}
                        </div>
                      </td>
                      <td>
                        <div className="ws-index-key">
                          <code>{w.key}</code>
                          <CopyButton value={w.key} label={`Copy key ${w.key}`} variant="ghost" iconOnly />
                        </div>
                      </td>
                      <td className="ws-index-count">
                        {w.endpoints}
                        {/* The column heading says what the number is; a stacked card has no heading. */}
                        <span className="ws-index-unit"> {w.endpoints === 1 ? "endpoint" : "endpoints"}</span>
                      </td>
                      <td>
                        <div className="ws-index-life">
                          <span className="ds-num" style={{ whiteSpace: "nowrap" }}>
                            {fmtDate(w.createdAt)}
                          </span>
                          <span
                            className={`ds-tag ${life === "kept" ? "ds-tag-neutral" : life === "live" ? "ds-tag-accent" : "ds-tag-accent-2"}`}
                          >
                            {life === "kept" ? "Kept" : life === "live" ? "24-hour demo" : "Expired"}
                          </span>
                          <span className="ds-muted">
                            {life === "kept"
                              ? "Until you delete it"
                              : life === "live"
                                ? `Expires in ${rel(new Date(w.expiresAt!).getTime() - now)}`
                                : `Ended ${fmtDate(w.expiresAt!)}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Link href={href} className="ds-btn ds-btn-ghost" style={{ fontSize: 15 }}>
                          Open <ArrowRightIcon size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && (
              <p className="ds-muted" style={{ marginTop: "var(--space-6)" }}>
                {filter === "expired"
                  ? "Nothing has expired."
                  : "No active workspaces. Demo workspaces last 24 hours; create a workspace here to keep one."}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="ws-empty-split" style={{ marginTop: "calc(var(--space-8) * 2)" }}>
          <div className="ws-empty">
            <h2>No workspaces yet.</h2>
            <p>
              Create one and give it a name. You&apos;ll get a base URL straight away, then add endpoints by describing
              them in a sentence.
            </p>
            <div className="ws-empty-actions">
              {newButton}
              <Link href="/#try" className="ds-btn ds-btn-ghost ds-btn-bare" style={{ fontSize: 16 }}>
                Or try a demo endpoint first <ArrowRightIcon size={18} />
              </Link>
            </div>
          </div>

          {/* What a workspace is for, in the order it gets used. */}
          <div className="ws-steps">
            <span className="ds-kicker">How it works</span>
            <ol>
              {STEPS.map(([title, text], i) => (
                <li key={title}>
                  <span className="ws-step-num">{i + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text.replace("{host}", host)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {open && (
        <NewWorkspaceDialog
          origin={origin}
          busy={busy}
          error={error}
          onSubmit={create}
          onCancel={() => {
            setOpen(false);
            setError(null);
          }}
        />
      )}
    </>
  );
}
