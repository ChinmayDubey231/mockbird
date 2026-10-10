"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BreakableUrl } from "./BreakableUrl";
import { ConfirmDialog } from "./ConfirmDialog";
import { CopyButton } from "./CopyButton";
import { ArrowClockwiseIcon, BroomIcon, DownloadIcon, TrashIcon, UploadIcon } from "./icons";
import { SETTINGS_NOTES, clearLogNote } from "./settingsCopy";
import { testPathFor } from "./status";

type SaveState = "" | "saving" | "saved" | "error";
type Notice = { text: string; tone: "ok" | "bad"; details?: string[] } | null;
type Confirming = "rotate" | "clear" | "delete" | null;

const NAME_MAX = 60;
const HOUR = 3600e3;

/** Dates in UTC, so the server's render and the browser's agree on them. */
const fmtDate = (iso: string, withYear = true) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export function Settings({
  workspaceId,
  workspaceKey,
  baseUrl,
  name,
  createdAt,
  expiresAt,
  endpointCount,
  logCount,
  recentCount,
  examplePath,
  now,
}: {
  workspaceId: string;
  workspaceKey: string;
  baseUrl: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  endpointCount: number;
  logCount: number;
  recentCount: number;
  /** A GET route to show the base URL in use, if the workspace has one. */
  examplePath: string | null;
  now: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [save, setSave] = useState<SaveState>("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [busy, setBusy] = useState(false);
  const [keyNotice, setKeyNotice] = useState<Notice>(null);
  const [importNotice, setImportNotice] = useState<Notice>(null);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [clearNotice, setClearNotice] = useState<Notice>(null);
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);
  const saved = useRef(name);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const lifetime = !expiresAt ? "kept" : new Date(expiresAt).getTime() <= now ? "expired" : "live";
  const hoursLeft = expiresAt ? Math.max(1, Math.round((new Date(expiresAt).getTime() - now) / HOUR)) : 0;
  const example = examplePath ? `${baseUrl}${testPathFor(examplePath)}` : null;

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) return { error: (data?.error as string) ?? "Could not reach the server" };
    return { data: data as { key: string } };
  };

  const commitName = async (next: string) => {
    window.clearTimeout(timer.current);
    const trimmed = next.trim();
    if (!trimmed) {
      setSave("");
      setNameError("A workspace needs a name. The last one is kept until you give it another.");
      return;
    }
    setNameError(null);
    if (trimmed === saved.current) {
      setSave("");
      return;
    }
    setSave("saving");
    const result = await patch({ name: trimmed });
    if (result.error) {
      setSave("error");
      setNameError(result.error);
      return;
    }
    saved.current = trimmed;
    setSave("saved");
    router.refresh();
    timer.current = window.setTimeout(() => setSave(""), 2000);
  };

  // The name saves itself a moment after typing stops, like an endpoint's fields.
  const onName = (next: string) => {
    setValue(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commitName(next), 600);
  };

  const rotateKey = async () => {
    setBusy(true);
    const result = await patch({ rotateKey: true });
    setBusy(false);
    setConfirming(null);
    if (result.error) {
      setKeyNotice({ text: result.error, tone: "bad" });
      return;
    }
    router.replace(`/w/${result.data!.key}/settings`);
    router.refresh();
  };

  const clearLog = async () => {
    setBusy(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/logs`, { method: "DELETE" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    setConfirming(null);
    setClearNotice(
      res?.ok
        ? { text: `Cleared ${plural(data?.cleared ?? 0, "request", "requests")} from the log.`, tone: "ok" }
        : { text: data?.error ?? "Could not clear the log", tone: "bad" }
    );
    router.refresh();
  };

  const deleteWorkspace = async () => {
    setBusy(true);
    const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      router.push("/w");
      router.refresh();
      return;
    }
    const data = await res?.json().catch(() => null);
    setBusy(false);
    setConfirming(null);
    setDeleteNotice({ text: data?.error ?? "Could not delete the workspace", tone: "bad" });
  };

  const importFile = async (file: File) => {
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
      setImportNotice({ text: `${file.name} isn't a JSON file. Import takes a file made by Export.`, tone: "bad" });
      return;
    }
    setImporting(true);
    setImportNotice(null);
    const res = await fetch(`/api/workspaces/${workspaceId}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await file.text(),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setImporting(false);
    if (!res?.ok) {
      setImportNotice({
        text: data?.error ? `${file.name}: ${data.error}.` : `Could not import ${file.name}.`,
        tone: "bad",
      });
      return;
    }
    const skipped: string[] = data.skipped ?? [];
    setImportNotice({
      text:
        `Imported ${plural(data.imported, "endpoint", "endpoints")} from ${file.name}` +
        (skipped.length ? `; skipped ${skipped.length}:` : "."),
      tone: data.imported || !skipped.length ? "ok" : "bad",
      details: skipped.slice(0, 5).concat(skipped.length > 5 ? [`and ${skipped.length - 5} more`] : []),
    });
    router.refresh();
  };

  const nameState =
    save === "saving" ? "Saving…" : save === "saved" ? "Saved" : save === "error" ? "Not saved" : "";

  return (
    <div className="ws-settings">
      <div className="ws-log-head">
        <div>
          <h1 className="ws-display">Settings</h1>
          <p className="ws-lede">The workspace&apos;s name and address, what&apos;s in it, and how to take it down.</p>
        </div>
        <div className="ws-stats">
          <Stat value={endpointCount.toLocaleString("en-US")} label={endpointCount === 1 ? "endpoint" : "endpoints"} />
          <Stat value={recentCount.toLocaleString("en-US")} label="requests in 24 h" />
          <Stat value={fmtDate(createdAt, false)} label={`created ${new Date(createdAt).getUTCFullYear()}`} />
          <Stat
            value={lifetime === "kept" ? "Kept" : lifetime === "live" ? `${hoursLeft} h` : "Ended"}
            label={
              lifetime === "kept"
                ? "until you delete it"
                : lifetime === "live"
                  ? "left of its 24 hours"
                  : fmtDate(expiresAt!)
            }
            bad={lifetime === "expired"}
          />
        </div>
      </div>

      <Group title="Workspace">
        <Row
          title="Name"
          htmlFor="workspace-name"
          note={SETTINGS_NOTES.name}
        >
          <div className="ws-name-row">
            <input
              id="workspace-name"
              className="ds-input ds-input-lg"
              value={value}
              maxLength={NAME_MAX}
              aria-invalid={Boolean(nameError)}
              aria-describedby="workspace-name-state"
              onChange={(e) => onName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName(value);
                if (e.key === "Escape") {
                  window.clearTimeout(timer.current);
                  setValue(saved.current);
                  setNameError(null);
                  setSave("");
                }
              }}
            />
          </div>
          <div id="workspace-name-state" className="ws-field-meta" aria-live="polite">
            <span className={nameError ? "ws-alert" : "ws-save"} data-state={save}>
              {nameError ?? nameState}
            </span>
            <span className="ds-num">
              {value.length} / {NAME_MAX}
            </span>
          </div>
        </Row>

        <Row
          title="Base URL"
          note={SETTINGS_NOTES.baseUrl}
        >
          <div className="ws-well">
            <code>
              <BreakableUrl value={baseUrl} />
            </code>
            <CopyButton value={baseUrl} variant="ghost" />
          </div>
          {example && (
            <div className="ws-well-example">
              <span className="ds-kicker">Try</span>
              <code>
                curl -s <BreakableUrl value={example} />
              </code>
              <CopyButton value={`curl -s ${example}`} label="Copy curl" variant="ghost" icon="terminal" />
            </div>
          )}
        </Row>

        <Row
          title="Key"
          note={SETTINGS_NOTES.key}
        >
          <div className="ws-key-line">
            <code className="ws-key">{workspaceKey}</code>
            <CopyButton value={workspaceKey} label={`Copy key ${workspaceKey}`} variant="ghost" iconOnly />
            <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setConfirming("rotate")}>
              <ArrowClockwiseIcon size={17} />
              Rotate key
            </button>
          </div>
          {keyNotice && <NoticeLine notice={keyNotice} />}
        </Row>

        <Row
          title="Lifetime"
          note={SETTINGS_NOTES.lifetime}
        >
          <div className="ws-life-line">
            <span
              className={`ds-tag ${lifetime === "kept" ? "ds-tag-neutral" : lifetime === "live" ? "ds-tag-accent" : "ds-tag-accent-2"}`}
            >
              {lifetime === "kept" ? "Kept" : lifetime === "live" ? "24-hour demo" : "Expired"}
            </span>
            <span>
              {lifetime === "kept"
                ? `Created ${fmtDate(createdAt)}, and kept until you delete it.`
                : lifetime === "live"
                  ? `Created ${fmtDate(createdAt)}. Expires in ${plural(hoursLeft, "hour", "hours")}, along with its endpoints and log.`
                  : `Expired ${fmtDate(expiresAt!)}. Its mock URLs no longer answer.`}
            </span>
          </div>
        </Row>
      </Group>

      <Group title="Endpoints">
        <Row
          title="Export"
          note={SETTINGS_NOTES.export}
        >
          <div className="ws-key-line">
            <a
              className="ds-btn ds-btn-secondary"
              href={`/api/workspaces/${workspaceId}/export`}
              aria-disabled={endpointCount === 0}
              onClick={(e) => {
                if (endpointCount === 0) e.preventDefault();
              }}
            >
              <DownloadIcon size={17} />
              Export {plural(endpointCount, "endpoint", "endpoints")}
            </a>
            <code className="ws-file-name">{workspaceKey}-endpoints.json</code>
          </div>
        </Row>

        <Row
          title="Import"
          note={SETTINGS_NOTES.import}
        >
          <label
            className="ws-drop"
            data-dragging={dragging}
            aria-busy={importing}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file && !importing) importFile(file);
            }}
          >
            <UploadIcon size={22} />
            <span>
              {importing ? (
                "Importing…"
              ) : (
                <>
                  Drop an exported file here, or <span className="ws-drop-pick">choose one</span>
                </>
              )}
            </span>
            <input
              type="file"
              accept="application/json,.json"
              className="ds-sr-only"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) importFile(file);
              }}
            />
          </label>
          {importNotice && <NoticeLine notice={importNotice} />}
        </Row>
      </Group>

      <Group title="Danger zone" danger>
        <Row
          title="Clear the request log"
          note={clearLogNote(logCount)}
        >
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            data-tone="danger"
            onClick={() => setConfirming("clear")}
            disabled={logCount === 0}
          >
            <BroomIcon size={17} />
            {logCount === 0 ? "The log is empty" : "Clear log"}
          </button>
          {clearNotice && <NoticeLine notice={clearNotice} />}
        </Row>
        <Row
          title="Delete this workspace"
          note={SETTINGS_NOTES.delete}
        >
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            data-tone="danger"
            onClick={() => setConfirming("delete")}
          >
            <TrashIcon size={17} />
            Delete workspace
          </button>
          {deleteNotice && <NoticeLine notice={deleteNotice} />}
        </Row>
      </Group>

      {confirming === "rotate" && (
        <ConfirmDialog
          title="Rotate the workspace key?"
          description={`Mock URLs built on ${workspaceKey} stop working straight away. Your endpoints move to the new key unchanged.`}
          confirmLabel="Rotate key"
          busy={busy}
          onConfirm={rotateKey}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === "clear" && (
        <ConfirmDialog
          title="Clear the request log?"
          description={`All ${plural(logCount, "entry is", "entries are")} removed for this workspace. Endpoints aren't affected.`}
          confirmLabel="Clear log"
          busy={busy}
          onConfirm={clearLog}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === "delete" && (
        <ConfirmDialog
          title={`Delete ${saved.current}?`}
          description={`Its ${plural(endpointCount, "endpoint", "endpoints")} and request log go with it, and the key stops working immediately. This can't be undone.`}
          confirmLabel="Delete workspace"
          busy={busy}
          onConfirm={deleteWorkspace}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function Stat({ value, label, bad = false }: { value: string; label: string; bad?: boolean }) {
  return (
    <div className="ws-stat">
      <span className="ws-figure-num" data-tone={bad ? "bad" : undefined}>
        {value}
      </span>
      <span>{label}</span>
    </div>
  );
}

/** A labelled run of settings, set off by whitespace and a small-capitals head. */
function Group({ title, danger = false, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section className="ws-set-group" data-tone={danger ? "danger" : undefined} aria-label={title}>
      <h2 className="ds-kicker ws-set-kicker">{title}</h2>
      {children}
    </section>
  );
}

/** One setting: what it is on the left, its controls on the right. */
function Row({
  title,
  note,
  htmlFor,
  children,
}: {
  title: string;
  note: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ws-set-row">
      <div className="ws-set-label">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="ws-set-title">
            {title}
          </label>
        ) : (
          <h3 className="ws-set-title">{title}</h3>
        )}
        <p>{note}</p>
      </div>
      <div className="ws-set-body">{children}</div>
    </div>
  );
}

function NoticeLine({ notice }: { notice: NonNullable<Notice> }) {
  return (
    <div className={`${notice.tone === "ok" ? "ws-ok" : "ws-alert"} ws-enter`} role="status">
      <p>{notice.text}</p>
      {notice.details && notice.details.length > 0 && (
        <ul className="ws-notice-list">
          {notice.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
