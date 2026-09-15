"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NewWorkspaceDialog } from "./NewWorkspaceDialog";

export function NewWorkspaceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (name: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the workspace");
      router.push(`/w/${data.key}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not create the workspace");
    }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        New workspace
      </button>
      {open && (
        <NewWorkspaceDialog
          busy={busy}
          error={error}
          onSubmit={create}
          onCancel={() => {
            if (busy) return;
            setOpen(false);
            setError(null);
          }}
        />
      )}
    </>
  );
}
