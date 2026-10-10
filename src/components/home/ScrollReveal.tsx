"use client";

import { useEffect } from "react";

const EASE = "cubic-bezier(0.22, 0.7, 0.2, 1)";

/**
 * Lifts each section below the fold into place the first time it scrolls
 * into view. Anything on screen at load is left alone, and nothing is hidden
 * until this has run, so the server-rendered page is complete without it.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      return;
    }
    const page = document.querySelector(".bs-page");
    if (!page) return;

    const fold = window.innerHeight * 0.92;
    const sections = Array.from(page.querySelectorAll<HTMLElement>("main > section:not(#hero), footer")).filter(
      (el) => el.getBoundingClientRect().top > fold
    );

    // Paused at their first frame, with fill: backwards holding them hidden
    // until they play. The states section staggers its heading and articles.
    const pending = new Map<Element, Animation[]>();
    for (const section of sections) {
      const parts =
        section.id === "states"
          ? [section.firstElementChild, ...Array.from(section.querySelectorAll("article"))]
          : [section];
      const animations = parts
        .filter((el): el is Element => el !== null)
        .map((el, i) => {
          const a = el.animate(
            [
              { opacity: 0, transform: "translateY(28px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 760, delay: 110 * i, easing: EASE, fill: "backwards" }
          );
          a.pause();
          return a;
        });
      pending.set(section, animations);
    }

    const play = (el: Element) => {
      pending.get(el)?.forEach((a) => a.play());
      pending.delete(el);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          play(entry.target);
        }
      },
      { threshold: 0.08 }
    );
    sections.forEach((s) => io.observe(s));

    // A fast fling can carry a section past before the observer reports it.
    const onScroll = () =>
      pending.forEach((_, el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) play(el);
      });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      pending.forEach((animations) => animations.forEach((a) => a.cancel()));
    };
  }, []);

  return null;
}
