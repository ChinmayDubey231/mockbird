import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/Mark";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="shell" style={{ maxWidth: 560, paddingTop: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mark />
        <span className="wordmark">Mockbird</span>
      </div>
      <h2 style={{ marginTop: 24 }}>Nothing here</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        That workspace doesn&apos;t exist, or it belongs to someone else. Mock URLs live under{" "}
        <code className="mono">/m/</code> — this is the dashboard.
      </p>
      <Link className="btn" style={{ display: "inline-block", marginTop: 16 }} href="/w">
        My workspaces
      </Link>
    </main>
  );
}
