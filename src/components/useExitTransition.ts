"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lets an overlay play its exit animation before it unmounts. `exit()` sets
 * `exiting`, which the overlay renders as data-exiting so its CSS can run the
 * animation out, and calls `onExited` once that has had time to finish. A
 * timer rather than animationend, so it still closes if the animation never
 * runs. With reduced motion there's nothing to wait for.
 */
export function useExitTransition(onExited: () => void, ms = 240) {
  const [exiting, setExiting] = useState(false);
  const done = useRef(onExited);
  done.current = onExited;

  const exit = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) done.current();
    else setExiting(true);
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => done.current(), ms);
    return () => window.clearTimeout(timer);
  }, [exiting, ms]);

  return { exiting, exit };
}
