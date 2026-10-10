import type { Metadata } from "next";
import { dsFont } from "./ds-fonts";
import { fontVariables } from "./fonts";
import { FreshOnHistory } from "@/components/FreshOnHistory";
import { PageTransitions } from "@/components/PageTransitions";
// The home page's styles, then the workspace's design system and its
// additions. The two systems are fenced off from each other: see the top of
// landing-base.css and design-system.css.
import "./landing-base.css";
import "./broadsheet.css";
import "./design-system.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mockbird — instant mock APIs",
    template: "%s · Mockbird",
  },
  description:
    "Describe an API in English, get a live mock endpoint in five seconds, with latency and failure injection built in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The inline script sets data-theme before React hydrates, so the
    // attribute is expected to differ from the server's HTML.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mockbird.theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.dataset.theme='dark'}catch(e){}`,
          }}
        />
      </head>
      {/* The font variables go on body, not html: broadsheet.css sets fallback
          values for them on :root, and a class there would only tie with it. */}
      <body className={`${fontVariables} ${dsFont}`}>
        {children}
        <FreshOnHistory />
        <PageTransitions />
      </body>
    </html>
  );
}
