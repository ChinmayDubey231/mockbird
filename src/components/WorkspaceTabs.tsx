"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The workspace's sections, set as small capitals in the rail. The underline
 * moves the moment a tab is clicked, not once the next page has rendered, so
 * switching feels immediate; aria-current still follows the URL.
 */
export function WorkspaceTabs({ workspaceKey }: { workspaceKey: string }) {
  const pathname = usePathname();
  const base = `/w/${workspaceKey}`;
  const [pending, setPending] = useState<string | null>(null);

  const tabs = [
    { href: base, label: "Endpoints" },
    { href: `${base}/logs`, label: "Request log" },
    { href: `${base}/settings`, label: "Settings" },
  ];
  const shown = pending ?? pathname;

  useEffect(() => setPending(null), [pathname]);

  return (
    <nav className="ws-tabs" aria-label="Workspace">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="ws-tab"
          data-active={tab.href === shown}
          aria-current={tab.href === pathname ? "page" : undefined}
          onClick={(e) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            setPending(tab.href);
          }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
