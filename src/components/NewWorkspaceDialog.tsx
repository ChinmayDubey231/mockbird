"use client";

import { useEffect, useRef, useState } from "react";

export function NewWorkspaceDialog({
  busy = false,
  error,
  onSubmit,
  onCancel,
}: {
  busy?: boolean;
  error?: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Orders API");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  const submit = () => {
    if (!name.trim() || busy) return;
    onSubmit(name.trim());
  };

  return (
    <div className="modal-scrim" onClick={busy ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New workspace"
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
      >
        <h2>New workspace</h2>
        <p>A workspace holds a set of endpoints and gives them a shared base URL.</p>

        <div style={{ marginTop: 16 }}>
          <label className="small muted" style={{ display: "block", marginBottom: 6 }} htmlFor="workspace-name">
            Name
          </label>
          <input
            id="workspace-name"
            ref={inputRef}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            maxLength={80}
            disabled={busy}
          />
        </div>

        {error && (
          <p style={{ color: "var(--server-err)" }} aria-live="polite">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
