/**
 * The app's icons: a stroke plus a 20% fill, for a duotone look without an
 * icon font. Sized in px and coloured by currentColor.
 */

function Icon({ size = 18, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flex: "none" }}
    >
      {children}
    </svg>
  );
}

const tone = { fill: "currentColor", fillOpacity: 0.2, stroke: "none" };

export function ArrowRightIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </Icon>
  );
}

export function TimerIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="13.5" r="7.5" {...tone} />
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.5" />
      <path d="M9.5 2.75h5" />
    </Icon>
  );
}

export function LightningIcon({ size }: { size?: number }) {
  const bolt = "M13.5 2.75 5.5 13.25h6l-1 8 8-10.5h-6l1-8Z";
  return (
    <Icon size={size}>
      <path d={bolt} {...tone} />
      <path d={bolt} />
    </Icon>
  );
}

export function CopyIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5" {...tone} />
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5" />
      <path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3" />
    </Icon>
  );
}

export function CheckIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function CheckCircleIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="12" r="9" {...tone} />
      <circle cx="12" cy="12" r="9" />
      <path d="m8.25 12.25 2.5 2.5 5-5" />
    </Icon>
  );
}

export function ArrowClockwiseIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 3.75v4.5H15" />
    </Icon>
  );
}

export function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** The bird mark knocked out of an ink square, with the accent as its eye. */
export function BrandMark({ box, glyph }: { box: number; glyph: number }) {
  return (
    <span className="bs-mark" style={{ width: box, height: box }}>
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
        <path d="M3 5.5 L13.5 5.5 L21 12 L13.5 18.5 L3 18.5 L8.5 12 Z" fill="var(--color-bg)" />
        <path d="M10.6 12 L15 9.4 L15 14.6 Z" fill="var(--color-accent)" />
      </svg>
    </span>
  );
}
