"use client";

import { useState } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";

/** The app's one theme control — an animated pill switch, used everywhere. */
export function ThemeSwitch() {
  const [dark, setDark] = useState(true);

  useIsomorphicLayoutEffect(() => {
    // The bootstrap script in the root layout only ever writes data-theme
    // to "dark" (opt-in); an unset attribute means the CSS :root default,
    // which is light. Matching that here keeps the knob/icons in sync with
    // the actual background. Running before paint (rather than in a plain
    // effect) means the button never renders in the wrong state for a
    // visible frame — previously it was hidden behind a placeholder until
    // this ran, which read as the button disappearing on every refresh.
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const set = (next: boolean) => {
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("mockbird.theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!dark}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      title={`Switch to ${dark ? "light" : "dark"}`}
      onClick={() => set(!dark)}
      className="theme-switch"
    >
      <span className="theme-switch-knob" style={{ transform: dark ? "translateX(0)" : "translateX(26px)" }} />
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="theme-switch-icon theme-switch-moon" style={{ opacity: dark ? 0 : 1 }}>
        <path d="M20 14.5A9 9 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="var(--ink-45)" />
      </svg>
      <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="theme-switch-icon theme-switch-sun" style={{ opacity: dark ? 1 : 0 }}>
        <circle cx="12" cy="12" r="4.4" fill="var(--ink-45)" />
        <g stroke="var(--ink-45)" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1.8v2.6" />
          <path d="M12 19.6v2.6" />
          <path d="M1.8 12h2.6" />
          <path d="M19.6 12h2.6" />
          <path d="M4.8 4.8l1.9 1.9" />
          <path d="M17.3 17.3l1.9 1.9" />
          <path d="M19.2 4.8l-1.9 1.9" />
          <path d="M6.7 17.3l-1.9 1.9" />
        </g>
      </svg>
    </button>
  );
}
