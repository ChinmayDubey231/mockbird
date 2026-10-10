"use client";

import { useEffect, useRef, useState } from "react";
import { useExitTransition } from "./useExitTransition";

/** The key segment of the preview URL; the server picks the real one on create. */
const PENDING_KEY = "······";

export function NewWorkspaceDialog({
  origin,
  busy = false,
  error,
  onSubmit,
  onCancel,
}: {
  origin: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Orders API");
  const inputRef = useRef<HTMLInputElement>(null);
  const { exiting, exit } = useExitTransition(onCancel, 180);
  const cancel = () => {
    if (!busy) exit();
  };

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit, busy]);

  const submit = () => {
    if (!name.trim() || busy || exiting) return;
    onSubmit(name.trim());
  };

  return (
    <div
      className="ds-backdrop"
      data-exiting={exiting}
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="new-workspace-title" style={{ width: "min(480px, 100%)" }}>
        <h2 id="new-workspace-title" className="ds-dialog-title" style={{ fontSize: 30 }}>
          New workspace
        </h2>
        <p className="ds-dialog-body">A workspace holds a set of endpoints and gives them a shared base URL.</p>

        <div className="ds-field" style={{ marginTop: "var(--space-4)" }}>
          <label htmlFor="workspace-name">Name</label>
          <input
            id="workspace-name"
            ref={inputRef}
            className="ds-input ds-input-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            }}
            maxLength={60}
            disabled={busy}
          />
        </div>
        <div className="ws-preview-url">
          {origin}/m/{PENDING_KEY}/…
        </div>

        {error && (
          <p className="ws-alert" role="alert" style={{ marginTop: "var(--space-3)" }}>
            {error}
          </p>
        )}

        <div className="ds-dialog-actions">
          <button type="button" className="ds-btn ds-btn-secondary" onClick={cancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="ds-btn ds-btn-primary" onClick={submit} disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
