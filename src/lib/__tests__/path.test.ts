import { describe, expect, it } from "vitest";
import { compilePath, InvalidPathError, parsePath, specificity } from "../path";

describe("parsePath", () => {
  it("splits static and param segments", () => {
    expect(parsePath("/orders/:id/items")).toEqual([
      { type: "static", value: "orders" },
      { type: "param", name: "id" },
      { type: "static", value: "items" },
    ]);
  });

  it("normalises leading and trailing slashes", () => {
    expect(compilePath("/orders/").path).toBe("/orders");
    expect(compilePath("//orders//:id//").path).toBe("/orders/:id");
  });

  it("treats the root path as an empty segment list", () => {
    expect(parsePath("/")).toEqual([]);
    expect(compilePath("/").path).toBe("/");
  });

  it("accepts a trailing wildcard only", () => {
    expect(parsePath("/files/*")).toEqual([
      { type: "static", value: "files" },
      { type: "wildcard" },
    ]);
    expect(() => parsePath("/files/*/thumbs")).toThrow(InvalidPathError);
  });

  it("rejects malformed paths", () => {
    expect(() => parsePath("orders")).toThrow(InvalidPathError);
    expect(() => parsePath("/orders?limit=2")).toThrow(InvalidPathError);
    expect(() => parsePath("/orders/:")).toThrow(InvalidPathError);
    expect(() => parsePath("/orders/:1id")).toThrow(InvalidPathError);
    expect(() => parsePath("/orders/:id/items/:id")).toThrow(InvalidPathError);
  });
});

describe("specificity", () => {
  const score = (p: string) => specificity(parsePath(p));

  it("ranks static-heavy patterns above param-heavy ones", () => {
    expect(score("/orders/new")).toBe(200); // 2 static
    expect(score("/orders/:id/items")).toBe(190); // 2 static, 1 param
    expect(score("/orders/:id")).toBe(90);
    expect(score("/orders/new")).toBeGreaterThan(score("/orders/:id"));
  });

  it("penalises wildcards below everything at the same depth", () => {
    expect(score("/files/*")).toBe(50);
    expect(score("/files/:name")).toBe(90);
    expect(score("/files/*")).toBeLessThan(score("/files/:name"));
  });

  it("orders a realistic route table so competing patterns resolve correctly", () => {
    const paths = ["/orders/:id/items", "/orders/new", "/orders/:id", "/orders", "/*"];
    const sorted = [...paths].sort((a, b) => score(b) - score(a));
    // Patterns of different depth never compete with each other, so the only
    // ordering that has to hold is within a depth: /orders/new before
    // /orders/:id, and the catch-all last.
    expect(sorted).toEqual(["/orders/new", "/orders/:id/items", "/orders", "/orders/:id", "/*"]);
    expect(sorted.indexOf("/orders/new")).toBeLessThan(sorted.indexOf("/orders/:id"));
    expect(sorted.at(-1)).toBe("/*");
  });
});
