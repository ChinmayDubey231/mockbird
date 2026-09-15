/**
 * Workspace keys.
 *
 * Six characters from a 32-symbol alphabet is about 10^9 possibilities, which
 * is unguessable at the rate limit but is not a secret. Mocks are public data
 * and the UI says so.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/i/o/0/1

export function workspaceKey(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function sampleId(prefix: string): string {
  return `${prefix}_${workspaceKey(4)}`;
}
