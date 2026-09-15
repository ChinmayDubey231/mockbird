import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreakableUrl } from "@/components/BreakableUrl";
import { Mark } from "@/components/Mark";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { CopyButton } from "@/components/CopyButton";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { mockUrl, workspaceForViewer } from "@/lib/workspace";

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) return {};
  return { title: { template: `%s · ${workspace.name}`, default: workspace.name } };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { key: string };
}) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();

  const base = mockUrl(workspace.key);

  return (
    <>
      {/*
        This header carries a variable-length, user-supplied workspace name —
        unlike the plain topbars elsewhere, it can't just rely on flex-wrap to
        drop overflow onto a second line (wrapping decides line breaks off
        each item's full content width, before any shrinking is applied, so
        a long name would wrap the whole row instead of truncating). Forcing
        nowrap and giving every other item flex:none makes the name the only
        thing that shrinks, so it ellipsizes instead of wrapping anything.
      */}
      <header className="topbar" style={{ flexWrap: "nowrap" }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit", flex: "none" }}
        >
          <Mark />
          <span className="wordmark">Mockbird</span>
        </Link>
        <span style={{ color: "var(--ink-35)", flex: "none" }}>/</span>
        <span
          style={{
            fontWeight: 500,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {workspace.name}
        </span>

        <span style={{ flex: 1, minWidth: 0 }} />

        <span className="base-url-pill">
          <code className="mono muted topbar-base-url" style={{ fontSize: 12 }}>
            <BreakableUrl value={base} />
          </code>
          <CopyButton value={base} label="Copy base URL" variant="ghost" hideLabelOnNarrow />
        </span>
        <ThemeSwitch />
      </header>

      <WorkspaceTabs workspaceKey={workspace.key} />

      <main className="shell" style={{ maxWidth: "none" }}>{children}</main>

      <footer className="muted small" style={{ marginTop: 40, padding: "16px 20px", borderTop: "1px solid var(--rule)" }}>
        Mocks are public to anyone who has the workspace key. Don&apos;t put real data in them.
      </footer>
    </>
  );
}
