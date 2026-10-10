const PLATES = ["c", "m", "y"] as const;
const TINTS = [100, 60, 30];

/** A printer's colour bar, as at the foot of a press proof: a registration mark, then each ink at three tints. */
export function ColorBar() {
  return (
    <div className="bs-colorbar" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: "block", flex: "none" }}>
        <circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M9 0v18M0 9h18" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      {[...PLATES, "k" as const].map((plate) => (
        <span key={plate} className="bs-colorbar-ink">
          {TINTS.map((tint) => (
            <span key={tint} style={{ background: `color-mix(in srgb, var(--plate-${plate}) ${tint}%, transparent)` }} />
          ))}
        </span>
      ))}
    </div>
  );
}

/**
 * Text printed the way a newspaper prints it: the black plate in normal flow,
 * with cyan, magenta and yellow copies over it, slightly out of register. The
 * copies are aria-hidden and unselectable, so it reads and copies as one string.
 */
/** A big figure number in one process ink, its black plate slipped out of register behind it. */
export function Numeral({ children, ink }: { children: string; ink: (typeof PLATES)[number] }) {
  return (
    <span className="bs-numeral" data-ink={ink}>
      <span className="bs-numeral-key" aria-hidden="true">
        {children}
      </span>
      <span className="bs-numeral-ink">{children}</span>
    </span>
  );
}

export function Cmyk({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`bs-cmyk ${className}`}>
      <span>{children}</span>
      {PLATES.map((plate) => (
        <span key={plate} className={`bs-plate bs-plate-${plate}`} aria-hidden="true">
          {children}
        </span>
      ))}
    </span>
  );
}
