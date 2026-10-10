"use client";

import { useState } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
import { applyTheme, currentTheme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

/** The day and night editions: the app's one theme control, in every page's header. */
export function EditionToggle() {
  const [dark, setDark] = useState(false);

  useIsomorphicLayoutEffect(() => {
    // Only the label depends on this — the icon is picked by CSS from
    // data-theme, so it's already right before this runs.
    setDark(currentTheme() === "dark");
  }, []);

  const toggle = () => {
    const apply = () => {
      applyTheme(dark ? "light" : "dark");
      setDark(!dark);
    };
    const doc = document as ViewTransitionDocument;
    // Cross-fade the whole page between editions where the browser can.
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  };

  const label = dark ? "Switch to the day edition" : "Switch to the night edition";
  return (
    <button
      type="button"
      className="ds-btn ds-btn-secondary ds-btn-icon ds-edition"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <span className="ds-icon-moon">
        <MoonIcon size={20} />
      </span>
      <span className="ds-icon-sun">
        <SunIcon size={20} />
      </span>
    </button>
  );
}
