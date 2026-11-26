import { describe, expect, it, vi } from "vitest";
import type { CmsFormBlock } from "@/cms/types";

vi.mock("@/cms/mappers/section-heading", () => ({
  mapSectionHeading: () => ({}),
}));
vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImage: () => undefined,
  resolveSanityImageSrcSet: () => undefined,
  resolveSanityImageDimensions: () => undefined,
}));
vi.mock("@/components/CmsRichText", () => ({ CmsRichText: () => null }));
import { mapFormBlock } from "./form";

const nutrition = {
  sourceField: "interest",
  operator: "equals" as const,
  value: "nutrition",
};
function block(
  fields: unknown[],
  formMode: "single" | "stepped" = "single",
): CmsFormBlock {
  return {
    _key: "form-1",
    _type: "formBlock",
    formMode,
    fields: formMode === "single" ? fields : undefined,
    steps:
      formMode === "stepped"
        ? [
            { _key: "step-a", _type: "formStep", fields: [fields[0]] },
            { _key: "step-b", _type: "formStep", fields: [fields[1]] },
          ]
        : undefined,
  } as CmsFormBlock;
}

describe("CMS form condition mapping", () => {
  const select = {
    _type: "formSelectField",
    _key: "interest",
    name: "interest",
    label: "Interest",
    options: [{ _key: "n", value: "nutrition", label: "Nutrition" }],
  };
  const nested = {
    _type: "formFieldset",
    _key: "details",
    name: "details",
    legend: "Details",
    visibilityCondition: nutrition,
    fields: [
      {
        _type: "formInputField",
        _key: "goal",
        name: "goal",
        label: "Goal",
        required: true,
      },
    ],
  };

  it("carries conditions through nested fieldsets and keeps other options intact", () => {
    const mapped = mapFormBlock(block([select, nested]));
    const fieldset = mapped.fields?.[1];
    expect(fieldset?.visibilityCondition).toEqual(nutrition);
    expect(fieldset).toHaveProperty("fields.0.name", "goal");
    expect(mapped.fields?.[0]).not.toHaveProperty("visibilityCondition");
  });

  it("preserves earlier-step references", () => {
    const mapped = mapFormBlock(block([select, nested], "stepped"));
    expect(mapped.steps?.[1]?.fields[0].visibilityCondition).toEqual(nutrition);
    expect(mapped.steps?.[0]?.fields[0].name).toBe("interest");
  });
});
