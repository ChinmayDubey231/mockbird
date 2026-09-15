import { describe, expect, it } from "vitest";
import { compilePath } from "../path";
import { didYouMean, matchRoute, Route } from "../match";

/** Builds the candidate list exactly as the database index hands it over. */
function table(...paths: string[]): Route[] {
  return paths
    .map((p, i) => {
      const c = compilePath(p);
      return { id: `e${i}`, path: c.path, segments: c.segments, specificity: c.specificity };
    })
    .sort((a, b) => b.specificity - a.specificity);
}

describe("matchRoute", () => {
  const routes = table("/orders", "/orders/new", "/orders/:id", "/orders/:id/items", "/files/*");

  it("matches a static path", () => {
    expect(matchRoute(routes, "/orders")?.route.path).toBe("/orders");
  });

  it("captures path params", () => {
    const hit = matchRoute(routes, "/orders/ord_92kd");
    expect(hit?.route.path).toBe("/orders/:id");
    expect(hit?.params).toEqual({ id: "ord_92kd" });
  });

  it("prefers a static segment over a param at the same depth", () => {
    expect(matchRoute(routes, "/orders/new")?.route.path).toBe("/orders/new");
  });

  it("matches nested params", () => {
    const hit = matchRoute(routes, "/orders/ord_92kd/items");
    expect(hit?.route.path).toBe("/orders/:id/items");
    expect(hit?.params).toEqual({ id: "ord_92kd" });
  });

  it("matches any depth under a wildcard and captures the remainder", () => {
    const hit = matchRoute(routes, "/files/invoices/2026/sep.pdf");
    expect(hit?.route.path).toBe("/files/*");
    expect(hit?.wildcard).toBe("invoices/2026/sep.pdf");
  });

  it("does not let a wildcard match its own bare prefix", () => {
    expect(matchRoute(table("/files/*"), "/files")).toBeNull();
  });

  it("requires the segment count to line up", () => {
    expect(matchRoute(routes, "/orders/ord_92kd/items/3")).toBeNull();
    expect(matchRoute(routes, "/")).toBeNull();
  });

  it("compares static segments case-sensitively", () => {
    expect(matchRoute(table("/Orders"), "/orders")).toBeNull();
  });

  it("ignores trailing slashes on the request", () => {
    expect(matchRoute(routes, "/orders/")?.route.path).toBe("/orders");
  });

  it("decodes percent-encoded segments before comparing", () => {
    const hit = matchRoute(table("/orders/:id"), "/orders/ord%20with%20space");
    expect(hit?.params).toEqual({ id: "ord with space" });
  });

  it("matches the root path when it is registered", () => {
    expect(matchRoute(table("/"), "/")?.route.path).toBe("/");
  });

  it("returns null rather than throwing when the table is empty", () => {
    expect(matchRoute([], "/orders")).toBeNull();
  });
});

describe("didYouMean", () => {
  const known = ["/orders", "/orders/:id", "/users", "/health"];

  it("suggests the nearest registered path", () => {
    expect(didYouMean("/ordres", known)).toBe("/orders");
    expect(didYouMean("/order", known)).toBe("/orders");
  });

  it("stays quiet when nothing is close", () => {
    expect(didYouMean("/completely-different", known)).toBeNull();
    expect(didYouMean("/orders", [])).toBeNull();
  });
});
