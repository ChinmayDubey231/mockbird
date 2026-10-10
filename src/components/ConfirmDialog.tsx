"use client";

import { useEffect, useRef } from "react";
import { useExitTransition } from "./useExitTransition";

/** A yes-or-no question before something that can't be undone. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { exiting, exit } = useExitTransition(onCancel, 180);
  const cancel = () => {
    if (!busy) exit();
  };

  // Focus lands on Cancel, so a stray Enter can't destroy anything.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit, busy]);

  return (
    <div
      className="ds-backdrop"
      data-exiting={exiting}
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div className="ds-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="ds-dialog-title">
          {title}
        </h2>
        {description && <p className="ds-dialog-body">{description}</p>}
        <div className="ds-dialog-actions">
          <button ref={cancelRef} type="button" className="ds-btn ds-btn-secondary" onClick={cancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`ds-btn ${danger ? "ds-btn-danger" : "ds-btn-primary"}`}
            onClick={onConfirm}
            disabled={busy || exiting}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
