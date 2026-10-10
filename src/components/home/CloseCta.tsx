"use client";

import { useState } from "react";
import { useDemo } from "./DemoContext";
import { OpenWorkspaceButton } from "./OpenWorkspaceButton";

const FALLBACK = "A paginated list of invoices with due dates";

/**
 * The closing call to action. It doesn't create anything itself: it hands the
 * description to the demo card, scrolls back up to it and presses Create
 * there, so the visitor watches the same steps and gets the same endpoint.
 */
export function CloseCta() {
  const { setDescription, create } = useDemo();
  const [text, setText] = useState("");

  const go = () => {
    const description = text.trim() || FALLBACK;
    setDescription(description);
    setText("");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const card = document.getElementById("try");
    if (card) {
      window.scrollTo({
        top: card.getBoundingClientRect().top + window.scrollY - 100,
        behavior: reduced ? "auto" : "smooth",
      });
    }
    window.setTimeout(() => create(description), reduced ? 0 : 700);
  };

  return (
    <div className="bs-col-7" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div className="bs-row">
        <input
          className="bs-input"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) go();
          }}
          aria-label="Describe your first endpoint"
          placeholder="Describe your first endpoint, e.g. invoices with due dates"
          style={{ minHeight: 48 }}
        />
        <button type="button" className="bs-btn bs-btn-primary" onClick={go} style={{ minHeight: 48, fontSize: 16 }}>
          Create endpoint
        </button>
      </div>
      <div className="bs-row" style={{ gap: "var(--space-1) var(--space-4)" }}>
        <span className="bs-muted" style={{ fontSize: 16 }}>
          Five endpoints free, no card.
        </span>
        <OpenWorkspaceButton label="Or open an empty workspace" />
      </div>
    </div>
  );
}
