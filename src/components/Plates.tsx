const PLATES = ["c", "m", "y"] as const;

/**
 * A display line printed as three misregistered process plates, in the
 * workspace's design system. The paper span carries the text once, for
 * reading and selecting; the plates are aria-hidden repeats that multiply
 * over it, black where all three overlap.
 */
export function PlateText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`ds-cmyk-head ${className}`}>
      <span className="ds-paper">{children}</span>
      {PLATES.map((plate) => (
        <span key={plate} className={`ds-plate ds-plate-${plate}`} aria-hidden="true">
          {children}
        </span>
      ))}
    </span>
  );
}
