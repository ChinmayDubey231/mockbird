"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon } from "./Icons";

/** Creates an empty workspace and goes straight to it — no dialog, no name to think of yet. */
export function OpenWorkspaceButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the workspace");
      router.push(`/w/${data.key}`);
    } catch {
      // The workspace list has its own New workspace button to try again from.
      router.push("/w");
    }
  };

  return (
    <button
      type="button"
      className="bs-btn bs-btn-ghost bs-btn-bare"
      onClick={open}
      disabled={busy}
      style={{ fontSize: 16 }}
    >
      {busy ? "Opening…" : label} <ArrowRightIcon size={18} />
    </button>
  );
}
