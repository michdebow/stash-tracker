import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  passwordRequirementLabels,
  usePasswordStrength,
} from "../usePasswordStrength";

describe("usePasswordStrength", () => {
  it("marks all requirements unmet for an empty password", () => {
    const { result } = renderHook(({ value }) => usePasswordStrength(value), {
      initialProps: { value: "" },
    });

    expect(result.current.score).toBe(0);
    expect(result.current.level).toBe("weak");
    expect(result.current.label).toBe("Weak password");
    expect(result.current.unmetRequirementIds).toEqual(["length", "symbol"]);
    expect(result.current.requirements).toEqual([
      expect.objectContaining({ id: "length", isMet: false }),
      expect.objectContaining({ id: "symbol", isMet: false }),
    ]);
  });

  it("returns fair strength when only length requirement is met", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePasswordStrength(value),
      {
        initialProps: { value: "" },
      },
    );

    rerender({ value: "abcdef" });

    expect(result.current.score).toBe(1);
    expect(result.current.level).toBe("fair");
    expect(result.current.label).toBe("Fair password");
    expect(result.current.unmetRequirementIds).toEqual(["symbol"]);
    expect(result.current.requirements).toEqual([
      expect.objectContaining({ id: "length", isMet: true }),
      expect.objectContaining({ id: "symbol", isMet: false }),
    ]);
  });

  it("returns strong strength when all requirements are satisfied", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePasswordStrength(value),
      {
        initialProps: { value: "" },
      },
    );

    rerender({ value: "abcdef$" });

    expect(result.current.score).toBe(2);
    expect(result.current.level).toBe("strong");
    expect(result.current.label).toBe("Strong password");
    expect(result.current.unmetRequirementIds).toEqual([]);
    expect(result.current.requirements).toEqual([
      expect.objectContaining({ id: "length", isMet: true }),
      expect.objectContaining({ id: "symbol", isMet: true }),
    ]);
  });
});

describe("passwordRequirementLabels", () => {
  it("exposes requirement metadata for display components", () => {
    expect(passwordRequirementLabels).toEqual([
      { id: "length", label: "At least 6 characters" },
      { id: "symbol", label: "Contains a special character" },
    ]);
  });
});
