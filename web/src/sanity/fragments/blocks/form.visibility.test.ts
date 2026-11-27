import { describe, expect, it } from "vitest";
import { FORM_BLOCK_FRAGMENT } from "./form";

describe("form GROQ visibility contract", () => {
  it("selects condition fields for top-level, stepped and fieldset fields", () => {
    const selection =
      /visibilityCondition\s*\{\s*sourceField,\s*operator,\s*value\s*\}/g;
    // The shared field fragment is used at both top level and the single
    // Fieldset nesting level supported by the existing Sanity schema.
    expect(FORM_BLOCK_FRAGMENT).toMatch(/fields\[\]\s*\{/);
    expect(FORM_BLOCK_FRAGMENT).toMatch(/steps\[\]\s*\{/);
    expect(FORM_BLOCK_FRAGMENT).toMatch(/formMode/);
    expect(FORM_BLOCK_FRAGMENT).toMatch(/visibilityCondition\s*\{/);
    expect(
      [...FORM_BLOCK_FRAGMENT.matchAll(selection)].length,
    ).toBeGreaterThanOrEqual(1);
  });
});
