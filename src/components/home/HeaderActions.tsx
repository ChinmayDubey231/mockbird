"use client";

import { useDemo } from "./DemoContext";

/** Jumps to the demo and puts the cursor in its description once the scroll has landed. */
export function StartFreeButton() {
  const { inputRef } = useDemo();
  return (
    <a
      href="#try"
      className="ds-btn ds-btn-primary ds-hide-sm"
      onClick={() => window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 500)}
    >
      Start free
    </a>
  );
}
