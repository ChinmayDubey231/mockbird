"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { guessPath } from "@/lib/guessPath";
import { summarize } from "./samples";

/**
 * The landing page's one piece of shared state: the demo endpoint. The card
 * in the hero creates and calls it, the snippet further down points at it,
 * and the closing call to action hands it a description — so all three read
 * it from here instead of each keeping a copy.
 */

export const PRESETS = [
  { label: "Orders", phrase: "Twelve orders, one refunded, with customer names" },
  { label: "User", phrase: "A user profile with plan and last login" },
  { label: "Catalog", phrase: "Three products, prices in EUR, one out of stock" },
];

/** Stands in for a real workspace key until the visitor creates something. */
export const SAMPLE_KEY = "a8f3k2";

const DELAY_MS = 2000;
const FAILURE_RATE = 20;
const STEP_MS = 380;

export type Phase = "idle" | "creating" | "calling" | "done" | "error";

/** What the creation steps report. Nulls are the parts the server hasn't answered yet. */
export interface Plan {
  path: string;
  schema: string | null;
  count: number | null;
}

export interface DemoEndpoint {
  key: string;
  path: string;
  source: "model" | "fallback";
  delayMs: number;
  failureRate: number;
}

export interface Probe {
  /** 0 when the request never got a response. */
  status: number;
  ms: number;
  body: unknown;
}

interface Demo {
  origin: string;
  description: string;
  setDescription: (description: string) => void;
  delay: boolean;
  fail: boolean;
  toggleDelay: () => void;
  toggleFail: () => void;
  phase: Phase;
  /** How many of the four creation steps have finished. */
  steps: number;
  plan: Plan | null;
  endpoint: DemoEndpoint | null;
  probe: Probe | null;
  /** Statuses of the endpoint's most recent calls, oldest first. */
  calls: number[];
  /** Milliseconds since the call in flight started. */
  elapsed: number;
  error: string | null;
  busy: boolean;
  create: (description?: string) => void;
  callAgain: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const DemoContext = createContext<Demo | null>(null);

export function useDemo(): Demo {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("useDemo must be used inside <DemoProvider>");
  return demo;
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, ms)));

export function DemoProvider({ origin, children }: { origin: string; children: React.ReactNode }) {
  const [description, setDescription] = useState(PRESETS[0].phrase);
  const [delay, setDelay] = useState(false);
  const [fail, setFail] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState(0);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [endpoint, setEndpoint] = useState<DemoEndpoint | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [calls, setCalls] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A ref rather than state, so two clicks in the same frame can't both start a run.
  const busyRef = useRef(false);
  // Bumped on unmount; a response that arrives after that is dropped.
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    []
  );

  const call = useCallback(async (target: DemoEndpoint) => {
    const gen = generation.current;
    setPhase("calling");
    setElapsed(0);
    const started = performance.now();
    const ticker = window.setInterval(() => setElapsed(Math.round(performance.now() - started)), 50);

    let status = 0;
    let body: unknown = null;
    try {
      // The same-origin path, not the public URL on screen, so this still
      // works on a deployment whose host isn't NEXT_PUBLIC_APP_URL.
      const res = await fetch(`/m/${target.key}${target.path}`, { cache: "no-store" });
      status = res.status;
      body = await res.json().catch(() => null);
    } catch {
      // Left at status 0, which the card reports as a request that never landed.
    } finally {
      window.clearInterval(ticker);
    }
    if (gen !== generation.current) return;

    const ms = Math.round(performance.now() - started);
    setElapsed(ms);
    setProbe({ status, ms, body });
    setCalls((prev) => [...prev, status].slice(-10));
    setPhase("done");
  }, []);

  const create = useCallback(
    async (text?: string) => {
      const desc = (text ?? description).trim();
      if (!desc || busyRef.current) return;
      busyRef.current = true;
      const gen = generation.current;
      const live = () => gen === generation.current;
      const delayMs = delay ? DELAY_MS : 0;
      const failureRate = fail ? FAILURE_RATE : 0;

      setError(null);
      setProbe(null);
      setSteps(0);
      setPlan({ path: guessPath(desc), schema: null, count: null });
      setPhase("creating");

      // Reading the description and picking the path happen here as well as
      // on the server — same guessPath — so those two steps tick on a timer
      // while the request is out. Schema and records wait for the answer.
      const started = Date.now();
      const timers = [1, 2].map((n) =>
        window.setTimeout(() => setSteps((s) => Math.max(s, n)), n * STEP_MS)
      );

      try {
        const res = await fetch("/api/demo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ description: desc, delayMs, failureRate }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Couldn't create the endpoint");

        await sleep(2 * STEP_MS - (Date.now() - started));
        if (!live()) return;
        setPlan({ path: data.path, ...summarize(data.path, data.sample) });
        setSteps(3);

        await sleep(STEP_MS);
        if (!live()) return;
        setSteps(4);
        const next: DemoEndpoint = { key: data.key, path: data.path, source: data.source, delayMs, failureRate };
        setEndpoint(next);
        setCalls([]);

        await sleep(260);
        if (!live()) return;
        await call(next);
      } catch (err) {
        timers.forEach((t) => window.clearTimeout(t));
        if (!live()) return;
        setError(
          err instanceof TypeError
            ? "Couldn't reach the server. Check the connection and try again."
            : err instanceof Error
              ? err.message
              : "Couldn't create the endpoint"
        );
        setPhase("error");
      } finally {
        busyRef.current = false;
      }
    },
    [description, delay, fail, call]
  );

  const callAgain = useCallback(() => {
    if (!endpoint || busyRef.current) return;
    busyRef.current = true;
    call(endpoint).finally(() => {
      busyRef.current = false;
    });
  }, [endpoint, call]);

  const value = useMemo<Demo>(
    () => ({
      origin,
      description,
      setDescription,
      delay,
      fail,
      toggleDelay: () => setDelay((on) => !on),
      toggleFail: () => setFail((on) => !on),
      phase,
      steps,
      plan,
      endpoint,
      probe,
      calls,
      elapsed,
      error,
      busy: phase === "creating" || phase === "calling",
      create: (text?: string) => void create(text),
      callAgain,
      inputRef,
    }),
    [origin, description, delay, fail, phase, steps, plan, endpoint, probe, calls, elapsed, error, create, callAgain]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
