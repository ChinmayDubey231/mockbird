const common = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ClockIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg {...common}>
      <path d="M12 4 21 19H3Z" />
      <path d="M12 10.5v3.4" />
      <circle cx="12" cy="16.6" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RouteIcon() {
  return (
    <svg {...common}>
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <path d="M8.1 16.8 15 8.9" />
      <path d="M15 8.9h3.2v3.2" />
    </svg>
  );
}

export function StackIcon() {
  return (
    <svg {...common}>
      <path d="M12 4 20.5 8.5 12 13 3.5 8.5Z" />
      <path d="M3.5 13 12 17.5 20.5 13" />
      <path d="M3.5 17 12 21.5 20.5 17" />
    </svg>
  );
}
