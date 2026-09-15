"use client";

import Link from "next/link";
import { useState } from "react";
import { BreakableUrl } from "./BreakableUrl";
import { CopyButton } from "./CopyButton";

const PRESETS = [
  { tag: "orders", phrase: "Twelve orders, one refunded, with customer names" },
  { tag: "user", phrase: "A user profile with plan and last login" },
  { tag: "catalog", phrase: "Three products, prices in EUR, one out of stock" },
];

interface CreateResult {
  key: string;
  workspaceId: string;
  path: string;
  sample: unknown;
  source: "model" | "fallback";
}

interface ProbeResult {
  status: number;
  ms: number;
  body: unknown;
}

function statusClass(status: number): string {
  if (status >= 500 || status === 0) return "status-server";
  if (status >= 400) return "status-client";
  return "status-ok";
}

export function LandingDemo({ origin }: { origin: string }) {
  const [description, setDescription] = useState(PRESETS[0].phrase);
  const [delay, setDelay] = useState(false);
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);

  const url = result ? `${origin}/m/${result.key}${result.path}` : `${origin}/m/a8f3k2/orders`;
  const curl = result ? `curl -s ${origin}/m/${result.key}${result.path}` : null;

  const runProbe = async (target: string) => {
    setProbing(true);
    const started = performance.now();
    try {
      const res = await fetch(target, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      setProbe({ status: res.status, ms: Math.round(performance.now() - started), body });
    } catch {
      setProbe({ status: 0, ms: Math.round(performance.now() - started), body: { error: "Request failed" } });
    } finally {
      setProbing(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    setProbe(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description,
          delayMs: delay ? 2000 : 0,
          failureRate: fail ? 20 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the endpoint");
      setResult(data as CreateResult);
      await runProbe(`${origin}/m/${data.key}${data.path}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the endpoint");
    } finally {
      setBusy(false);
    }
  };

  const status = probing
    ? "running…"
    : result && probe
      ? `${probe.status || "error"} · ${probe.ms}ms`
      : "idle";
  const statusColor = probing
    ? "var(--ink-35)"
    : result && probe
      ? undefined
      : "var(--ink-35)";
  const body = probing
    ? "Calling…"
    : JSON.stringify(
        (result ? probe?.body ?? result.sample : undefined) ?? [
          { id: "ord_92kd", customer: "Rohan Mehta", total: 4820, status: "shipped" },
          "…",
        ],
        null,
        2
      );

  return (
    <section style={{ marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span
          className="small"
          style={{ fontFamily: "var(--mono)", letterSpacing: "0.06em", color: "var(--ink-45)" }}
        >
          PROMPT → RESPONSE
        </span>
        <span style={{ flex: 1, minWidth: 0 }} />
        {/* One flex item, not three — so on a narrow screen the whole group
            wraps to its own line together instead of splitting mid-group
            (e.g. two chips staying up next to the label, one stranded alone
            below). */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PRESETS.map((p) => {
            const active = description === p.phrase;
            return (
              <button
                key={p.tag}
                type="button"
                onClick={() => setDescription(p.phrase)}
                className="btn btn-sm"
                style={{
                  borderRadius: 999,
                  fontFamily: "var(--mono)",
                  borderColor: active ? "var(--accent)" : "var(--rule)",
                  color: active ? "var(--accent)" : "var(--ink-45)",
                  background: active ? "rgba(var(--accent-rgb), 0.08)" : "transparent",
                }}
              >
                {p.tag}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ flex: "1 1 320px" }}
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) create();
          }}
          aria-label="Describe the endpoint"
        />
        <button className="btn btn-primary" onClick={create} disabled={busy || !description.trim()}>
          {busy ? "Creating…" : result ? "Regenerate" : "Create endpoint"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span className="small muted">Inject:</span>
        <button
          type="button"
          onClick={() => setDelay((d) => !d)}
          className="btn btn-sm"
          style={{
            borderRadius: 999,
            borderColor: delay ? "var(--accent)" : "var(--rule)",
            color: delay ? "var(--accent)" : "var(--ink-55)",
          }}
          aria-pressed={delay}
        >
          +2s delay
        </button>
        <button
          type="button"
          onClick={() => setFail((f) => !f)}
          className="btn btn-sm"
          style={{
            borderRadius: 999,
            borderColor: fail ? "var(--accent)" : "var(--rule)",
            color: fail ? "var(--accent)" : "var(--ink-55)",
          }}
          aria-pressed={fail}
        >
          fail 20%
        </button>
        <span style={{ flex: 1 }} />
        <span className="small" style={{ color: "var(--ink-35)" }}>
          {result ? "Applies on the next call you create" : "Set before you create it"}
        </span>
      </div>

      {error && (
        <p className="small" style={{ color: "var(--server-err)", marginTop: 10 }}>
          {error}
        </p>
      )}

      <div className="panel" style={{ marginTop: 16, borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "10px 12px",
            borderBottom: "1px solid var(--rule)",
            flexWrap: "wrap",
          }}
        >
          <code className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ok)", flex: "none" }}>
            GET
          </code>
          <code
            className="mono"
            style={{ fontSize: 12.5, color: "var(--ink-70)", flex: "1 1 220px", minWidth: 0, overflowWrap: "anywhere" }}
          >
            <BreakableUrl value={url} />
          </code>
          <span
            className={`mono small ${result && probe && !probing ? statusClass(probe.status) : ""}`}
            style={{ flex: "none", color: statusColor }}
          >
            {status}
          </span>
        </div>
        <pre className="code" style={{ margin: 0, borderRadius: 0 }}>
          {body}
        </pre>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "8px 12px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          {result && curl ? (
            <>
              <span className="small muted">Live now, for 24 hours.</span>
              <span style={{ flex: 1, minWidth: 0 }} />
              <CopyButton value={curl} label="Copy curl" />
              {!probing && (
                <button type="button" className="btn btn-sm" onClick={() => runProbe(url)} disabled={probing}>
                  Call it again
                </button>
              )}
              <Link className="btn btn-sm" href={`/w/${result.key}`}>
                Open workspace
              </Link>
            </>
          ) : (
            <span className="small" style={{ color: "var(--ink-35)" }}>
              Pick a prompt above and create it — this is a real endpoint, not a preview.
            </span>
          )}
        </div>
        {result?.source === "fallback" && (
          <p className="small muted" style={{ padding: "0 12px 10px" }}>
            Generated from a template — no model key is configured. Open the workspace to edit the body.
          </p>
        )}
      </div>
    </section>
  );
}
