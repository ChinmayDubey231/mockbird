/**
 * Picks the URL a free-text description should live at.
 *
 * Shared by the demo route, which creates the endpoint there, and the landing
 * page, which shows the same path while the visitor is still typing — so the
 * URL on screen never disagrees with the one that gets created.
 */

const STOPWORDS = new Set([
  "list", "collection", "set", "array", "single", "few", "couple", "some", "group", "bunch", "item", "items",
]);

/** Naive English pluralisation — good enough for a URL segment, not a dictionary. */
function pluralize(noun: string): string {
  if (noun.endsWith("s")) return noun;
  if (/[^aeiou]y$/.test(noun)) return noun.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/.test(noun)) return noun + "es";
  return noun + "s";
}

/**
 * Pulls a plausible resource name out of a free-text description, so the demo
 * endpoint lands at e.g. /pets for "a list of pets..." instead of always at
 * /orders regardless of what was typed. Falls back to "orders" — the
 * long-standing default — whenever nothing usable is found, so behaviour for
 * odd input never gets worse than it already was.
 */
export function guessPath(description: string): string {
  const text = description.toLowerCase();
  const patterns = [
    /\b(?:list|collection|set|array)\s+of\s+(?:[a-z]+\s+){0,3}?([a-z]+)/,
    /\b(?:a|an|the)\s+(?:[a-z]+\s+){0,3}?([a-z]+)\s+(?:with|containing|having|that has)\b/,
    // A leading quantity with no article, e.g. "twelve orders, one refunded"
    // or "three products, prices in EUR" — both real preset phrases on the
    // landing page's demo card.
    /^(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|many|multiple)\s+([a-z]+)/,
    /\b(?:a|an|the)\s+([a-z]+)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1];
    if (candidate && candidate.length >= 3 && !STOPWORDS.has(candidate)) {
      return `/${pluralize(candidate)}`;
    }
  }
  return "/orders";
}
