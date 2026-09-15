import { describe, expect, it } from "vitest";
import { substitute, tokensUsed } from "../template";
import { applyCollectionQuery } from "../collection";

const ctx = (over: Partial<Parameters<typeof substitute>[1]> = {}) => ({
  params: {},
  query: {},
  wildcard: null,
  now: new Date("2026-09-13T10:00:00.000Z"),
  ...over,
});

describe("substitute", () => {
  it("replaces a path param inside a string", () => {
    const body = { id: "{{id}}", url: "/orders/{{id}}" };
    expect(substitute(body, ctx({ params: { id: "ord_92kd" } }))).toEqual({
      id: "ord_92kd",
      url: "/orders/ord_92kd",
    });
  });

  it("reads query values and returns empty string when absent", () => {
    expect(substitute({ page: "{{query.page}}", q: "{{query.missing}}" }, ctx({ query: { page: "2" } })))
      .toEqual({ page: "2", q: "" });
  });

  it("gives {{index}} a number, not a string", () => {
    const body = [{ n: "{{index}}" }, { n: "{{index}}" }];
    expect(substitute(body, ctx())).toEqual([{ n: 0 }, { n: 1 }]);
  });

  it("keeps the enclosing array index inside nested objects", () => {
    const body = [{ meta: { row: "row {{index}}" } }, { meta: { row: "row {{index}}" } }];
    expect(substitute(body, ctx())).toEqual([
      { meta: { row: "row 0" } },
      { meta: { row: "row 1" } },
    ]);
  });

  it("resolves {{now}} and {{wildcard}}", () => {
    expect(substitute({ at: "{{now}}", f: "{{wildcard}}" }, ctx({ wildcard: "a/b.pdf" }))).toEqual({
      at: "2026-09-13T10:00:00.000Z",
      f: "a/b.pdf",
    });
  });

  it("leaves an unknown token visible instead of blanking it", () => {
    expect(substitute({ x: "{{nope}}" }, ctx())).toEqual({ x: "{{nope}}" });
  });

  it("leaves non-string values alone", () => {
    expect(substitute({ total: 4820, ok: true, none: null }, ctx())).toEqual({
      total: 4820,
      ok: true,
      none: null,
    });
  });

  it("lists the tokens a body uses", () => {
    expect(tokensUsed({ id: "{{id}}", at: "{{now}}", plain: "hi" }).sort()).toEqual(["id", "now"]);
  });
});

describe("applyCollectionQuery", () => {
  const rows = [
    { id: "a", status: "shipped", total: 100 },
    { id: "b", status: "pending", total: 300 },
    { id: "c", status: "shipped", total: 200 },
  ];

  it("returns non-arrays untouched", () => {
    expect(applyCollectionQuery({ id: "a" }, { limit: "1" })).toEqual({ id: "a" });
  });

  it("applies limit and offset", () => {
    expect(applyCollectionQuery(rows, { limit: "2" })).toHaveLength(2);
    expect(applyCollectionQuery(rows, { offset: "2" })).toEqual([rows[2]]);
  });

  it("derives offset from page when both page and limit are given", () => {
    expect(applyCollectionQuery(rows, { page: "2", limit: "1" })).toEqual([rows[1]]);
  });

  it("filters by an arbitrary field", () => {
    expect(applyCollectionQuery(rows, { status: "shipped" })).toHaveLength(2);
    expect(applyCollectionQuery(rows, { total: "300" })).toEqual([rows[1]]);
  });

  it("sorts ascending by default and descending on request", () => {
    expect(applyCollectionQuery(rows, { sort: "total" })).toEqual([rows[0], rows[2], rows[1]]);
    expect(applyCollectionQuery(rows, { sort: "total", order: "desc" })).toEqual([
      rows[1],
      rows[2],
      rows[0],
    ]);
  });

  it("combines filter, sort and limit", () => {
    expect(applyCollectionQuery(rows, { status: "shipped", sort: "total", order: "desc", limit: "1" }))
      .toEqual([rows[2]]);
  });
});
