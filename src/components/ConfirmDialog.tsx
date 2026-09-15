"use client";

import { useEffect, useRef } from "react";

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
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  return (
    <div className="modal-scrim" onClick={busy ? undefined : onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
      >
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
