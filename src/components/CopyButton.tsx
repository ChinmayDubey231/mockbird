"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, TerminalIcon } from "./icons";

type Status = "idle" | "done" | "error";

/** navigator.clipboard needs a secure context; fall back to the old execCommand trick. */
export async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("copy failed");
}

export function CopyButton({
  value,
  label = "Copy",
  variant = "button",
  icon = "copy",
  iconOnly = false,
}: {
  value: string;
  label?: string;
  /** "ghost" drops the border, for a button that sits in a line of text. */
  variant?: "button" | "ghost";
  /** The terminal glyph marks a copy of a command rather than a value. */
  icon?: "copy" | "terminal";
  /** Just the glyph, with the label kept for screen readers and the tooltip. */
  iconOnly?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await copyToClipboard(value);
      setStatus("done");
    } catch {
      setStatus("error");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 1600);
  };

  const text = status === "done" ? "Copied" : status === "error" ? "Couldn't copy" : label;
  const size = iconOnly ? 17 : 16;
  const glyph =
    status === "done" ? <CheckIcon size={size} /> : icon === "terminal" ? <TerminalIcon size={size} /> : <CopyIcon size={size} />;
  const classes = [
    "ds-btn",
    variant === "ghost" ? "ds-btn-ghost" : "ds-btn-secondary",
    iconOnly ? "ds-btn-icon ws-copy-only" : "ds-btn-sm",
    "ws-copy",
  ].join(" ");

  return (
    <button
      type="button"
      className={classes}
      data-state={status}
      onClick={copy}
      title={status === "error" ? "Couldn't copy. Select and copy it manually." : iconOnly ? text : value}
      aria-label={iconOnly ? text : undefined}
    >
      {/* Keyed so the tick remounts, and pops, each time it appears. */}
      <span className="ws-copy-icon" key={status === "done" ? "done" : "copy"}>
        {glyph}
      </span>
      {!iconOnly && <span aria-live="polite">{text}</span>}
    </button>
  );
}
