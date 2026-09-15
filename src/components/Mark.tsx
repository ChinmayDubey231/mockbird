export function Mark() {
  return (
    <span className="mark">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
        <path d="M3 5.5 L13.5 5.5 L21 12 L13.5 18.5 L3 18.5 L8.5 12 Z" fill="var(--surface)" />
        <path d="M10.6 12 L15 9.4 L15 14.6 Z" fill="var(--accent)" />
      </svg>
    </span>
  );
}
