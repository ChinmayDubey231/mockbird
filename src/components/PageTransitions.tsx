"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};

/** The longest the old page is held while the next one loads, before fading to whatever is ready. */
const HOLD_MS = 900;

/**
 * Page changes as a cross-fade: the page on screen fades out while the next
 * one fades in over it, with nothing moving. Uses the browser's View
 * Transitions: a click on a link to another page of the app is taken over
 * (Next's <Link> stands down for a click that's already handled, after
 * running its own onClick), and the navigation runs inside a transition that
 * completes once the new path has rendered.
 *
 * Where View Transitions aren't available, the document is marked instead,
 * and the workspace pages dim and settle (see globals.css). With reduced
 * motion, pages simply change.
 */
export function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef<(() => void) | null>(null);

  useEffect(() => {
    let fallbackTimer: number | undefined;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      // Only a move to another page of this app: not a download from the
      // API, not a mock URL, not a jump within the page.
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/m/")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const doc = document as ViewTransitionDocument;
      if (!doc.startViewTransition) {
        document.documentElement.dataset.navigating = "true";
        window.clearTimeout(fallbackTimer);
        fallbackTimer = window.setTimeout(() => delete document.documentElement.dataset.navigating, 8000);
        return;
      }

      e.preventDefault();
      const root = document.documentElement;
      root.dataset.pageTransition = "true";
      const transition = doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            done.current = resolve;
            router.push(url.pathname + url.search + url.hash);
            // A slow page must not hold the screen: fade to whatever is showing
            // (its skeleton, usually) and let the rest arrive in place.
            window.setTimeout(resolve, HOLD_MS);
          })
      );
      transition.finished.finally(() => delete root.dataset.pageTransition);
    };

    // Capture, so this runs before React's handlers and <Link> sees the click as handled.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(fallbackTimer);
    };
  }, [router]);

  useEffect(() => {
    // The new path has rendered: let the transition capture it, and lift
    // the fallback's dimming.
    done.current?.();
    done.current = null;
    delete document.documentElement.dataset.navigating;
  }, [pathname]);

  return null;
}
