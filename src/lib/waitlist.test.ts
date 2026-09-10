import { describe, expect, it } from "vitest";
import { emailIsValid } from "./waitlist";

describe("emailIsValid", () => {
  it("accepts common valid addresses", () => {
    for (const addr of [
      "test@example.com",
      "a.b+c@sub.domain.co",
      "UPPER@Example.com",
      "user+tag@github.io",
    ]) {
      expect(emailIsValid(addr)).toBe(true);
    }
  });

  it("rejects malformed addresses", () => {
    for (const addr of [
      "",
      "not-an-email",
      "test@",
      "@example.com",
      "test@example",
      "test@example.",
      "test @example.com",
      "a b@example.com",
    ]) {
      expect(emailIsValid(addr)).toBe(false);
    }
  });

  it("trims surrounding whitespace", () => {
    expect(emailIsValid("  test@example.com  ")).toBe(true);
  });
});