"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compilePath, InvalidPathError } from "@/lib/path";
import type { EndpointDTO } from "./Dashboard";
import { SparkleIcon, XIcon } from "./icons";
import { jsonError } from "./status";
import { useExitTransition } from "./useExitTransition";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** What the drawer opens with, when it's opened from an example. */
export interface EndpointDraft {
  method?: string;
  path?: string;
  description?: string;
}
const PATH_HELP = "Use :name for a path param and a trailing * to match any depth.";

/**
 * The new-endpoint drawer. It slides in from the right and back out before
 * it unmounts, both when it's dismissed and once an endpoint is created; by
 * then the new endpoint is already selected behind it.
 */
export function CreateEndpoint({
  workspaceId,
  workspaceKey,
  origin,
  initial = {},
  onClose,
  onCreated,
}: {
  workspaceId: string;
  workspaceKey: string;
  origin: string;
  initial?: EndpointDraft;
  onClose: () => void;
  onCreated: (endpoint: EndpointDTO) => void;
}) {
  const [mode, setMode] = useState<"describe" | "write">("describe");
  const [method, setMethod] = useState(initial.method ?? "GET");
  const [path, setPath] = useState(initial.path ?? "/orders/:id");
  const [description, setDescription] = useState(initial.description ?? "");
  const [body, setBody] = useState("{\n  \n}");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(0);
  const { exiting, exit } = useExitTransition(onClose, 220);
  const pathRef = useRef<HTMLInputElement>(null);
  const generateRef = useRef<HTMLButtonElement>(null);

  // Opened from an example, everything is filled in and Generate is the
  // next step; otherwise the path comes first.
  useEffect(() => {
    (initial.description ? generateRef.current : pathRef.current)?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit]);

  // The route as the server will store it, or why it won't.
  const route = useMemo(() => {
    const raw = path.trim();
    if (!raw.replace(/\//g, "")) return null;
    try {
      return { ok: true as const, ...compilePath(raw.startsWith("/") ? raw : `/${raw}`) };
    } catch (err) {
      return { ok: false as const, message: err instanceof InvalidPathError ? err.message : "That path isn't valid" };
    }
  }, [path]);
  const bodyValid = jsonError(body) === null;

  const generate = async () => {
    if (!description.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, method, path: route?.ok ? route.path : path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setBody(JSON.stringify(data.sample, null, 2));
      setNote(data.note ?? null);
      setGenerated((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const create = async () => {
    if (!route?.ok || !bodyValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/endpoints`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method,
          path: route.path,
          description: mode === "describe" && description.trim() ? description.trim() : null,
          responseBody: JSON.parse(body),
          statusCode: method === "POST" ? 201 : 200,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the endpoint");
      onCreated({
        id: data.id,
        method: data.method,
        path: data.path,
        responseBody: JSON.stringify(data.responseBody, null, 2),
        statusCode: data.statusCode,
        delayMs: data.delayMs,
        failureRate: data.failureRate,
        failureStatus: data.failureStatus,
        isActive: data.isActive,
        specificity: data.specificity,
      });
      exit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the endpoint");
      setSaving(false);
    }
  };

  const host = origin.replace(/^https?:\/\//, "");

  return (
    <div
      className="ws-scrim"
      data-exiting={exiting}
      onClick={(e) => {
        if (e.target === e.currentTarget) exit();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="new-endpoint-title" className="ws-drawer">
        <div className="ws-drawer-head">
          <h2 id="new-endpoint-title">New endpoint</h2>
          <button type="button" className="ds-btn ds-btn-ghost ds-btn-icon" onClick={exit} aria-label="Close">
            <XIcon size={20} />
          </button>
        </div>

        <div className="ws-drawer-body">
          <div className="ws-stack">
            <div className="ws-route-input">
              <select
                className="ds-input"
                aria-label="Method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ minHeight: 46 }}
              >
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input
                ref={pathRef}
                className="ds-input ds-input-mono"
                aria-label="Path"
                aria-invalid={route?.ok === false}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/orders/:id"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            {route?.ok === false ? (
              <span className="ws-alert" style={{ fontSize: 14 }}>
                {route.message}.
              </span>
            ) : (
              <span className="ws-note">{route ? `Specificity ${route.specificity}. ${PATH_HELP}` : PATH_HELP}</span>
            )}
          </div>

          <div className="ws-stack-lg">
            <div className="ds-seg" role="radiogroup" aria-label="How to create the body" style={{ alignSelf: "flex-start" }}>
              {(
                [
                  ["describe", "Describe it"],
                  ["write", "Write it"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="ds-seg-opt">
                  <input type="radio" name="new-endpoint-mode" checked={mode === value} onChange={() => setMode(value)} />
                  {label}
                </label>
              ))}
            </div>

            {/* Keyed, so switching modes fades the new one in. */}
            <div key={mode} className="ws-swap ws-stack-lg">
              {mode === "describe" ? (
                <>
                  <textarea
                    className="ds-input"
                    rows={3}
                    maxLength={500}
                    aria-label="Describe the response"
                    placeholder="A single order with id, customer name, total in rupees, status and line items"
                    value={description}
                    style={{ fontSize: 17 }}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                    }}
                  />
                  <div className="ws-gen-row">
                    <span>{description.length} / 500</span>
                    <button
                      ref={generateRef}
                      type="button"
                      className="ds-btn ds-btn-secondary"
                      onClick={generate}
                      disabled={generating || !description.trim()}
                    >
                      <SparkleIcon size={17} />
                      {generating ? "Generating…" : generated ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                </>
              ) : (
                <span className="ds-muted" style={{ fontSize: 15 }}>
                  Write the JSON below. Nothing is generated and no model runs.
                </span>
              )}
            </div>
          </div>

          <div className="ws-stack">
            <label className="ds-kicker" htmlFor="new-endpoint-body">
              {mode === "describe" && generated ? "Preview · edit anything before saving" : "Response body"}
            </label>
            {/* Keyed on each generation, so a fresh sample lands with a highlight. */}
            <textarea
              key={generated}
              id="new-endpoint-body"
              className={generated ? "ws-editor ws-editor-sm ws-flash" : "ws-editor ws-editor-sm"}
              rows={12}
              spellCheck={false}
              value={body}
              aria-invalid={!bodyValid}
              aria-busy={generating}
              style={generating ? { opacity: 0.55 } : undefined}
              onChange={(e) => setBody(e.target.value)}
            />
            {!bodyValid && <span className="ws-alert" style={{ fontSize: 14 }}>This isn&apos;t valid JSON yet.</span>}
            {note && <span className="ws-note">{note}</span>}
          </div>

          {error && (
            <p className="ws-alert ws-enter" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="ws-drawer-foot">
          <code title={route?.ok ? `${method} ${origin}/m/${workspaceKey}${route.path}` : undefined}>
            {route?.ok ? `${method} ${host}/m/${workspaceKey}${route.path}` : ""}
          </code>
          <button type="button" className="ds-btn ds-btn-secondary" onClick={exit}>
            Cancel
          </button>
          <button
            type="button"
            className="ds-btn ds-btn-primary"
            onClick={create}
            disabled={saving || !bodyValid || !route?.ok}
          >
            {saving ? "Creating…" : "Create endpoint"}
          </button>
        </div>
      </div>
    </div>
  );
}
