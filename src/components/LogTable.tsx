"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { relativeTime, statusClass } from "./status";

interface LogRow {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  matched: boolean;
  note: string | null;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  createdAt: string;
}

const POLL_MS = 5000;

export function LogTable({ workspaceId }: { workspaceId: string }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(true);
  const fresh = useRef<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/logs`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { logs: LogRow[] };
    const arriving = new Set<string>();
    for (const row of data.logs) {
      if (!seen.current.has(row.id)) arriving.add(row.id);
      seen.current.add(row.id);
    }
    // Don't flash on first load — every row would be "new".
    fresh.current = first.current ? new Set() : arriving;
    first.current = false;
    setRows(data.logs);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!auto) return;
    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [auto, load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
        <h2>Requests</h2>
        <span className="small muted">most recent 500</span>
        <span style={{ flex: 1 }} />
        <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Refresh every 5s
        </label>
        <button
          className="btn btn-sm btn-danger"
          onClick={async () => {
            if (!window.confirm("Clear the request log?")) return;
            await fetch(`/api/workspaces/${workspaceId}/logs`, { method: "DELETE" });
            seen.current.clear();
            setRows([]);
          }}
        >
          Clear log
        </button>
      </div>

      <div className="panel table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Method</th>
              <th>Path</th>
              <th style={{ width: 60 }}>Status</th>
              <th style={{ width: 80 }}>Time</th>
              <th style={{ width: 90 }}>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ padding: "26px 12px" }}>
                  {loading
                    ? "Loading…"
                    : "Nothing here yet. Call one of your mock URLs and the request shows up within five seconds."}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const open = expanded === row.id;
              const flash = fresh.current.has(row.id);
              return (
                <Fragment key={row.id}>
                  <tr
                    className={flash ? (row.statusCode >= 500 ? "flash-server" : "flash") : undefined}
                    onClick={() => setExpanded(open ? null : row.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="method">{row.method}</td>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>
                      {row.path}
                      {row.note && (
                        <span className="small muted" style={{ marginLeft: 8 }}>
                          {row.note}
                        </span>
                      )}
                    </td>
                    <td className={`mono ${statusClass(row.statusCode)}`}>{row.statusCode}</td>
                    <td className="mono muted">{(row.durationMs / 1000).toFixed(2)}s</td>
                    <td className="muted">{relativeTime(row.createdAt)}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={5} style={{ background: "var(--tint)" }}>
                        <pre className="code" style={{ whiteSpace: "pre-wrap" }}>
                          {detail(row)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function detail(row: LogRow): string {
  const parts = [
    `${row.method} ${row.path}`,
    "",
    Object.entries(row.headers)
      .slice(0, 12)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
  ];
  if (row.body) parts.push("", JSON.stringify(row.body, null, 2));
  parts.push("", `→ ${row.statusCode} · ${row.durationMs}ms`);
  if (!row.matched) {
    parts.push(
      row.note?.startsWith("did you mean")
        ? `No endpoint matched. ${row.note.replace(/^did you mean/, "Did you mean")}`
        : "No endpoint matched. The 404 body lists every path this workspace serves."
    );
  }
  if (row.note === "injected failure") {
    parts.push("Failure injection fired — this endpoint is configured to fail a share of requests.");
  }
  return parts.filter((p) => p !== undefined).join("\n");
}
