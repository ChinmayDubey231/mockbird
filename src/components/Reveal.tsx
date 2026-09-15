"use client";

import { useEffect, useRef, useState } from "react";

/** Fades and lifts its children in once they scroll into view. */
export function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={
        reduced
          ? undefined
          : {
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(16px)",
              transition: `opacity 560ms ease ${delay}ms, transform 560ms ease ${delay}ms`,
            }
      }
    >
      {children}
    </div>
  );
}
