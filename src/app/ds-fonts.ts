import { Source_Serif_4 } from "next/font/google";

/**
 * Source Serif 4, the design system's one family, for the workspace pages.
 * It goes on <body> from the root layout, since a 404 thrown inside a
 * workspace renders without that route's CSS. It isn't preloaded, so the home
 * page, which keeps its own families and never uses this one, doesn't fetch
 * it. The mono comes from fonts.ts.
 */
const serif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const dsFont = serif.variable;
