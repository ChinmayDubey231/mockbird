"use client";

import { useEffect, useState } from "react";
import type { EndpointDTO } from "./Dashboard";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function CreateEndpoint({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (endpoint: EndpointDTO) => void;
}) {
  const [tab, setTab] = useState<"describe" | "write">("describe");
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/orders");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("{\n  \n}");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, method, path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setBody(JSON.stringify(data.sample, null, 2));
      setNote(data.note ?? null);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const parsed = JSON.parse(body);
      const res = await fetch(`/api/workspaces/${workspaceId}/endpoints`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method,
          path,
          description: description || null,
          responseBody: parsed,
          statusCode: method === "POST" ? 201 : 200,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the endpoint");
      onCreated({
        id: data.id,
        method: data.method,
        path: data.path,
        description: data.description,
        responseBody: JSON.stringify(data.responseBody, null, 2),
        statusCode: data.statusCode,
        delayMs: data.delayMs,
        failureRate: data.failureRate,
        failureStatus: data.failureStatus,
        isActive: data.isActive,
        hitCount: data.hitCount,
        specificity: data.specificity,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the endpoint");
    } finally {
      setSaving(false);
    }
  };

  const bodyValid = (() => {
    try {
      JSON.parse(body);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 40, background: "var(--scrim)", display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Create endpoint"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--rule)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: "none",
            padding: "13px 20px",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <h2>New endpoint</h2>
          <span style={{ flex: 1, minWidth: 0 }} />
          <button className="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                className="select"
                style={{ width: 110, flex: "none" }}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input
                className="input mono"
                style={{ flex: "1 1 auto", minWidth: 0 }}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/orders/:id"
                aria-label="Path"
              />
            </div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Use <code className="mono">:name</code> for a path parameter and a trailing{" "}
              <code className="mono">*</code> to match any depth below.
            </p>
          </div>

          <div>
            <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--rule)" }}>
              <TabButton on={tab === "describe"} onClick={() => setTab("describe")}>
                Describe it
              </TabButton>
              <TabButton on={tab === "write"} onClick={() => setTab("write")}>
                Write it
              </TabButton>
            </div>

            {tab === "describe" ? (
              <div style={{ marginTop: 14 }}>
                <textarea
                  className="textarea"
                  rows={3}
                  maxLength={500}
                  placeholder="a single order with id, customer name, total in rupees, status, and an array of line items"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ fontFamily: "var(--sans)" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <span className="small muted" style={{ flex: "none" }}>
                    {description.length}/500
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }} />
                  <button className="btn" onClick={generate} disabled={generating || !description.trim()}>
                    {generating ? "Generating…" : generated ? "Regenerate" : "Generate"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="small muted" style={{ marginTop: 14 }}>
                Write the JSON below. Nothing is generated and no model runs.
              </p>
            )}
          </div>

          <div>
            <span className="small muted" style={{ display: "block", marginBottom: 6 }}>
              {tab === "describe" && generated ? "Preview — edit anything before saving" : "Response body"}
            </span>
            <textarea
              className="textarea"
              rows={12}
              spellCheck={false}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {!bodyValid && (
              <p className="small" style={{ color: "var(--client-err)", marginTop: 6 }}>
                This isn&apos;t valid JSON yet.
              </p>
            )}
            {note && (
              <p className="small muted" style={{ marginTop: 6 }}>
                {note}
              </p>
            )}
          </div>

          {error && (
            <p className="small" style={{ color: "var(--server-err)", margin: 0 }}>
              {error}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: "none",
            padding: "13px 20px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <code className="mono small muted" style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {path.trim() ? `${method} ${path.trim()}` : ""}
          </code>
          <button className="btn" style={{ flex: "none" }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: "none" }}
            onClick={create}
            disabled={saving || !bodyValid || !path.trim()}
          >
            {saving ? "Creating…" : "Create endpoint"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: "none",
        background: "transparent",
        border: 0,
        borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
        color: on ? "var(--ink)" : "var(--ink-55)",
        padding: "7px 10px",
        marginBottom: -1,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
