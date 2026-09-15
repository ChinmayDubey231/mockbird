"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function Settings({
  workspaceId,
  workspaceKey,
  name,
  endpointCount,
}: {
  workspaceId: string;
  workspaceKey: string;
  name: string;
  endpointCount: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"rotate" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not save");
      return null;
    }
    return data as { key: string };
  };

  const rotateKey = async () => {
    setBusy(true);
    const data = await patch({ rotateKey: true });
    setBusy(false);
    setConfirming(null);
    if (data) router.replace(`/w/${data.key}/settings`);
  };

  const deleteWorkspace = async () => {
    setBusy(true);
    const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/w");
      return;
    }
    setBusy(false);
    setConfirming(null);
    const data = await res.json().catch(() => null);
    setMessage(data?.error ?? "Could not delete workspace");
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 18 }}>Settings</h2>

      <Row title="Name">
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} />
          <button
            className="btn"
            onClick={async () => {
              const data = await patch({ name: value });
              if (data) {
                setMessage("Renamed");
                router.refresh();
              }
            }}
          >
            Save
          </button>
        </div>
      </Row>

      <Row
        title="Workspace key"
        note="Rotating breaks every URL you have already shared. The old key stops resolving immediately."
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <code className="mono">{workspaceKey}</code>
          <span style={{ flex: 1 }} />
          <button className="btn btn-danger" onClick={() => setConfirming("rotate")}>
            Rotate key
          </button>
        </div>
      </Row>

      <Row title="Endpoints" note={`${endpointCount} in this workspace.`}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn" href={`/api/workspaces/${workspaceId}/export`}>
            Export as JSON
          </a>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Import a file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const res = await fetch(`/api/workspaces/${workspaceId}/export`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: await file.text(),
              });
              const data = await res.json();
              setMessage(
                res.ok
                  ? `Imported ${data.imported} endpoints${data.skipped?.length ? `, skipped ${data.skipped.length}` : ""}`
                  : (data.error ?? "Import failed")
              );
              router.refresh();
            }}
          />
        </div>
      </Row>

      <Row title="Delete workspace" note="Endpoints and logs go with it. This cannot be undone.">
        <button className="btn btn-danger" onClick={() => setConfirming("delete")}>
          Delete workspace
        </button>
      </Row>

      {message && (
        <p className="small muted" aria-live="polite">
          {message}
        </p>
      )}

      {confirming === "rotate" && (
        <ConfirmDialog
          title="Rotate the workspace key?"
          description="Existing mock URLs built from the current key will stop working immediately."
          confirmLabel="Rotate key"
          busy={busy}
          onConfirm={rotateKey}
          onCancel={() => setConfirming(null)}
        />
      )}

      {confirming === "delete" && (
        <ConfirmDialog
          title="Delete this workspace?"
          description="Every endpoint and request log in it goes with it. This cannot be undone."
          confirmLabel="Delete workspace"
          busy={busy}
          onConfirm={deleteWorkspace}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function Row({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ borderTop: "1px solid var(--rule)", padding: "16px 0" }}>
      <h3>{title}</h3>
      {note && (
        <p className="small muted" style={{ margin: "4px 0 10px" }}>
          {note}
        </p>
      )}
      <div style={{ marginTop: note ? 0 : 10 }}>{children}</div>
    </section>
  );
}
