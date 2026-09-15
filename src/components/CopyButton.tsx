"use client";

import { useState } from "react";

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

type Status = "idle" | "done" | "error";

/** navigator.clipboard needs a secure context; fall back to the old execCommand trick. */
async function copyToClipboard(value: string): Promise<void> {
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
  hideLabelOnNarrow = false,
}: {
  value: string;
  label?: string;
  /** "ghost" drops the border/background so the button can sit inside another chip. */
  variant?: "button" | "ghost";
  hideLabelOnNarrow?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");

  const copy = async () => {
    try {
      await copyToClipboard(value);
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 1600);
    }
  };

  const tone = status === "done" ? "var(--ok)" : status === "error" ? "var(--server-err)" : undefined;
  const text = status === "done" ? "Copied" : status === "error" ? "Couldn't copy" : label;

  return (
    <button
      type="button"
      className={variant === "button" ? "btn btn-sm" : undefined}
      onClick={copy}
      title={status === "error" ? "Couldn't copy — select and copy it manually" : value}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: tone,
        borderColor: variant === "button" ? tone : undefined,
        background: variant === "ghost" ? "transparent" : undefined,
        border: variant === "ghost" ? "none" : undefined,
        padding: variant === "ghost" ? 4 : undefined,
        fontSize: variant === "ghost" ? 12.5 : undefined,
        cursor: "pointer",
      }}
    >
      {status === "done" ? <CheckIcon /> : <CopyIcon />}
      <span className={hideLabelOnNarrow ? "copy-btn-label" : undefined} aria-live="polite">
        {text}
      </span>
    </button>
  );
}
