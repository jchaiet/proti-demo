import { describe, expect, it } from "vitest";
import {
  filterVisibleFormFields,
  formHasConditions,
  getConditionSourceNames,
  getDefaultConditionValues,
  getVisibleFieldNames,
  readFormConditionValues,
  sameConditionValues,
  type ConditionalFormField,
  type ConditionalFormStep,
} from "./visibility";

const nutrition = {
  sourceField: "interest",
  operator: "equals" as const,
  value: "nutrition",
};
const trigger: ConditionalFormField = {
  fieldType: "select",
  name: "interest",
  label: "Interest",
  defaultValue: "fitness",
  options: [
    { value: "nutrition", label: "Nutrition" },
    { value: "fitness", label: "Fitness" },
  ],
};
const required: ConditionalFormField = {
  fieldType: "input",
  name: "goal",
  label: "Dietary goal",
  required: true,
  defaultValue: "original default",
  visibilityCondition: nutrition,
};

const nested: ConditionalFormField = {
  fieldType: "fieldset",
  name: "details",
  legend: "Additional details",
  visibilityCondition: nutrition,
  fields: [
    {
      fieldType: "input",
      name: "explanation",
      label: "Explanation",
      required: true,
    },
    {
      fieldType: "checkbox",
      name: "approval",
      label: "Approval",
      defaultChecked: true,
    },
  ],
};

describe("conditional form rendering adapter", () => {
  it("keeps only trigger names and ignores unchanged selections", () => {
    expect([
      ...getConditionSourceNames([trigger, required], undefined),
    ]).toEqual(["interest"]);
    expect(
      sameConditionValues({ interest: "nutrition" }, { interest: "nutrition" }),
    ).toBe(true);
    expect(sameConditionValues({ interest: "" }, { interest: undefined })).toBe(
      true,
    );
    expect(
      sameConditionValues({ topics: ["nutrition"] }, { topics: ["nutrition"] }),
    ).toBe(true);
    expect(
      sameConditionValues({ topics: ["nutrition"] }, { topics: ["fitness"] }),
    ).toBe(false);
  });

  it("does not alter unconditional forms or leak condition metadata to Mino", () => {
    expect(formHasConditions([trigger], undefined)).toBe(false);
    expect(formHasConditions([trigger, required], undefined)).toBe(true);
    const shown = filterVisibleFormFields(
      [trigger, required],
      { interest: "nutrition" },
      new Set(),
    );
    expect(shown.map((field) => field.name)).toEqual(["interest", "goal"]);
    expect(shown[1]).not.toHaveProperty("visibilityCondition");
  });

  it("removes conditional required controls and whole fieldsets from the render tree", () => {
    const fields = [trigger, required, nested];
    const hidden = filterVisibleFormFields(
      fields,
      { interest: "fitness" },
      new Set(),
    );
    expect(hidden.map((field) => field.name)).toEqual(["interest"]);
    expect([
      ...getVisibleFieldNames(fields, undefined, { interest: "fitness" }),
    ]).toEqual(["interest"]);
    const shown = filterVisibleFormFields(
      fields,
      { interest: "nutrition" },
      new Set(),
    );
    expect(shown.map((field) => field.name)).toEqual([
      "interest",
      "goal",
      "details",
    ]);
    expect(shown[2]).toHaveProperty("fields");
    expect(
      (shown[2] as { fields: Array<{ name: string }> }).fields.map(
        (field) => field.name,
      ),
    ).toEqual(["explanation", "approval"]);
  });

  it("drops authored defaults once a conditional branch has become hidden", () => {
    const shown = filterVisibleFormFields(
      [trigger, required, nested],
      { interest: "nutrition" },
      new Set(["goal", "details", "explanation", "approval"]),
    );
    expect(shown[1]).not.toHaveProperty("defaultValue");
    const group = shown[2] as {
      fields: Array<{ name: string; defaultChecked?: boolean }>;
    };
    expect(group.fields[1]).not.toHaveProperty("defaultChecked");
    expect(required.defaultValue).toBe("original default");
  });

  it("uses initial defaults, even when a trigger is in an earlier step", () => {
    const steps: ConditionalFormStep[] = [
      { id: "first", fields: [trigger] },
      { id: "second", fields: [required] },
    ];
    expect(getDefaultConditionValues(undefined, steps)).toEqual({
      interest: "fitness",
    });
    expect(
      getVisibleFieldNames(undefined, steps, { interest: "nutrition" }).has(
        "goal",
      ),
    ).toBe(true);
  });

  it("respects unchecked checkboxes and multi-select arrays", () => {
    const newsletter: ConditionalFormField = {
      fieldType: "checkbox",
      name: "newsletter",
      label: "Newsletter",
      value: "yes",
      defaultChecked: false,
    };
    const optOut: ConditionalFormField = {
      ...required,
      visibilityCondition: {
        sourceField: "newsletter",
        operator: "notEquals",
        value: "yes",
      },
    };
    expect(getDefaultConditionValues([newsletter, optOut], undefined)).toEqual({
      newsletter: false,
    });
    expect(
      filterVisibleFormFields(
        [newsletter, optOut],
        { newsletter: false },
        new Set(),
      ),
    ).toHaveLength(2);
    expect(
      filterVisibleFormFields(
        [newsletter, optOut],
        { newsletter: "yes" },
        new Set(),
      ),
    ).toHaveLength(1);

    const categories: ConditionalFormField = {
      fieldType: "select",
      name: "categories",
      multiple: true,
      defaultValue: ["fitness"],
      options: [{ label: "Fitness", value: "fitness" }],
    };
    const match: ConditionalFormField = {
      ...required,
      visibilityCondition: {
        sourceField: "categories",
        operator: "contains",
        value: "fitness",
      },
    };
    expect(getDefaultConditionValues([categories, match], undefined)).toEqual({
      categories: ["fitness"],
    });
  });

  it("retains a one-item multi-select as an array, and an unchecked checkbox as false", () => {
    const form = document.createElement("form");
    const select = document.createElement("select");
    select.name = "topics";
    select.multiple = true;
    const option = document.createElement("option");
    option.value = "nutrition";
    option.selected = true;
    select.appendChild(option);
    form.appendChild(select);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "consent";
    form.appendChild(checkbox);
    expect(readFormConditionValues(form)).toEqual({
      topics: ["nutrition"],
      consent: false,
    });
  });
});
