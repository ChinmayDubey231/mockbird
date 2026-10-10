/**
 * The theme preference. The root layout's inline script reads the same key
 * back before first paint, so every page agrees on it. The edition toggle
 * in each page's header is the one control that writes it.
 */

export type Theme = "light" | "dark";

const KEY = "mockbird.theme";

/** An unset data-theme means the CSS :root default, which is light. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
}
