import { describe, expect, it } from "vitest";
import { isFormVisibilityConditionMet as visible } from "./conditions";

const equals = {
  sourceField: "interest",
  operator: "equals" as const,
  value: "nutrition",
};

describe("form visibility foundation (Batch 2A)", () => {
  it("keeps unconditional fields visible", () => {
    expect(visible(undefined, {})).toBe(true);
  });
  it("matches exact option values and not human-readable labels", () => {
    expect(visible(equals, { interest: "nutrition" })).toBe(true);
    expect(visible(equals, { interest: "Nutrition" })).toBe(false);
    expect(visible(equals, { interest: "fitness" })).toBe(false);
  });
  it("does not show a not-equal branch before a select/radio has an answer", () => {
    const condition = { ...equals, operator: "notEquals" as const };
    expect(visible(condition, {})).toBe(false);
    expect(visible(condition, { interest: "" })).toBe(false);
    expect(visible(condition, { interest: "fitness" })).toBe(true);
    expect(visible(condition, { interest: "nutrition" })).toBe(false);
  });
  it("contains checks multi-select membership, never text substrings", () => {
    const condition = { ...equals, operator: "contains" as const };
    expect(visible(condition, { interest: ["fitness", "nutrition"] })).toBe(
      true,
    );
    expect(visible(condition, { interest: ["fitness"] })).toBe(false);
    expect(visible(condition, { interest: "nutrition" })).toBe(false);
    expect(visible(condition, { interest: "healthy nutrition plans" })).toBe(
      false,
    );
  });
  it("supports explicit unchecked checkbox values for notEquals", () => {
    const condition = {
      sourceField: "updates",
      operator: "notEquals" as const,
      value: "yes",
    };
    expect(visible(condition, { updates: false })).toBe(true);
    expect(visible(condition, { updates: "yes" })).toBe(false);
    expect(visible(condition, {})).toBe(false);
  });
  it("fails closed on unsupported values and malformed conditions", () => {
    expect(visible(equals, {})).toBe(false);
    expect(
      visible(
        { ...equals, operator: "bogus" as "equals" },
        { interest: "nutrition" },
      ),
    ).toBe(false);
    expect(
      visible({ ...equals, sourceField: "" }, { interest: "nutrition" }),
    ).toBe(false);
    expect(visible(equals, { interest: ["nutrition"] })).toBe(false);
  });
});
