"use client";

import { useEffect, useState } from "react";
import { compilePath, splitRequestPath, type Segment } from "@/lib/path";
import { matchSegments } from "@/lib/match";

/**
 * Runs the actual specificity/matching code from src/lib against a few sample
 * requests, so this panel demonstrates real router behaviour rather than a
 * scripted animation.
 */

const RAW_PATTERNS = ["/orders/new", "/orders", "/orders/:id", "/orders/*"];
const PROBES = ["/orders/ord_92kd", "/orders/new", "/orders", "/orders/2026/q1"];
const HOLD_TICKS = 6;
const TICK_MS = 260;

interface Candidate {
  pattern: string;
  segments: Segment[];
  specificity: number;
}

const CANDIDATES: Candidate[] = RAW_PATTERNS.map((p) => {
  const compiled = compilePath(p);
  return { pattern: p, segments: compiled.segments, specificity: compiled.specificity };
}).sort((a, b) => b.specificity - a.specificity);

interface MatcherState {
  probeIndex: number;
  scanIndex: number;
  hitIndex: number | null; // null = still scanning, -1 = scanned all with no match
  hold: number;
}

function tick(s: MatcherState): MatcherState {
  if (s.hitIndex !== null) {
    if (s.hold + 1 >= HOLD_TICKS) {
      return { probeIndex: (s.probeIndex + 1) % PROBES.length, scanIndex: 0, hitIndex: null, hold: 0 };
    }
    return { ...s, hold: s.hold + 1 };
  }
  const parts = splitRequestPath(PROBES[s.probeIndex]);
  const hit = matchSegments(CANDIDATES[s.scanIndex].segments, parts);
  if (hit) return { ...s, hitIndex: s.scanIndex, hold: 0 };
  if (s.scanIndex < CANDIDATES.length - 1) return { ...s, scanIndex: s.scanIndex + 1 };
  return { ...s, hitIndex: -1, hold: 0 };
}

const INITIAL: MatcherState = { probeIndex: 0, scanIndex: 0, hitIndex: null, hold: 0 };

export function RouteMatcher({ compact = false }: { compact?: boolean } = {}) {
  const [state, setState] = useState<MatcherState>(INITIAL);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let settled = INITIAL;
      for (let i = 0; i < CANDIDATES.length; i++) settled = tick(settled);
      setState(settled);
      return;
    }
    const id = setInterval(() => setState((s) => tick(s)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const probePath = PROBES[state.probeIndex];
  const parts = splitRequestPath(probePath);

  let note: string;
  if (state.hitIndex === -1) {
    note = "Nothing matched — the mock returns a 404 listing every path this workspace serves.";
  } else if (state.hitIndex !== null) {
    const cand = CANDIDATES[state.hitIndex];
    const hit = matchSegments(cand.segments, parts);
    const detail = hit?.wildcard
      ? `wildcard captured "${hit.wildcard}"`
      : hit && Object.keys(hit.params).length > 0
        ? Object.entries(hit.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")
        : null;
    note = `Served by ${cand.pattern}${detail ? ` — ${detail}` : ""}.`;
  } else {
    note = "Scanning by specificity, highest first.";
  }

  return (
    <div
      className={compact ? undefined : "panel"}
      style={{ borderRadius: compact ? 0 : 4, minWidth: 0 }}
    >
      {!compact && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "10px 12px",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <span className="small" style={{ letterSpacing: "0.04em", color: "var(--ink-45)" }}>
            MATCHING
          </span>
          <span style={{ flex: 1 }} />
          <span
            className="small"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-55)" }}
          >
            <span className="badge-dot" />
            live
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: compact ? "0 0 8px" : "11px 12px",
          borderBottom: compact ? "none" : "1px solid var(--rule)",
        }}
      >
        <code className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-55)", flex: "none" }}>
          GET
        </code>
        <code className="mono" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
          {probePath}
        </code>
      </div>

      {CANDIDATES.map((c, i) => {
        const won = state.hitIndex === i;
        const scanning = state.hitIndex === null && i === state.scanIndex;
        const passed = state.hitIndex === null ? i < state.scanIndex : state.hitIndex !== -1 && i < state.hitIndex;
        return (
          <div
            key={c.pattern}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: compact ? "5px 0" : "9px 12px",
              borderBottom: compact ? "none" : "1px solid var(--rule-soft)",
              background: won ? "rgba(var(--accent-rgb), 0.1)" : scanning ? "var(--tint)" : "transparent",
              transition: "background-color 0.22s ease",
            }}
          >
            <code className="mono" style={{ fontSize: 11, color: "var(--ink-35)", flex: "none", width: 24 }}>
              {c.specificity}
            </code>
            <code
              className="mono"
              style={{
                flex: 1,
                minWidth: 0,
                overflowWrap: "anywhere",
                color: won ? "var(--ink)" : passed ? "var(--ink-35)" : "var(--ink-55)",
              }}
            >
              {c.pattern}
            </code>
            <span
              className="mono"
              style={{ fontSize: 11, flex: "none", color: won ? "var(--accent)" : scanning ? "var(--ink-45)" : "var(--ink-35)" }}
            >
              {won ? "match" : scanning ? "scan…" : ""}
            </span>
          </div>
        );
      })}

      <div style={{ padding: compact ? "6px 0 0" : "9px 12px", fontSize: 12, color: "var(--ink-45)" }}>
        {note}
      </div>
    </div>
  );
}
