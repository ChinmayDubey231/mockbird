"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Browser back and forward restore a page from Next's client cache exactly
 * as it was left, and staleTimes doesn't change that. The workspace pages
 * show data that changes elsewhere (a request lands, a workspace is made
 * from the home page, the log is cleared on another tab), so after such a
 * navigation onto one of them, read it again from the server.
 *
 * Lives in the root layout, the one component that stays mounted across
 * every navigation, so it sees the popstate and the route change after it.
 */
export function FreshOnHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const popped = useRef(false);

  useEffect(() => {
    let reset: number | undefined;
    const onPop = () => {
      popped.current = true;
      // A popstate that only changes the hash leaves the path alone, and
      // must not trigger a refresh on some later, ordinary navigation.
      window.clearTimeout(reset);
      reset = window.setTimeout(() => {
        popped.current = false;
      }, 1000);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.clearTimeout(reset);
    };
  }, []);

  useEffect(() => {
    if (!popped.current) return;
    popped.current = false;
    if (pathname.startsWith("/w")) router.refresh();
  }, [pathname, router]);

  return null;
}
