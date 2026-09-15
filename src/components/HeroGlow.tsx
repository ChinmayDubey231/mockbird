"use client";

import { useEffect, useRef } from "react";

/** A soft radial highlight that follows the pointer across the hero section. */
export function HeroGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    // The glow sits in a pointer-events:none clipping wrapper (.hero-bg), so
    // track movement on the containing .hero section instead of the
    // immediate parent — otherwise pointer-events:none means the listener
    // never fires and the glow stops following the cursor.
    const parent = el?.closest<HTMLElement>(".hero") ?? el?.parentElement;
    if (!el || !parent) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    parent.addEventListener("pointermove", onMove);
    return () => parent.removeEventListener("pointermove", onMove);
  }, []);

  return <div ref={ref} className="hero-glow" aria-hidden="true" />;
}
