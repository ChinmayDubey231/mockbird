"use client";

/**
 * The logo link. It points at "/" so it works without JavaScript and opens
 * the home page in a new tab when asked to, but on a plain click — we're
 * already home — it scrolls back to the very top, masthead included, and
 * drops any #section the URL picked up on the way down.
 */
export function TopLink({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  return (
    <a href="/" className={className} style={style} onClick={onClick}>
      {children}
    </a>
  );
}
