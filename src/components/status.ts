export function statusClass(code: number): string {
  if (code >= 500) return "status-server";
  if (code >= 400) return "status-client";
  return "status-ok";
}

export function statusColor(code: number): string {
  if (code >= 500) return "var(--server-err)";
  if (code >= 400) return "var(--client-err)";
  return "var(--ok)";
}

export function relativeTime(iso: string | Date): string {
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
