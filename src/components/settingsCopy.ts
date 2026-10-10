/**
 * The settings page's descriptions. Its loading skeleton draws the same
 * text, so each row wraps to the same height in both and nothing moves when
 * the page arrives. A plain module rather than part of Settings.tsx, which is
 * a client component the skeleton (a server component) can't read values from.
 */
export const SETTINGS_NOTES = {
  name: "Shown in the header and in your list of workspaces. Saved as you type.",
  baseUrl: "Every endpoint here hangs off it. Anyone who has it can call the mocks, so don't put real data in them.",
  key: "The six characters that make the URL this workspace's own. Rotating it gives the workspace a new one, and every URL built on the old key stops working at once.",
  lifetime:
    "Workspaces made on the home page are demos, and are removed 24 hours after they're created. Ones you make here are kept.",
  export:
    "Every endpoint, with its body, status, delay and failure settings, in one JSON file you can keep or import elsewhere.",
  import:
    "Adds the endpoints from an exported file. One with the same method and path as an endpoint here replaces it.",
  delete:
    "Removes every endpoint and the request log, and the key stops working immediately. This can't be undone.",
};

export function clearLogNote(logCount: number): string {
  const what =
    logCount === 0
      ? "every logged request"
      : `all ${logCount.toLocaleString("en-US")} ${logCount === 1 ? "logged request" : "logged requests"}`;
  return `Removes ${what}. Endpoints aren't affected.`;
}
