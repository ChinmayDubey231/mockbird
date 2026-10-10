"use client";

import { useEffect, useState } from "react";
import { compilePath, splitRequestPath, type Segment } from "@/lib/path";
import { matchSegments } from "@/lib/match";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The last twenty calls to an endpoint failing at 20%: two in every ten, so
 * the legend's "4 × 503" stays true while new calls land on the right.
 */
export function FailureStrip() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (reducedMotion()) return;
    const id = window.setInterval(() => setOffset((n) => n + 1), 780);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="bs-fail-grid" role="img" aria-label="Twenty recent calls, four of which failed">
      {Array.from({ length: 20 }, (_, i) => {
        const n = (offset + i) % 10;
        return <span key={i} data-bad={n === 2 || n === 6} />;
      })}
    </div>
  );
}

/*
 * Runs the router's own specificity and matching code from src/lib against a
 * few sample requests, so the figure shows what the mock route really does
 * rather than a scripted animation.
 */

const PATTERNS = ["/orders/new", "/orders", "/orders/:id", "/orders/*"];
const PROBES = ["/orders/ord_92kd", "/orders/new", "/orders", "/orders/2026/q1"];
const HOLD_TICKS = 6;
const TICK_MS = 260;

interface Candidate {
  pattern: string;
  segments: Segment[];
  specificity: number;
}

const CANDIDATES: Candidate[] = PATTERNS.map((p) => {
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

export function RouteMatcherFigure() {
  const [state, setState] = useState<MatcherState>({ probeIndex: 0, scanIndex: 0, hitIndex: null, hold: 0 });

  useEffect(() => {
    if (reducedMotion()) {
      // Hold still on the most telling case: the wildcard catching what
      // nothing more specific could.
      let settled: MatcherState = { probeIndex: 3, scanIndex: 0, hitIndex: null, hold: 0 };
      for (let i = 0; i < CANDIDATES.length; i++) settled = tick(settled);
      setState(settled);
      return;
    }
    const id = window.setInterval(() => setState(tick), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const probe = PROBES[state.probeIndex];
  let note: string;
  if (state.hitIndex === -1) {
    note = "Nothing matched. The 404 lists every path the workspace serves.";
  } else if (state.hitIndex !== null) {
    const winner = CANDIDATES[state.hitIndex];
    const hit = matchSegments(winner.segments, splitRequestPath(probe));
    const detail = hit?.wildcard
      ? `the wildcard captured “${hit.wildcard}”`
      : hit && Object.keys(hit.params).length > 0
        ? Object.entries(hit.params)
            .map(([k, v]) => `${k} = ${v}`)
            .join(", ")
        : null;
    note = `Served by ${winner.pattern}${detail ? `; ${detail}` : ""}.`;
  } else {
    note = "Checking patterns by specificity score, highest first.";
  }

  return (
    <figure className="bs-figure">
      <div className="bs-probe">
        <span className="bs-method" data-method="GET">
          GET
        </span>
        <code className="bs-mono" style={{ fontSize: 15, overflowWrap: "anywhere" }}>
          {probe}
        </code>
      </div>
      {CANDIDATES.map((c, i) => {
        const won = state.hitIndex === i;
        const scanning = state.hitIndex === null && i === state.scanIndex;
        const passed = state.hitIndex === null ? i < state.scanIndex : state.hitIndex !== -1 && i < state.hitIndex;
        return (
          <div
            key={c.pattern}
            className="bs-route"
            data-state={won ? "won" : scanning ? "scanning" : passed ? "passed" : undefined}
          >
            <span className="bs-route-spec">{c.specificity}</span>
            <code className="bs-route-pattern">{c.pattern}</code>
            <span className="bs-route-tag">{won ? "match" : scanning ? "checking" : ""}</span>
          </div>
        );
      })}
      <figcaption className="bs-caption" style={{ minHeight: "2.9em" }}>
        {note}
      </figcaption>
    </figure>
  );
}
