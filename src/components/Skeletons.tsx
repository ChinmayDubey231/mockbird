/**
 * Loading placeholders, one per page, each built from that page's own layout
 * classes: blocks at the size of the inputs and buttons they stand in for,
 * and lines that sit inside the real type, so every line of placeholder is
 * as tall as the line of text that replaces it. Labels that never change
 * are drawn for real. Nothing moves when the page arrives.
 *
 * They fade in after a short beat, so a fast navigation never flashes one.
 */

import { SETTINGS_NOTES, clearLogNote } from "./settingsCopy";

/** A line of text to come, as wide as `w` (em widths follow the type it sits in). */
function Line({ w }: { w: number | string }) {
  return <span className="ws-skel ws-skel-line" style={{ width: w }} />;
}

/** A box to come: an input, a button, the editor. */
function Block({ w = "100%", h }: { w?: number | string; h: number }) {
  return <span className="ws-skel" style={{ width: w, height: h }} />;
}

/**
 * What every skeleton shares: one announcement for screen readers, and the
 * drawing hidden from them. The drawing is the page's own layout container,
 * so its children keep the parent-child relations the page's CSS relies on.
 */
function Loading({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="ds-sr-only" role="status">
        {label}…
      </span>
      <div className={`ws-loading ${className}`} aria-hidden="true">
        {children}
      </div>
    </>
  );
}

/** Varied lengths, so a column of placeholders reads as a list rather than a grid. */
const PATHS = ["5.5em", "7.5em", "4.5em", "9em", "6.5em", "8em", "5em"];

/** A run of the editor's small status and preset buttons. */
function Chips({ n, w = 46 }: { n: number; w?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Block key={i} w={w} h={29} />
      ))}
    </>
  );
}

export function EndpointsSkeleton() {
  return (
    <Loading label="Loading endpoints" className="ws-dash">
      <aside className="ws-side" style={{ position: "static" }}>
        <Block h={46} />
        <div className="ws-side-list">
          <span className="ds-kicker">
            <Line w="7em" />
          </span>
          {PATHS.slice(0, 5).map((w, i) => (
            <div key={i} className="ws-ep">
              <span className="ws-dot ws-dot-round" data-tone="off" />
              <span className="ds-method">
                <Line w="3.6em" />
              </span>
              <code>
                <Line w={w} />
              </code>
              <span className="ws-ep-spec">
                <Line w="1.8em" />
              </span>
            </div>
          ))}
        </div>
        <div className="ws-side-block" style={{ marginTop: "var(--space-4)" }}>
          <span className="ds-kicker ws-skel-label">Last 24 hours</span>
          <div className="ws-count-line">
            <span className="ws-figure-num">
              <Line w="1.2em" />
            </span>
          </div>
          <Block h={44} />
        </div>
      </aside>

      <section className="ws-detail">
        <div className="ws-detail-head">
          <div className="ws-title-row">
            {/* An h1, as on the page, for the heading's line height. */}
            <h1 className="ws-title">
              <span className="ws-title-method">
                <Line w="2.2em" />
              </span>
              <code>
                <Line w="6.5em" />
              </code>
            </h1>
            <div className="ws-title-side">
              <Block w={110} h={24} />
            </div>
          </div>
          <p className="ws-spec-note">
            <Line w="min(19em, 100%)" />
          </p>
          <div className="ws-url-row">
            <code>
              <Line w="min(24em, 100%)" />
            </code>
            <div className="ws-btn-group">
              <Block w={78} h={33} />
              <Block w={112} h={33} />
            </div>
          </div>
        </div>

        <div>
          <div className="ws-field-head">
            <span className="ds-kicker ws-skel-label">Response body</span>
            <span style={{ flex: 1 }} />
            <Block w={86} h={30} />
          </div>
          <Block h={396} />
          <p className="ws-field-note">
            <Line w="min(46em, 100%)" />
          </p>
        </div>

        <div className="ws-controls">
          {(
            [
              ["Status", [4, 1, 7, 3]],
              ["Delay", null],
              ["Failure rate", null],
            ] as const
          ).map(([label, chipRows]) => (
            <div key={label} className="ws-control">
              <div className="ws-control-figure">
                <span className="ds-kicker ws-skel-label">{label}</span>
                <div className="ws-big">
                  <Line w="1.6em" />
                </div>
                <span>
                  <Line w="9em" />
                </span>
              </div>
              <div className="ws-control-body">
                {chipRows ? (
                  chipRows.map((n, i) => (
                    <div key={i} className="ws-chips">
                      <span>
                        <Line w="5em" />
                      </span>
                      <Chips n={n} />
                    </div>
                  ))
                ) : (
                  <>
                    <div className="ws-skel-track">
                      <span className="ws-skel" />
                    </div>
                    <div className="ws-range-scale">
                      <Line w="100%" />
                    </div>
                    <div className="ws-chips">
                      <span>
                        <Line w="4.5em" />
                      </span>
                      <Chips n={label === "Delay" ? 6 : 8} />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Loading>
  );
}

/** The log's rows, shared by the page skeleton. */
function LogRows({ n = 10 }: { n?: number }) {
  return (
    <div className="ws-log-list">
      <div className="ws-log-grid ws-log-cols">
        <span>Status</span>
        <span>Method</span>
        <span>Path</span>
        <span>Time</span>
        <span>When</span>
      </div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="ws-log-row ws-log-grid">
          <span className="ws-log-status">
            <span className="ws-dot" data-tone="off" />
            <Line w="1.8em" />
          </span>
          <span className="ds-method">
            <Line w="3em" />
          </span>
          <span className="ws-log-path">
            <code>
              <Line w={PATHS[i % PATHS.length]} />
            </code>
          </span>
          <span className="ws-log-ms">
            <Line w="2.6em" />
          </span>
          <span className="ws-log-ago">
            <Line w="1.6em" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function LogSkeleton() {
  return (
    <Loading label="Loading the request log">
      <div className="ws-log-head">
        <div>
          <h1 className="ws-display">Request log</h1>
          <p className="ws-lede">
            Every call to this workspace, newest first, with what was sent, which route answered and what went back.
          </p>
        </div>
        <div className="ws-stats">
          {["requests", "errors", "unmatched", "slowest"].map((label) => (
            <div key={label} className="ws-stat">
              <span className="ws-figure-num">
                <Line w="1.5em" />
              </span>
              <span className="ws-skel-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ws-toolbar ws-log-toolbar">
        <Block w={340} h={36} />
        <span className="ws-skel" style={{ flex: "1 1 220px", maxWidth: 340, height: 42 }} />
        <span style={{ flex: 1 }} />
        <Block w={100} h={33} />
      </div>

      <div className="ws-log-body">
        <LogRows />
        <article className="ws-log-detail ws-skel-detail" style={{ position: "static" }}>
          <div className="ws-stack">
            <div className="ws-ld-title">
              <span>
                <Line w="2.4em" />
              </span>
              <code>
                <Line w="6em" />
              </code>
            </div>
            <div className="ws-ld-line">
              <Line w="16em" />
            </div>
            <p className="ws-ld-explain">
              <Line w="min(22em, 100%)" />
            </p>
            <div className="ws-btn-group" style={{ marginTop: "var(--space-2)" }}>
              <Block w={130} h={33} />
              <Block w={92} h={33} />
            </div>
          </div>
          <div className="ws-ld-section">
            <span className="ds-kicker ws-skel-label">Timing</span>
            <Block h={12} />
            <div className="ws-timing-legend">
              <Line w="11em" />
              <Line w="12em" />
            </div>
          </div>
          <div className="ws-ld-section">
            <span className="ds-kicker ws-skel-label">Request</span>
            <KeyValueRows />
          </div>
        </article>
      </div>
    </Loading>
  );
}

/** Rows of a key/value table still on their way: the request log's headers. */
export function KeyValueRows({ n = 5 }: { n?: number }) {
  return (
    <table className="ds-table ws-kv" aria-hidden="true">
      <tbody>
        {Array.from({ length: n }, (_, i) => (
          <tr key={i}>
            <td>
              <Line w={["4em", "6em", "5em", "8em", "4.5em"][i % 5]} />
            </td>
            <td>
              <Line w={["8em", "12em", "5em", "10em", "7em"][i % 5]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Each group's rows: the title and description as the page draws them. */
const SETTINGS_GROUPS: [string, [string, string][]][] = [
  [
    "Workspace",
    [
      ["Name", SETTINGS_NOTES.name],
      ["Base URL", SETTINGS_NOTES.baseUrl],
      ["Key", SETTINGS_NOTES.key],
      ["Lifetime", SETTINGS_NOTES.lifetime],
    ],
  ],
  [
    "Endpoints",
    [
      ["Export", SETTINGS_NOTES.export],
      ["Import", SETTINGS_NOTES.import],
    ],
  ],
  [
    "Danger zone",
    [
      ["Clear the request log", clearLogNote(0)],
      ["Delete this workspace", SETTINGS_NOTES.delete],
    ],
  ],
];

export function SettingsSkeleton() {
  return (
    <Loading label="Loading settings" className="ws-settings">
      <div className="ws-log-head">
        <div>
          <h1 className="ws-display">Settings</h1>
          <p className="ws-lede">The workspace&apos;s name and address, what&apos;s in it, and how to take it down.</p>
        </div>
        <div className="ws-stats">
          {[
            ["1em", "endpoints"],
            ["1.4em", "requests in 24 h"],
            ["3.4em", null],
            ["2.2em", null],
          ].map(([w, label], i) => (
            <div key={i} className="ws-stat">
              <span className="ws-figure-num">
                <Line w={w!} />
              </span>
              <span className="ws-skel-label">{label ?? <Line w="7em" />}</span>
            </div>
          ))}
        </div>
      </div>

      {SETTINGS_GROUPS.map(([group, rows]) => (
        <section key={group} className="ws-set-group" data-tone={group === "Danger zone" ? "danger" : undefined}>
          <h2 className="ds-kicker ws-set-kicker">{group}</h2>
          {rows.map(([title, note]) => (
            <div key={title} className="ws-set-row">
              <div className="ws-set-label">
                <h3 className="ws-set-title ws-skel-label">{title}</h3>
                <p>{note}</p>
              </div>
              <div className="ws-set-body">
                {title === "Name" ? (
                  <Block w="min(520px, 100%)" h={46} />
                ) : title === "Import" ? (
                  <Block w="min(520px, 100%)" h={64} />
                ) : (
                  <Block w={title === "Base URL" ? "min(380px, 100%)" : 170} h={title === "Base URL" ? 50 : 38} />
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </Loading>
  );
}

/** The workspace list's table, before the workspaces arrive. */
export function WorkspacesSkeleton() {
  return (
    <Loading label="Loading your workspaces">
      <div className="ws-index-head">
        <div>
          <h1 className="ws-index-title">Workspaces</h1>
          <p className="ws-lede">
            Each workspace is a set of mock endpoints under one shared base URL. Make one per project, or one per API
            surface you&apos;re building against.
          </p>
        </div>
        <Block w={190} h={46} />
      </div>
      <div className="ws-toolbar ws-index-toolbar">
        <Block w={250} h={36} />
        <span className="ws-summary">
          <Line w="13em" />
        </span>
      </div>
      <div className="ws-table-wrap">
        <table className="ds-table ws-index-table">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Key</th>
              <th style={{ textAlign: "right" }}>Endpoints</th>
              <th>Created · lifetime</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {["8em", "6em", "9.5em"].map((w, i) => (
              <tr key={i}>
                <td>
                  <span className="ws-index-name">
                    <Line w={w} />
                  </span>
                  <div className="ws-index-base">
                    <Line w="13em" />
                  </div>
                </td>
                <td>
                  <div className="ws-index-key">
                    <code>
                      <Line w="3.6em" />
                    </code>
                    <Block w={34} h={34} />
                  </div>
                </td>
                <td className="ws-index-count">
                  <Line w="1em" />
                </td>
                <td>
                  <div className="ws-index-life">
                    <Line w="6em" />
                    <Block w={86} h={22} />
                    <Line w="10em" />
                  </div>
                </td>
                <td>
                  <Block w={64} h={33} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Loading>
  );
}
