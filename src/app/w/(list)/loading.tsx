import { AppFooter, Rail, SiteHeader } from "@/components/AppChrome";
import { WorkspacesSkeleton } from "@/components/Skeletons";

// The list page draws its own header and footer, so its loading state does
// too: only the table waits. The route group keeps this from also showing
// while a workspace itself is opening, which has skeletons of its own.
export default function Loading() {
  return (
    <div className="ds-page">
      <SiteHeader current="workspaces" />
      <Rail end={<span className="ds-hide-sm">Demo workspaces expire 24 hours after they&apos;re created</span>}>
        <span style={{ fontWeight: 600 }}>Your workspaces</span>
      </Rail>
      <main className="ds-shell ws-main">
        <WorkspacesSkeleton />
      </main>
      <AppFooter links />
    </div>
  );
}
