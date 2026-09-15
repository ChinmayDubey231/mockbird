import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { Mark } from "@/components/Mark";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { NewWorkspaceButton } from "@/components/NewWorkspaceButton";
import { CopyButton } from "@/components/CopyButton";
import { StackIcon } from "@/components/FeatureIcons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspaceIndex() {
  const user = await currentUser();
  const workspaces = user
    ? await prisma.workspace.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { endpoints: true } } },
      })
    : [];

  const totalEndpoints = workspaces.reduce((sum, w) => sum + w._count.endpoints, 0);

  return (
    <>
      <header className="topbar">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit" }}>
          <Mark />
          <span className="wordmark">Mockbird</span>
        </Link>
        <span style={{ flex: 1 }} />
        <ThemeSwitch />
      </header>

      <main className="shell" style={{ maxWidth: 1040 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            margin: "32px 0 8px",
          }}
        >
          <div>
            <h2>Workspaces</h2>
            <p className="muted" style={{ marginTop: 8, maxWidth: "52ch", fontSize: 14.5 }}>
              Each workspace is a set of mock endpoints under one shared base URL — one per project,
              or one per API surface you&apos;re building against.
            </p>
          </div>
          <div style={{ flex: "none", paddingTop: 2 }}>
            <NewWorkspaceButton />
          </div>
        </div>

        {workspaces.length > 0 && (
          <div className="small muted" style={{ margin: "14px 0 20px" }}>
            {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"} ·{" "}
            {totalEndpoints} {totalEndpoints === 1 ? "endpoint" : "endpoints"} total
          </div>
        )}

        {workspaces.length === 0 ? (
          <div
            className="panel"
            style={{
              marginTop: 20,
              padding: "64px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              borderStyle: "dashed",
              borderRadius: 10,
            }}
          >
            <span className="feature-icon" style={{ marginBottom: 16, width: 44, height: 44 }}>
              <StackIcon />
            </span>
            <h3 style={{ fontSize: 16 }}>No workspaces yet</h3>
            <p className="muted small" style={{ marginTop: 6, maxWidth: "38ch" }}>
              A workspace holds a set of endpoints and gives them a shared base URL. Create one to
              get your first mock live.
            </p>
            <div style={{ marginTop: 20 }}>
              <NewWorkspaceButton />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {workspaces.map((w) => (
              <div
                key={w.id}
                className="feature-card"
                style={{ display: "flex", flexDirection: "column", height: "100%" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span className="feature-icon" style={{ marginBottom: 0, flex: "none" }}>
                    <StackIcon />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/w/${w.key}`}
                      style={{
                        display: "block",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "var(--ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {w.name}
                    </Link>
                    {w.expiresAt && (
                      <div className="small" style={{ color: "var(--client-err)", marginTop: 2 }}>
                        expires {w.expiresAt.toISOString().slice(0, 10)}
                      </div>
                    )}
                  </div>
                  <span
                    className="count-pill"
                    style={{ flex: "none" }}
                    title={`${w._count.endpoints} ${w._count.endpoints === 1 ? "endpoint" : "endpoints"}`}
                  >
                    {w._count.endpoints}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                  <code className="mono small muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {w.key}
                  </code>
                  <span style={{ flex: 1, minWidth: 0 }} />
                  <CopyButton value={w.key} label="Copy" />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                    paddingTop: 14,
                    borderTop: "1px solid var(--rule-soft)",
                  }}
                >
                  <span className="small muted">{w.createdAt.toISOString().slice(0, 10)}</span>
                  <Link href={`/w/${w.key}`} className="small" style={{ fontWeight: 500 }}>
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
