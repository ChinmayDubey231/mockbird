"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/components/CopyButton";

export type CopyState = "idle" | "done" | "error";

/** Copies text and reports how it went for 1.6s, for a button that says "Copied". */
export function useCopy(): [CopyState, (text: string) => void] {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback((text: string) => {
    copyToClipboard(text).then(
      () => setState("done"),
      () => setState("error")
    );
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }, []);

  return [state, copy];
}
