"use client";

import { useEffect, useState } from "react";

/**
 * Whether a media query matches, kept up to date as the window resizes. It
 * reads false on the server and in the first render, so markup that depends
 * on it should be something that's fine to swap in after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}
