"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { guessPath } from "@/lib/guessPath";
import { BreakableUrl } from "@/components/BreakableUrl";
import { PRESETS, SAMPLE_KEY, useDemo, type Plan, type Probe } from "./DemoContext";
import { formatJson, previewLines } from "./json";
import { JsonText } from "./JsonText";
import { sampleFor } from "./samples";
import { useCopy } from "./useCopy";
import { ArrowClockwiseIcon, ArrowRightIcon, CheckIcon, CopyIcon, LightningIcon, TimerIcon } from "./Icons";

/** The key segment while the server is still choosing one. */
const PENDING_KEY = "······";

const REASONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};
const SHORT_REASONS: Record<number, string> = {
  422: "Unprocessable",
  429: "Rate Limited",
  500: "Server Error",
  503: "Unavailable",
  504: "Timeout",
};

type Tone = "text" | "muted" | "accent" | "bad";
/** `json` lines are syntax-coloured; the rest — steps, status lines — are plain. */
type Line = { text: string; tone: Tone; json?: boolean };

const isOk = (status: number) => status >= 200 && status < 300;
const ms = (n: number) => n.toLocaleString("en-US");
const blank: Line = { text: "", tone: "muted" };

function preview(body: unknown, tone: Tone, total?: number): Line[] {
  return previewLines(body, total).map(({ text, more }) => (more ? { text, tone: "muted" } : { text, tone, json: true }));
}

function responseLines(probe: Probe): Line[] {
  if (probe.status === 0) return [{ text: "The request didn't complete. Try calling it again.", tone: "bad" }];
  if (isOk(probe.status)) return preview(probe.body, "text");
  return [
    { text: `HTTP/1.1 ${probe.status} ${REASONS[probe.status] ?? ""}`.trim(), tone: "bad" },
    ...formatJson(probe.body)
      .split("\n")
      .map((text): Line => ({ text, tone: "text", json: true })),
  ];
}

export function TryItCard() {
  const demo = useDemo();
  const { origin, description, setDescription, phase, steps, plan, endpoint, probe, calls, elapsed, error, busy } = demo;
  const [copied, copy] = useCopy();
  const bodyRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  // The endpoint whose result has been brought into view already.
  const revealed = useRef<string | null>(null);

  const livePath = useMemo(() => guessPath(description), [description]);
  const creating = phase === "creating";
  const shown = creating && plan ? { key: PENDING_KEY, path: plan.path } : endpoint ?? { key: SAMPLE_KEY, path: livePath };
  const url = `${origin}/m/${shown.key}${shown.path}`;

  const stepLines = (p: Plan): Line[] => {
    const labels = [
      "Read the description",
      `Path      GET ${p.path}`,
      p.schema ? `Schema    ${p.schema}` : "Schema",
      p.count === null ? "Records" : `Records   ${p.count} sample ${p.count === 1 ? "record" : "records"}`,
    ];
    return labels.map((label, i): Line =>
      i < steps
        ? { text: `✓ ${label}`, tone: "text" }
        : i === steps
          ? { text: `… ${label.replace(/^Read /, "Reading ")}`, tone: "muted" }
          : blank
    );
  };

  let lines: Line[];
  if (creating && plan) {
    lines = stepLines(plan);
  } else if (phase === "calling" && probe) {
    // Calling again: the last response stays up, dimmed, until the new one lands.
    lines = preview(probe.body, "muted");
  } else if (phase === "calling" && endpoint) {
    lines = [
      ...(plan && steps === 4
        ? [
            ...stepLines(plan),
            blank,
            { text: "✓ Saved. Live for 24 hours.", tone: "text" as Tone },
          ]
        : []),
      { text: `→ Calling GET /m/${endpoint.key}${endpoint.path}`, tone: "accent" },
    ];
  } else if (phase === "done" && probe) {
    lines = responseLines(probe);
  } else if (phase === "error") {
    // Only what actually finished: a step left mid-way would read as still running.
    const done = plan ? stepLines(plan).slice(0, steps) : [];
    lines = [...done, ...(done.length ? [blank] : []), { text: `✕ ${error}`, tone: "bad" }];
  } else {
    const sample = sampleFor(livePath);
    lines = preview(sample.body, "muted", sample.total);
  }

  let status: { text: string; tone?: "live" | "ok" | "bad" } = { text: "Idle" };
  let announce = "";
  if (creating) {
    status = { text: "Creating…" };
    announce = "Creating the endpoint.";
  } else if (phase === "calling") {
    status = { text: endpoint?.delayMs ? `Waiting ${ms(elapsed)} ms` : "Calling…", tone: "live" };
  } else if (phase === "done" && probe) {
    status = {
      text: probe.status
        ? `${probe.status} ${SHORT_REASONS[probe.status] ?? REASONS[probe.status] ?? ""} · ${ms(probe.ms)} ms`
        : `No response · ${ms(probe.ms)} ms`,
      tone: isOk(probe.status) ? "ok" : "bad",
    };
    announce = probe.status ? `${probe.status} ${REASONS[probe.status] ?? ""} in ${probe.ms} milliseconds.` : "No response.";
  } else if (phase === "error") {
    status = { text: "Not created", tone: "bad" };
    announce = error ?? "";
  }

  const progress = creating
    ? (steps / 4) * 100
    : phase === "calling"
      ? Math.min(92, (elapsed / (endpoint?.delayMs || 400)) * 100)
      : phase === "done"
        ? 100
        : 0;
  const outcome = probe !== null && phase === "done" ? (isOk(probe.status) ? "ok" : "bad") : undefined;
  const failures = calls.filter((s) => !isOk(s)).length;

  // A small settle each time the body changes: bigger when the phase or the
  // response changes, smaller when only another creation step ticks over.
  const last = useRef({ phase, probe, steps });
  useEffect(() => {
    const prev = last.current;
    last.current = { phase, probe, steps };
    const big = prev.phase !== phase || prev.probe !== probe;
    if (!big && prev.steps === steps) return;
    const el = bodyRef.current;
    if (!el?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { opacity: big ? 0.25 : 0.6, transform: big ? "translateY(6px)" : "translateY(2px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: big ? 380 : 240, easing: "cubic-bezier(0.22, 0.7, 0.2, 1)" }
    );
  }, [phase, probe, steps]);

  // When a new endpoint answers its first call, the result and the way into
  // its workspace sit at the foot of a tall card, below the fold on a laptop
  // or a phone. Scroll just far enough to show them, once per endpoint.
  useEffect(() => {
    if (phase !== "done" || !endpoint || revealed.current === endpoint.key) return;
    revealed.current = endpoint.key;
    const foot = footRef.current;
    if (!foot) return;
    const box = foot.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    foot.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [phase, endpoint]);

  return (
    <div id="try" className="bs-card bs-try">
      <div className="bs-try-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="bs-kicker">Try it</span>
          <span className="bs-muted" style={{ fontSize: 15 }}>
            This creates a real endpoint.
          </span>
        </div>
        <div className="bs-seg" role="radiogroup" aria-label="Example prompts">
          {PRESETS.map((preset) => {
            const checked = description === preset.phrase;
            return (
              <label key={preset.label} className="bs-seg-opt" data-checked={checked}>
                <input
                  type="radio"
                  name="preset"
                  checked={checked}
                  onChange={() => setDescription(preset.phrase)}
                />
                {preset.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="bs-row">
        <input
          ref={demo.inputRef}
          className="bs-input"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) demo.create();
          }}
          aria-label="Describe the endpoint"
          placeholder="Describe the data you need"
          style={{ minHeight: 46 }}
        />
        <button
          type="button"
          className={`bs-btn ${endpoint ? "bs-btn-secondary" : "bs-btn-primary"}`}
          onClick={() => demo.create()}
          disabled={busy || !description.trim()}
          style={{ minHeight: 46, fontSize: 16 }}
        >
          {creating ? "Creating…" : endpoint ? "Regenerate" : "Create endpoint"}
        </button>
      </div>

      <div className="bs-row">
        <span className="bs-muted" style={{ fontSize: 15, marginRight: "var(--space-1)" }}>
          Inject
        </span>
        <button
          type="button"
          className="bs-btn bs-btn-secondary bs-btn-toggle"
          aria-pressed={demo.delay}
          onClick={demo.toggleDelay}
        >
          <TimerIcon size={17} />2 s delay
        </button>
        <button
          type="button"
          className="bs-btn bs-btn-secondary bs-btn-toggle"
          aria-pressed={demo.fail}
          data-tone="bad"
          onClick={demo.toggleFail}
        >
          <LightningIcon size={17} />
          Fail 20%
        </button>
        <span className="bs-push bs-muted" style={{ fontSize: 14 }}>
          {endpoint ? "Applies to the next one you create" : "Set before you create it"}
        </span>
      </div>

      <div className="bs-response">
        <div className="bs-response-head">
          <span className="bs-method" data-method="GET">
            GET
          </span>
          <code className="bs-response-url" data-live={creating || endpoint !== null}>
            <BreakableUrl value={url} />
          </code>
          <span className="bs-status" data-tone={status.tone}>
            {status.text}
          </span>
          <span className="bs-sr-only" aria-live="polite">
            {announce}
          </span>
        </div>
        <div className="bs-progress" data-tone={outcome}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div ref={bodyRef} className="bs-response-body" tabIndex={0} aria-label="Response body">
          {lines.map((line, i) => (
            <div key={i} className="bs-line" data-tone={line.tone} data-json={line.json}>
              {line.json ? <JsonText runs={[{ text: line.text, marked: false }]} /> : line.text}
            </div>
          ))}
        </div>
        <div ref={footRef} className="bs-response-foot">
          {endpoint ? (
            <>
              <div
                className="bs-calls"
                role="img"
                aria-label={`Recent calls: ${calls.map((s) => s || "no response").join(", ") || "none"}`}
              >
                {calls.map((s, i) => (
                  <span key={i} title={`Call ${i + 1}: ${s || "no response"}`} data-bad={!isOk(s)} />
                ))}
              </div>
              <span className="bs-muted" style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                {calls.length} {calls.length === 1 ? "call" : "calls"}
                {failures > 0 && ` · ${failures} failed`}
              </span>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                className="bs-btn bs-btn-secondary bs-btn-sm"
                onClick={() => copy(`curl -s ${origin}/m/${endpoint.key}${endpoint.path}`)}
              >
                {copied === "done" ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                {copied === "done" ? "Copied" : copied === "error" ? "Couldn't copy" : "Copy curl"}
              </button>
              <button
                type="button"
                className="bs-btn bs-btn-secondary bs-btn-sm"
                onClick={demo.callAgain}
                disabled={busy}
              >
                <ArrowClockwiseIcon size={16} />
                Call it again
              </button>
              {/* The next step once an endpoint exists, so the card's one
                  primary button; Regenerate above steps back to secondary. */}
              <Link href={`/w/${endpoint.key}`} className="bs-btn bs-btn-primary bs-btn-sm bs-open-ws">
                Open workspace <ArrowRightIcon size={16} />
              </Link>
              {/* Covers both reasons for a fallback: no model key, or a
                  model reply that couldn't be used. */}
              {endpoint.source === "fallback" && (
                <span className="bs-muted" style={{ flexBasis: "100%", fontSize: 14 }}>
                  The model didn&apos;t produce this body, so it&apos;s the hand-written skeleton. Open the
                  workspace to edit it.
                </span>
              )}
            </>
          ) : (
            <span className="bs-muted" style={{ fontSize: 15 }}>
              Nothing is saved until you press Create. Demo endpoints stay live for 24 hours.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
