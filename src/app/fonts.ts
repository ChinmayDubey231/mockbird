import { JetBrains_Mono, Libre_Franklin, Newsreader } from "next/font/google";

const heading = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-heading",
  display: "swap",
  // next/font has no fallback metrics for Newsreader to size-match against.
  adjustFontFallback: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});
const body = Libre_Franklin({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
});

/** Sets the Broadsheet families on an element: the serif, the sans and the mono. */
export const fontVariables = `${heading.variable} ${body.variable} ${mono.variable}`;
