import { describe, expect, it } from "vitest";
import {
  validateFormValues,
  type PublishedFormDefinition,
  type PublishedFormField,
} from "./validation";

const choose: PublishedFormField = {
  _type: "formSelectField",
  name: "interest",
  options: [
    { value: "nutrition" },
    { value: "fitness" },
    { value: "retired", disabled: true },
  ],
  required: true,
};
const whenNutrition = {
  sourceField: "interest",
  operator: "equals" as const,
  value: "nutrition",
};
const whenFitness = {
  sourceField: "interest",
  operator: "equals" as const,
  value: "fitness",
};
const goals: PublishedFormField = {
  _type: "formTextareaField",
  name: "dietaryGoals",
  required: true,
  visibilityCondition: whenNutrition,
};
const form: PublishedFormDefinition = {
  _key: "conditional",
  fields: [
    { _type: "formInputField", name: "email", type: "email", required: true },
    choose,
    goals,
    {
      _type: "formInputField",
      name: "exerciseGoals",
      required: true,
      visibilityCondition: whenFitness,
    },
  ],
};
const base = { email: "person@example.com", interest: "fitness" };

const ok = (definition: PublishedFormDefinition, values: unknown) =>
  validateFormValues(definition, values);

// Only validation failures have a code; fail explicitly if success is unexpected.
const rejected = (definition: PublishedFormDefinition, values: unknown) => {
  const result = validateFormValues(definition, values);
  if (result.ok) {
    throw new Error("Expected form validation to fail, but it succeeded.");
  }
  return result;
};

describe("trusted conditional form submission validation (2C)", () => {
  it("requires only the currently visible branch and forwards only validated answers", () => {
    expect(ok(form, { ...base, exerciseGoals: "Run more" })).toEqual({
      ok: true,
      values: { ...base, exerciseGoals: "Run more" },
    });
    expect(ok(form, base)).toMatchObject({
      ok: false,
      error: "Please complete all required fields.",
    });
    expect(
      ok(form, { ...base, dietaryGoals: "ignored", exerciseGoals: "Jog" }),
    ).toEqual({
      ok: true,
      values: { ...base, exerciseGoals: "Jog" },
    });
  });

  it("discards malformed/forged values on known hidden fields, not unknown names", () => {
    expect(
      ok(form, {
        ...base,
        exerciseGoals: "Jog",
        dietaryGoals: { bypass: true },
      }),
    ).toEqual({
      ok: true,
      values: { ...base, exerciseGoals: "Jog" },
    });
    expect(ok(form, { ...base, exerciseGoals: "Jog", admin: "true" }).ok).toBe(
      false,
    );
    expect(
      ok(form, { ...base, exerciseGoals: "Jog", unknownField: [] }).ok,
    ).toBe(false);
  });

  it("does not use invalid trigger selections to satisfy notEquals", () => {
    const other: PublishedFormDefinition = {
      _key: "no-match",
      fields: [
        choose,
        {
          _type: "formInputField",
          name: "extra",
          required: true,
          visibilityCondition: {
            sourceField: "interest",
            operator: "notEquals",
            value: "nutrition",
          },
        },
      ],
    };
    expect(ok(other, { interest: "invalid", extra: "tampered" }).ok).toBe(
      false,
    );
    expect(ok(other, { interest: "retired", extra: "tampered" }).ok).toBe(
      false,
    );
    expect(ok(other, { interest: "fitness", extra: "Valid" })).toEqual({
      ok: true,
      values: { interest: "fitness", extra: "Valid" },
    });
    expect(ok(other, { interest: "nutrition", extra: "hidden" })).toEqual({
      ok: true,
      values: { interest: "nutrition" },
    });
  });

  it("treats an unchecked Checkbox as false for notEquals and requires checked values to match", () => {
    const config: PublishedFormDefinition = {
      _key: "checkbox",
      fields: [
        { _type: "formCheckboxField", name: "consent", value: "yes" },
        {
          _type: "formInputField",
          name: "reason",
          required: true,
          visibilityCondition: {
            sourceField: "consent",
            operator: "notEquals",
            value: "yes",
          },
        },
      ],
    };
    expect(ok(config, { reason: "Opting out" })).toEqual({
      ok: true,
      values: { reason: "Opting out" },
    });
    expect(ok(config, {}).ok).toBe(false);
    expect(ok(config, { consent: "yes", reason: "hidden" })).toEqual({
      ok: true,
      values: { consent: "yes" },
    });
    expect(ok(config, { consent: "on", reason: "tampered" }).ok).toBe(false);
  });

  it("supports contains selection for one or many multi-select options", () => {
    const config: PublishedFormDefinition = {
      _key: "multi",
      fields: [
        {
          _type: "formSelectField",
          name: "topics",
          multiple: true,
          options: [{ value: "fitness" }, { value: "nutrition" }],
        },
        {
          _type: "formInputField",
          name: "details",
          required: true,
          visibilityCondition: {
            sourceField: "topics",
            operator: "contains",
            value: "nutrition",
          },
        },
      ],
    };
    expect(ok(config, { topics: ["nutrition"], details: "Foods" })).toEqual({
      ok: true,
      values: { topics: ["nutrition"], details: "Foods" },
    });
    expect(
      ok(config, { topics: ["fitness", "nutrition"], details: "Foods" }).ok,
    ).toBe(true);
    // FormData sends one string when a multi-select has exactly one result.
    expect(ok(config, { topics: "nutrition", details: "Foods" })).toEqual({
      ok: true,
      values: { topics: ["nutrition"], details: "Foods" },
    });
    expect(ok(config, { topics: ["fitness"], details: "hidden" })).toEqual({
      ok: true,
      values: { topics: ["fitness"] },
    });
    expect(ok(config, { topics: ["invalid"], details: "hidden" }).ok).toBe(
      false,
    );
  });

  it("respects conditional Fieldsets, inherited visibility, and earlier multistep triggers", () => {
    const config: PublishedFormDefinition = {
      _key: "stepped",
      formMode: "stepped",
      steps: [
        { fields: [choose] },
        {
          fields: [
            {
              _type: "formFieldset",
              name: "details",
              visibilityCondition: whenNutrition,
              fields: [
                { _type: "formInputField", name: "notes", required: true },
                {
                  _type: "formInputField",
                  name: "other",
                  required: true,
                  visibilityCondition: {
                    sourceField: "interest",
                    operator: "notEquals",
                    value: "fitness",
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(
      ok(config, { interest: "fitness", notes: "injected", other: "injected" }),
    ).toEqual({
      ok: true,
      values: { interest: "fitness" },
    });
    expect(
      ok(config, { interest: "nutrition", notes: "Diet", other: "Extra" }),
    ).toEqual({
      ok: true,
      values: { interest: "nutrition", notes: "Diet", other: "Extra" },
    });
    expect(ok(config, { interest: "nutrition", notes: "Diet" }).ok).toBe(false);
  });

  it("rejects condition references to unknown, later, disabled or chained triggers", () => {
    const condition = (sourceField: string) => ({
      sourceField,
      operator: "equals" as const,
      value: "nutrition",
    });
    const target = (sourceField: string): PublishedFormField => ({
      _type: "formInputField",
      name: "target",
      visibilityCondition: condition(sourceField),
    });
    const badForms: PublishedFormField[][] = [
      [choose, target("missing")],
      [target("interest"), choose],
      [{ ...choose, disabled: true }, target("interest")],
      [
        { ...choose, visibilityCondition: condition("other") },
        target("interest"),
      ],
      [
        {
          _type: "formFieldset",
          name: "fieldset",
          visibilityCondition: condition("other"),
          fields: [choose],
        },
        target("interest"),
      ],
    ];
    for (const fields of badForms) {
      expect(rejected({ _key: "corrupt", fields }, {}).code).toBe(
        "invalid_configuration",
      );
    }
  });

  it("fails closed on invalid operators, unsupported trigger types, disabled option references, or empty rules", () => {
    const corrupt = (field: PublishedFormField): PublishedFormDefinition => ({
      _key: "corrupt",
      fields: [choose, field],
    });
    expect(
      rejected(
        corrupt({
          ...goals,
          visibilityCondition: {
            ...whenNutrition,
            operator: "unknown" as "equals",
          },
        }),
        {},
      ).code,
    ).toBe("invalid_configuration");
    expect(
      rejected(
        corrupt({
          ...goals,
          visibilityCondition: { ...whenNutrition, value: "retired" },
        }),
        {},
      ).code,
    ).toBe("invalid_configuration");
    expect(
      rejected(
        corrupt({
          ...goals,
          visibilityCondition: { ...whenNutrition, value: "" },
        }),
        {},
      ).code,
    ).toBe("invalid_configuration");
    expect(
      rejected(
        {
          _key: "bad",
          fields: [{ _type: "formInputField", name: "interest" }, goals],
        },
        {},
      ).code,
    ).toBe("invalid_configuration");
  });

  it("rejects operator mismatches to prevent single/multi-select bypasses", () => {
    const multi = { ...choose, multiple: true };
    expect(rejected({ _key: "bad", fields: [multi, goals] }, {}).code).toBe(
      "invalid_configuration",
    );
    expect(
      rejected(
        {
          _key: "bad",
          fields: [
            choose,
            {
              ...goals,
              visibilityCondition: { ...whenNutrition, operator: "contains" },
            },
          ],
        },
        {},
      ).code,
    ).toBe("invalid_configuration");
  });

  it("retains legacy fail-closed upload and disabled-field safeguards", () => {
    const withUpload: PublishedFormDefinition = {
      _key: "upload",
      fields: [
        choose,
        {
          _type: "formFieldset",
          name: "details",
          visibilityCondition: whenNutrition,
          fields: [{ _type: "formFileUploadField", name: "resume" }],
        },
      ],
    };
    expect(rejected(withUpload, { interest: "fitness" }).code).toBe(
      "unsupported_file_upload",
    );
    const disabled: PublishedFormDefinition = {
      _key: "disabled",
      fields: [choose, { ...goals, disabled: true }],
    };
    expect(ok(disabled, { interest: "nutrition" })).toEqual({
      ok: true,
      values: { interest: "nutrition" },
    });
    expect(ok(disabled, { interest: "nutrition", dietaryGoals: "no" }).ok).toBe(
      false,
    );
  });

  it("rejects case-insensitive duplicate submitted field names in a corrupted published form", () => {
    const duplicate: PublishedFormDefinition = {
      _key: "bad",
      fields: [
        { _type: "formInputField", name: "Email" },
        { _type: "formInputField", name: "email" },
      ],
    };
    expect(rejected(duplicate, { Email: "hi" }).code).toBe(
      "invalid_configuration",
    );
  });

  it("does not alter validation semantics for unconditional published forms", () => {
    expect(
      ok(
        {
          _key: "legacy",
          fields: [
            {
              _type: "formInputField",
              name: "email",
              type: "email",
              required: true,
            },
          ],
        },
        { email: "person@example.com" },
      ),
    ).toEqual({
      ok: true,
      values: { email: "person@example.com" },
    });
  });
});
