import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { EditionToggle } from "./EditionToggle";
import { BrandMark } from "./icons";

const REPO = "https://github.com/ChinmayDubey231/mockbird";

function Brand() {
  return (
    <Link href="/" className="ds-brand" aria-label="Mockbird home">
      <BrandMark />
      <span className="ds-brand-name">Mockbird</span>
    </Link>
  );
}

/** The header outside a workspace: the workspace list and the 404. */
export function SiteHeader({ current }: { current?: "workspaces" }) {
  return (
    <header className="ds-header">
      <nav className="ds-shell ds-nav" aria-label="Main">
        <Brand />
        <a href={`${REPO}#readme`} className="ds-hide-sm">
          Docs
        </a>
        <Link
          href="/w"
          className={current === "workspaces" ? "ds-nav-current" : undefined}
          aria-current={current === "workspaces" ? "page" : undefined}
        >
          My workspaces
        </Link>
        <EditionToggle />
      </nav>
    </header>
  );
}

/**
 * Inside a workspace: a crumb trail back to the list, then the base URL
 * every endpoint hangs off. It never wraps; the trail's last crumb gives way
 * first, then the base URL on a narrow screen.
 */
export function WorkspaceHeader({ name, base, workspaceKey }: { name: string; base: string; workspaceKey: string }) {
  return (
    <header className="ds-header">
      <nav className="ds-shell ds-nav ws-nav" aria-label="Main">
        <Brand />
        <span className="ws-crumb-sep" aria-hidden="true">
          /
        </span>
        <Link href="/w" className="ws-crumb">
          Workspaces
        </Link>
        <span className="ws-crumb-sep" aria-hidden="true">
          /
        </span>
        <span className="ws-crumb-name" title={name}>
          {name}
        </span>
        <span className="ws-spacer" />
        <div className="ws-base ws-hide-md">
          <code title={base}>/m/{workspaceKey}</code>
          <CopyButton value={base} label="Copy base URL" variant="ghost" />
        </div>
        <EditionToggle />
      </nav>
    </header>
  );
}

/** The thick-thin rules round a strip of small capitals. */
export function Rail({ children, end }: { children: React.ReactNode; end?: React.ReactNode }) {
  return (
    <div className="ds-shell">
      <div className="ds-rail">
        <div className="ds-rail-row">
          {children}
          {end && <span className="ds-rail-end">{end}</span>}
        </div>
      </div>
    </div>
  );
}

/** One line under the page, with the warning every workspace needs. */
export function AppFooter({ links = false }: { links?: boolean }) {
  return (
    <footer className="ds-shell ws-footer">
      <div className="ws-footer-row">
        <span>Mocks are public to anyone who has the workspace key. Don&apos;t put real data in them.</span>
        {links && (
          <nav className="ws-footer-links" aria-label="Footer">
            <a href={REPO}>GitHub</a>
            <span>© {new Date().getFullYear()} Mockbird</span>
          </nav>
        )}
      </div>
    </footer>
  );
}
