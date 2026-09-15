"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * A stacked-bar view of request volume over time, broken down by status
 * class (ok / client error / server error). Reuses the same status colors
 * as the table below it rather than a separate categorical palette — the
 * table is the accessible data source of record; this is the trend.
 */

interface LogRow {
  statusCode: number;
  createdAt: string;
}

interface Bucket {
  ts: number;
  ok: number;
  client: number;
  server: number;
  total: number;
}

const POLL_MS = 15_000;
const MAX_ROWS = 500; // matches the server-side per-workspace log cap
const HEIGHT = 200;
const MARGIN = { top: 10, right: 12, bottom: 22, left: 34 };
const TOOLTIP_WIDTH = 170;

// Candidate bucket widths, smallest first. We pick the smallest one that
// keeps the number of bars within a readable range.
const BUCKET_STEPS = [
  1_000, 5_000, 10_000, 30_000,
  60_000, 5 * 60_000, 10 * 60_000, 30 * 60_000,
  60 * 60_000, 3 * 60 * 60_000, 6 * 60 * 60_000, 12 * 60 * 60_000,
  24 * 60 * 60_000,
];

function pickBucketMs(rangeMs: number, targetBuckets = 28): number {
  for (const step of BUCKET_STEPS) {
    if (rangeMs / step <= targetBuckets) return step;
  }
  return BUCKET_STEPS[BUCKET_STEPS.length - 1];
}

function classOf(status: number): "ok" | "client" | "server" {
  if (status >= 500) return "server";
  if (status >= 400) return "client";
  return "ok";
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * magnitude;
}

function bucketLabel(ts: number, bucketMs: number): string {
  const d = new Date(ts);
  if (bucketMs >= 24 * 60 * 60_000) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (bucketMs >= 60 * 60_000) {
    return d.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function rangeLabel(ts: number, bucketMs: number): string {
  const start = new Date(ts);
  const end = new Date(ts + bucketMs);
  const opts: Intl.DateTimeFormatOptions =
    bucketMs >= 24 * 60 * 60_000
      ? { month: "short", day: "numeric" }
      : { hour: "numeric", minute: "2-digit" };
  return bucketMs >= 24 * 60 * 60_000
    ? start.toLocaleDateString(undefined, opts)
    : `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

function topRoundedPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  if (rr === 0) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`;
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

export function RequestChart({ workspaceId }: { workspaceId: string }) {
  const [rows, setRows] = useState<LogRow[] | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(600);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // A plain useRef + "attach the observer in an effect" pair only fires that
  // effect once, right after this component's very first render — and that
  // first render happens before `rows` has loaded, when this whole component
  // returns null (see below), so the container div doesn't exist yet. The
  // observer would never attach and `width` would stay stuck at its fallback
  // forever. A callback ref instead fires every time the node actually
  // mounts (including the first time it exists, once data has loaded).
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    resizeObserverRef.current = ro;
  }, []);

  const load = useCallback(async () => {
    let all: LogRow[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const url = new URL(`/api/workspaces/${workspaceId}/logs`, window.location.origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) break;
      const data = (await res.json()) as { logs: LogRow[]; nextCursor: string | null };
      all = all.concat(data.logs);
      cursor = data.nextCursor;
      if (!cursor || all.length >= MAX_ROWS) break;
    }
    setRows(all);
  }, [workspaceId]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const { buckets, bucketMs } = useMemo(() => {
    if (!rows || rows.length === 0) return { buckets: [] as Bucket[], bucketMs: 60_000 };
    const times = rows.map((r) => new Date(r.createdAt).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const bucketMs = pickBucketMs(Math.max(max - min, 1000));
    const start = Math.floor(min / bucketMs) * bucketMs;
    const end = Math.floor(max / bucketMs) * bucketMs;
    const count = Math.round((end - start) / bucketMs) + 1;
    const list: Bucket[] = Array.from({ length: count }, (_, i) => ({
      ts: start + i * bucketMs,
      ok: 0,
      client: 0,
      server: 0,
      total: 0,
    }));
    for (const r of rows) {
      const t = new Date(r.createdAt).getTime();
      const bucketStart = Math.floor(t / bucketMs) * bucketMs;
      const idx = Math.round((bucketStart - start) / bucketMs);
      const b = list[idx];
      if (!b) continue;
      b[classOf(r.statusCode)]++;
    }
    for (const b of list) b.total = b.ok + b.client + b.server;
    return { buckets: list, bucketMs };
  }, [rows]);

  if (rows === null) return null;

  if (rows.length === 0) {
    return (
      <div className="panel" style={{ padding: "18px 20px", marginBottom: 18 }}>
        <p className="small muted" style={{ margin: 0 }}>
          No requests charted yet. Call one of your mock URLs and it&apos;ll show up here.
        </p>
      </div>
    );
  }

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const yMax = niceMax(Math.max(...buckets.map((b) => b.total), 1));
  const slot = innerW / buckets.length;
  const barW = Math.min(24, Math.max(2, slot * 0.62));
  const gap = 2; // surface gap between stacked segments

  const scaleY = (v: number) => (v / yMax) * innerH;
  const baseline = MARGIN.top + innerH;

  const hovered = hoverIndex !== null ? buckets[hoverIndex] : null;
  const showEveryLabel = buckets.length <= 8;

  return (
    <div className="panel" style={{ padding: "16px 20px 12px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h3>Requests over time</h3>
        <span className="small muted">{rows.length.toLocaleString()} of the most recent 500</span>
        <span style={{ flex: 1 }} />
        <Legend />
      </div>

      <div ref={containerRef} style={{ position: "relative", marginTop: 8 }}>
        <svg width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label="Requests over time, by status">
          {/* gridlines */}
          {[0, 0.5, 1].map((f) => {
            const y = baseline - innerH * f;
            return (
              <g key={f}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y} y2={y} stroke="var(--rule)" strokeWidth={1} />
                <text x={MARGIN.left - 8} y={y} textAnchor="end" dominantBaseline="middle" className="mono" style={{ fontSize: 10, fill: "var(--ink-45)" }}>
                  {Math.round(yMax * f).toLocaleString()}
                </text>
              </g>
            );
          })}

          {buckets.map((b, i) => {
            const x = MARGIN.left + i * slot + (slot - barW) / 2;
            const okH = scaleY(b.ok);
            const clientH = scaleY(b.client);
            const serverH = scaleY(b.server);

            const segs: { h: number; color: string; top: boolean }[] = [];
            if (b.ok > 0) segs.push({ h: okH, color: "var(--ok)", top: false });
            if (b.client > 0) segs.push({ h: clientH, color: "var(--client-err)", top: false });
            if (b.server > 0) segs.push({ h: serverH, color: "var(--server-err)", top: false });
            if (segs.length > 0) segs[segs.length - 1].top = true;

            let cursorY = baseline;
            const rendered = segs.map((s, si) => {
              const h = Math.max(0, s.h - (si > 0 ? gap : 0));
              const y = cursorY - h;
              cursorY = y - (si < segs.length - 1 ? gap : 0);
              return { ...s, y, h };
            });

            const isHover = hoverIndex === i;
            const label = `${rangeLabel(b.ts, bucketMs)}: ${b.total} request${b.total === 1 ? "" : "s"}, ${b.ok} ok, ${b.client} client error, ${b.server} server error`;

            return (
              <g key={b.ts}>
                {/* hit target covers the whole column so the reader doesn't have to aim at a thin bar */}
                <rect
                  x={MARGIN.left + i * slot}
                  y={MARGIN.top}
                  width={slot}
                  height={innerH}
                  fill={isHover ? "var(--tint)" : "transparent"}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  onPointerEnter={() => setHoverIndex(i)}
                  onPointerLeave={() => setHoverIndex((v) => (v === i ? null : v))}
                  onFocus={() => setHoverIndex(i)}
                  onBlur={() => setHoverIndex((v) => (v === i ? null : v))}
                  style={{ outline: "none", cursor: "default" }}
                />
                {rendered.map((s, si) =>
                  s.top ? (
                    <path key={si} d={topRoundedPath(x, s.y, barW, s.h, 4)} style={{ fill: s.color }} />
                  ) : (
                    <rect key={si} x={x} y={s.y} width={barW} height={s.h} style={{ fill: s.color }} />
                  )
                )}
                {(showEveryLabel || i === 0 || i === buckets.length - 1 || isHover) && (
                  <text
                    x={x + barW / 2}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    className="mono"
                    style={{ fontSize: 10, fill: "var(--ink-45)" }}
                  >
                    {bucketLabel(b.ts, bucketMs)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div
            className="panel small"
            style={{
              position: "absolute",
              pointerEvents: "none",
              // Centered over the hovered column rather than pinned to its
              // left edge, so it visually tracks the bar you're actually on;
              // clamped so it never runs past either edge of the chart.
              left: Math.min(
                Math.max(MARGIN.left + hoverIndex! * slot + slot / 2 - TOOLTIP_WIDTH / 2, 0),
                width - TOOLTIP_WIDTH
              ),
              top: 0,
              padding: "8px 10px",
              width: TOOLTIP_WIDTH,
              boxShadow: "0 2px 10px rgba(var(--ink-rgb), 0.14)",
            }}
          >
            <div className="mono muted" style={{ fontSize: 11, marginBottom: 4 }}>
              {rangeLabel(hovered.ts, bucketMs)}
            </div>
            <TooltipRow color="var(--ink)" label="Total" value={hovered.total} strong />
            <TooltipRow color="var(--ok)" label="OK" value={hovered.ok} />
            <TooltipRow color="var(--client-err)" label="Client error" value={hovered.client} />
            <TooltipRow color="var(--server-err)" label="Server error" value={hovered.server} />
          </div>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <LegendItem color="var(--ok)" label="OK" />
      <LegendItem color="var(--client-err)" label="Client error" />
      <LegendItem color="var(--server-err)" label="Server error" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: "none" }} />
      {label}
    </span>
  );
}

function TooltipRow({ color, label, value, strong }: { color: string; label: string; value: number; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
      <span style={{ width: 8, height: 2, background: color, flex: "none" }} />
      <span className="muted" style={{ flex: 1 }}>
        {label}
      </span>
      <span className="mono" style={{ fontWeight: strong ? 600 : 400 }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
