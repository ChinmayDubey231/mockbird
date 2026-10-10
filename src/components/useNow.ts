"use client";

import { useEffect, useState } from "react";

/**
 * A clock for "3m ago" labels. It starts at the time the server rendered, so
 * the first paint matches the server's HTML, then ticks on its own.
 */
export function useNow(initial: number, everyMs = 15000): number {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}
