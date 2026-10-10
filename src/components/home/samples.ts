/**
 * What the demo card shows before anything exists: a muted sketch of the
 * kind of body each preset prompt produces. None of it is ever served — the
 * real body comes back from /api/demo once the visitor presses Create.
 */

const ORDERS = [
  { id: "ord_92kd", customer: "Rohan Mehta", total: 4820, status: "shipped" },
  { id: "ord_71bz", customer: "Ananya Iyer", total: 1290, status: "refunded" },
];

const PROFILE = {
  id: "usr_4k2m",
  name: "Meera Nair",
  email: "meera.nair@example.com",
  plan: "pro",
  lastLoginAt: "2026-09-30T18:42:11.000Z",
};

const PRODUCTS = [
  { id: "prd_01", name: "Linen notebook", price: { amount: 18.5, currency: "EUR" }, inStock: true },
  { id: "prd_02", name: "Brass pen", price: { amount: 42, currency: "EUR" }, inStock: false },
  { id: "prd_03", name: "Desk lamp", price: { amount: 64, currency: "EUR" }, inStock: true },
];

/** "/invoices" -> "Invoice", for labelling a record type. */
function recordName(path: string): string {
  const noun = path.split("/").filter(Boolean)[0] ?? "item";
  const one = noun
    .replace(/ies$/, "y")
    .replace(/(ches|shes|xes)$/, (m) => m.slice(0, -2))
    .replace(/s$/, "");
  return one.charAt(0).toUpperCase() + one.slice(1);
}

export function sampleFor(path: string): { body: unknown; total?: number } {
  if (path === "/orders") return { body: ORDERS, total: 12 };
  if (path === "/profiles") return { body: PROFILE };
  if (path === "/products") return { body: PRODUCTS };
  const name = recordName(path);
  const prefix = name.slice(0, 3).toLowerCase();
  return {
    body: ["8f2k", "3m9q", "7c1x"].map((suffix, i) => ({
      id: `${prefix}_${suffix}`,
      name: `${name} ${i + 1}`,
      createdAt: `2026-09-${28 + i}T09:${10 + i * 7}:00.000Z`,
    })),
  };
}

/** The schema and record count a generated body implies, e.g. "Order { id, total, … }". */
export function summarize(path: string, sample: unknown): { schema: string; count: number } {
  const records = Array.isArray(sample) ? sample : [sample];
  const first = records.find((r) => r && typeof r === "object" && !Array.isArray(r));
  const keys = first ? Object.keys(first) : [];
  const fields = keys.length > 5 ? [...keys.slice(0, 4), "…"] : keys;
  const name = recordName(path);
  return { schema: fields.length ? `${name} { ${fields.join(", ")} }` : name, count: records.length };
}
