import { describe, expect, it } from "vitest";
import { guessPath } from "../guessPath";

describe("guessPath", () => {
  it("handles every prompt the landing page offers", () => {
    expect(guessPath("Twelve orders, one refunded, with customer names")).toBe("/orders");
    expect(guessPath("A user profile with plan and last login")).toBe("/profiles");
    expect(guessPath("Three products, prices in EUR, one out of stock")).toBe("/products");
    expect(guessPath("A paginated list of invoices with due dates")).toBe("/invoices");
  });

  it("pluralises the noun it finds", () => {
    expect(guessPath("a list of puppy")).toBe("/puppies");
    expect(guessPath("a list of box")).toBe("/boxes");
    expect(guessPath("a list of key")).toBe("/keys");
  });

  it("skips filler words and falls back to /orders", () => {
    expect(guessPath("a few of them")).toBe("/orders");
    expect(guessPath("")).toBe("/orders");
    expect(guessPath("!!!")).toBe("/orders");
  });
});
