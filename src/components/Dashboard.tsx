"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BreakableUrl } from "./BreakableUrl";
import { CopyButton } from "./CopyButton";
import { CreateEndpoint } from "./CreateEndpoint";
import { statusColor } from "./status";

export interface EndpointDTO {
  id: string;
  method: string;
  path: string;
  description: string | null;
  responseBody: string;
  statusCode: number;
  delayMs: number;
  failureRate: number;
  failureStatus: number;
  isActive: boolean;
  hitCount: number;
  specificity: number;
}

const STATUS_OPTIONS = [200, 201, 202, 204, 301, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503];

export function Dashboard({
  workspaceId,
  workspaceKey,
  origin,
  initialEndpoints,
  requestsToday,
}: {
  workspaceId: string;
  workspaceKey: string;
  origin: string;
  initialEndpoints: EndpointDTO[];
  requestsToday: number;
}) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [selectedId, setSelectedId] = useState<string | null>(initialEndpoints[0]?.id ?? null);
  const [creating, setCreating] = useState(false);

  const selected = endpoints.find((e) => e.id === selectedId) ?? null;

  const update = (id: string, patch: Partial<EndpointDTO>) =>
    setEndpoints((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  // Matches the server's ORDER BY path asc, method asc — so a newly created
  // endpoint lands in the same slot a page reload would put it in, instead of
  // always trailing at the end of the list.
  const insertSorted = (list: EndpointDTO[], endpoint: EndpointDTO) =>
    [...list, endpoint].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      <aside className="endpoint-sidebar">
        <button
          className="btn btn-primary"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onClick={() => setCreating(true)}
        >
          <span className="mono" aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, flex: "none" }}>
            +
          </span>
          New endpoint
        </button>

        <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0 }}>
          {endpoints.map((e) => {
            const on = e.id === selectedId;
            return (
              <li key={e.id}>
                <button
                  onClick={() => setSelectedId(e.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    background: on ? "var(--accent-tint)" : "transparent",
                    border: 0,
                    borderLeft: `2px solid ${on ? "var(--accent)" : "transparent"}`,
                    padding: "6px 8px",
                    cursor: "pointer",
                    opacity: e.isActive ? 1 : 0.5,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      flex: "none",
                      background: e.isActive ? statusColor(e.statusCode) : "var(--ink-35)",
                    }}
                  />
                  <span className="method" style={{ width: 50, flex: "none" }}>
                    {e.method}
                  </span>
                  <span
                    className="mono"
                    style={{
                      flex: "1 1 auto",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.path}
                  </span>
                  <span className="mono small muted" style={{ flex: "none" }}>
                    {e.specificity}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div style={{ borderTop: "1px solid var(--rule)", marginTop: 16, paddingTop: 12 }}>
          <p className="small muted" style={{ margin: 0 }}>
            {requestsToday.toLocaleString()} request{requestsToday === 1 ? "" : "s"} in the last 24 hours
          </p>
          <Link className="small" href={`/w/${workspaceKey}/logs`} style={{ display: "inline-block", marginTop: 6 }}>
            View log
          </Link>
        </div>
      </aside>

      <section style={{ flex: "1 1 420px", minWidth: 300 }}>
        {selected ? (
          <Detail
            key={selected.id}
            endpoint={selected}
            origin={origin}
            workspaceKey={workspaceKey}
            onChange={(patch) => update(selected.id, patch)}
            onDelete={() => {
              setEndpoints((list) => list.filter((e) => e.id !== selected.id));
              setSelectedId((id) => (id === selected.id ? null : id));
            }}
          />
        ) : (
          <Empty onCreate={() => setCreating(true)} />
        )}
      </section>

      {creating && (
        <CreateEndpoint
          workspaceId={workspaceId}
          onClose={() => setCreating(false)}
          onCreated={(endpoint) => {
            setEndpoints((list) => insertSorted(list, endpoint));
            setSelectedId(endpoint.id);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="panel" style={{ padding: "40px 24px" }}>
      <p style={{ margin: 0 }}>No endpoints yet. Create one and it&apos;ll be live immediately.</p>
      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onCreate}>
        New endpoint
      </button>
    </div>
  );
}

function Detail({
  endpoint,
  origin,
  workspaceKey,
  onChange,
  onDelete,
}: {
  endpoint: EndpointDTO;
  origin: string;
  workspaceKey: string;
  onChange: (patch: Partial<EndpointDTO>) => void;
  onDelete: () => void;
}) {
  const [body, setBody] = useState(endpoint.responseBody);
  const [save, setSave] = useState<"" | "saving" | "saved" | "error">("");
  const [message, setMessage] = useState<string | null>(null);
  const [test, setTest] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = `${origin}/m/${workspaceKey}${endpoint.path}`;
  const bodyError = useMemo(() => jsonError(body), [body]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const persist = (patch: Record<string, unknown>) => {
    if (timer.current) clearTimeout(timer.current);
    setSave("saving");
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setSave("saved");
        setMessage(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setSave("error");
        setMessage(data.error ?? "Could not save");
      }
    }, 450);
  };

  const setField = <K extends keyof EndpointDTO>(field: K, value: EndpointDTO[K]) => {
    onChange({ [field]: value } as Partial<EndpointDTO>);
    persist({ [field]: value });
  };

  const sendTest = async () => {
    // Leave the previous result in place until the new one is ready, rather
    // than blanking it to a one-line placeholder first — that collapse-then-
    // expand was what made the page jump/flicker when this block sat at the
    // bottom of the viewport.
    setSending(true);
    const started = performance.now();
    try {
      const testUrl = `${origin}/m/${workspaceKey}${endpoint.path.replace(/:(\w+)/g, "test-$1")}`;
      const res = await fetch(testUrl);
      const text = await res.text();
      const ms = Math.round(performance.now() - started);
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON (e.g. a 500 HTML page, or an empty body) — show as-is
      }
      const truncated = body.length > 4000;
      setTest(`${res.status} · ${ms}ms\n\n${body.slice(0, 4000)}${truncated ? "\n…" : ""}`);
    } catch (err) {
      setTest(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 className="mono" style={{ fontSize: 16, overflowWrap: "anywhere" }}>
            {endpoint.method} {endpoint.path}
          </h2>
          <span className="small muted" style={{ flex: "none" }}>
            specificity {endpoint.specificity}
          </span>
          <span style={{ flex: 1, minWidth: 0 }} />
          <span className="small muted" aria-live="polite" style={{ flex: "none" }}>
            {save === "saving" ? "Saving…" : save === "saved" ? "Saved" : ""}
          </span>
          <span className="small" style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            Active
            <button
              type="button"
              role="switch"
              aria-checked={endpoint.isActive}
              aria-label={endpoint.isActive ? "Deactivate endpoint" : "Activate endpoint"}
              title={endpoint.isActive ? "Deactivate endpoint" : "Activate endpoint"}
              onClick={() => setField("isActive", !endpoint.isActive)}
              className={`active-switch${endpoint.isActive ? " is-on" : ""}`}
            >
              <span
                className="active-switch-knob"
                style={{ transform: endpoint.isActive ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </span>
        </div>

        {message && (
          <p className="small" style={{ color: "var(--server-err)", margin: 0 }}>
            {message}
          </p>
        )}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="small muted" style={{ flex: "none" }}>
            URL
          </span>
          <code className="mono" style={{ flex: "1 1 240px", minWidth: 0, overflowWrap: "anywhere" }}>
            <BreakableUrl value={url} />
          </code>
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            <CopyButton value={url} />
            <CopyButton value={`curl -s ${url}`} label="Copy curl" />
          </div>
        </div>
      </div>

      <Field
        label="Response body"
        aside={
          <button
            className="btn btn-sm"
            disabled={Boolean(bodyError)}
            onClick={() => {
              const formatted = JSON.stringify(JSON.parse(body), null, 2);
              setBody(formatted);
              onChange({ responseBody: formatted });
              persist({ responseBody: JSON.parse(formatted) });
            }}
          >
            Format
          </button>
        }
      >
        <textarea
          className="textarea"
          rows={14}
          value={body}
          spellCheck={false}
          onChange={(e) => {
            setBody(e.target.value);
            onChange({ responseBody: e.target.value });
            const err = jsonError(e.target.value);
            if (!err) persist({ responseBody: JSON.parse(e.target.value) });
          }}
        />
        {bodyError ? (
          <p className="small" style={{ color: "var(--client-err)", marginTop: 6 }}>
            {bodyError} — nothing is saved until this parses.
          </p>
        ) : (
          <p className="small muted" style={{ marginTop: 6 }}>
            {"{{id}}"} is replaced with the matched path param. {"{{query.page}}"}, {"{{now}}"} and{" "}
            {"{{index}}"} work too.
          </p>
        )}
      </Field>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div>
          <Label>Status</Label>
          <select
            className="select"
            value={endpoint.statusCode}
            style={{ color: statusColor(endpoint.statusCode) }}
            onChange={(e) => setField("statusCode", Number(e.target.value))}
          >
            {STATUS_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>
            Delay <span className="mono">{(endpoint.delayMs / 1000).toFixed(1)}s</span>
          </Label>
          <input
            className="range"
            type="range"
            min={0}
            max={8000}
            step={100}
            value={endpoint.delayMs}
            onChange={(e) => setField("delayMs", Number(e.target.value))}
          />
          <p className="small muted" style={{ marginTop: 4 }}>
            Capped at 8s by the serverless function timeout.
          </p>
        </div>

        <div>
          <Label>
            Failure{" "}
            <span
              className="mono"
              style={{ color: endpoint.failureRate === 0 ? "var(--ink-55)" : statusColor(endpoint.failureStatus) }}
            >
              {endpoint.failureRate}% → {endpoint.failureStatus}
            </span>
          </Label>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            step={5}
            value={endpoint.failureRate}
            onChange={(e) => setField("failureRate", Number(e.target.value))}
          />
          <select
            className="select"
            style={{ marginTop: 8, color: statusColor(endpoint.failureStatus) }}
            value={endpoint.failureStatus}
            onChange={(e) => setField("failureStatus", Number(e.target.value))}
          >
            {[400, 401, 403, 404, 429, 500, 502, 503].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={sendTest} disabled={sending}>
          {sending ? "Sending…" : "Send test request"}
        </button>
        <span style={{ flex: 1, minWidth: 0 }} />
        <button
          className="btn btn-danger"
          onClick={async () => {
            if (!window.confirm(`Delete ${endpoint.method} ${endpoint.path}?`)) return;
            await fetch(`/api/endpoints/${endpoint.id}`, { method: "DELETE" });
            onDelete();
          }}
        >
          Delete endpoint
        </button>
      </div>

      {test && <pre className="code" style={{ margin: 0 }}>{test}</pre>}
    </div>
  );
}

function Field({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Label>{label}</Label>
        <span style={{ flex: 1, minWidth: 0 }} />
        {aside}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="small muted" style={{ display: "block", marginBottom: 5 }}>
      {children}
    </span>
  );
}

function jsonError(text: string): string | null {
  try {
    JSON.parse(text);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message.replace(/^JSON.parse: /, "") : "Invalid JSON";
  }
}
