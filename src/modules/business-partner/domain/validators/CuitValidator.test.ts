import { describe, it, expect } from "vitest";
import { CuitValidator } from "./CuitValidator.js";

describe("CuitValidator", () => {
  describe("sanitize", () => {
    it("removes dashes from a CUIT", () => {
      expect(CuitValidator.sanitize("20-12345678-9")).toBe("20123456789");
    });

    it("removes spaces from a CUIT", () => {
      expect(CuitValidator.sanitize("20 12345678 9")).toBe("20123456789");
    });

    it("removes any non-numeric character", () => {
      expect(CuitValidator.sanitize("20-1234.5678/9")).toBe("20123456789");
    });

    it("returns empty string when input is null", () => {
      expect(CuitValidator.sanitize(null as unknown as string)).toBe("");
    });

    it("returns empty string when input is undefined", () => {
      expect(CuitValidator.sanitize(undefined as unknown as string)).toBe("");
    });

    it("returns empty string when input is an empty string", () => {
      expect(CuitValidator.sanitize("")).toBe("");
    });

    it("returns the same string when already clean with 11 digits", () => {
      expect(CuitValidator.sanitize("20123456789")).toBe("20123456789");
    });
  });

  describe("isValid", () => {
    it("returns true for an 11-digit sanitized string", () => {
      expect(CuitValidator.isValid("20123456789")).toBe(true);
    });

    it("returns true for an 11-digit string with dashes", () => {
      expect(CuitValidator.isValid("20-12345678-9")).toBe(true);
    });

    it("returns false for fewer than 11 digits", () => {
      expect(CuitValidator.isValid("1234567890")).toBe(false);
    });

    it("returns false for more than 11 digits", () => {
      expect(CuitValidator.isValid("201234567890")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(CuitValidator.isValid("")).toBe(false);
    });

    it("returns false for null input", () => {
      expect(CuitValidator.isValid(null as unknown as string)).toBe(false);
    });

    it("returns false for undefined input", () => {
      expect(CuitValidator.isValid(undefined as unknown as string)).toBe(false);
    });
  });
});
