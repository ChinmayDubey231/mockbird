"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceTabs({ workspaceKey }: { workspaceKey: string }) {
  const pathname = usePathname();
  const base = `/w/${workspaceKey}`;

  const tabs = [
    { href: base, label: "Endpoints" },
    { href: `${base}/logs`, label: "Request log" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        gap: 2,
        padding: "0 20px",
        borderBottom: "1px solid var(--rule)",
        background: "var(--surface)",
      }}
    >
      {tabs.map((tab) => {
        const on = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            style={{
              padding: "9px 12px",
              fontSize: 13,
              color: on ? "var(--ink)" : "var(--ink-55)",
              borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
              textDecoration: "none",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
