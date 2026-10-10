import type { Metadata } from "next";
import Link from "next/link";
import { AppFooter, SiteHeader } from "@/components/AppChrome";
import { PlateText } from "@/components/Plates";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="ds-page">
      <SiteHeader />
      <div className="ds-shell">
        <div className="ds-rail">
          <div className="ds-rail-row">
            <span style={{ fontWeight: 600 }}>404</span>
          </div>
        </div>
      </div>

      <main className="ds-shell ws-main">
        <div className="ws-lost">
          <h1>
            <PlateText className="ws-lost-em">Nothing here.</PlateText>
          </h1>
          <p>
            That workspace doesn&apos;t exist, or it belongs to someone else. Mock URLs live under{" "}
            <code style={{ fontSize: "0.85em" }}>/m/</code>; this is the dashboard.
          </p>
          <Link className="ds-btn ds-btn-primary ds-btn-lg" href="/w">
            My workspaces
          </Link>
        </div>
      </main>

      <AppFooter links />
    </div>
  );
}
