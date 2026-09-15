"use client";

import { useRef } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";

/**
 * Matches the height of every ".feature-card" inside it. Plain CSS grid
 * stretch only aligns cards that share a row — once the grid drops to one
 * column (or the cards land two-and-one across rows), each card is left at
 * its own content height, and cards with more content (extra chips, a code
 * block) end up visibly taller. This measures every card's natural height
 * and re-applies the max as min-height, redoing it on resize since which
 * card is tallest — and by how much — depends on how the text wraps at the
 * current column width.
 */
export function EqualHeightCards({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    const equalize = () => {
      const cards = Array.from(container.querySelectorAll<HTMLElement>(".feature-card"));
      if (cards.length < 2) return;
      cards.forEach((c) => {
        c.style.minHeight = "";
      });
      const max = Math.max(...cards.map((c) => c.getBoundingClientRect().height));
      cards.forEach((c) => {
        c.style.minHeight = `${max}px`;
      });
    };

    equalize();
    document.fonts?.ready?.then(equalize).catch(() => {});

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(equalize);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        marginTop: 24,
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
      }}
    >
      {children}
    </div>
  );
}
