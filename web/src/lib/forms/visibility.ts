import type {
  FieldsetFieldConfig,
  FormFieldConfig,
  FormStep,
} from "mino-ui/blocks/FormBlock";
import {
  isFormVisibilityConditionMet,
  type FormConditionValues,
  type FormVisibilityCondition,
} from "./conditions";

/**
 * Sanity metadata exists only in Proti's adapter. Strip it before passing
 * fields to Mino so it cannot become an unrecognized DOM attribute.
 */
export type ConditionalFormField = (
  | Exclude<FormFieldConfig, FieldsetFieldConfig>
  | (Omit<FieldsetFieldConfig, "fields"> & { fields: ConditionalFormField[] })
) & { visibilityCondition?: FormVisibilityCondition };

export type ConditionalFormStep = Omit<FormStep, "fields"> & {
  fields: ConditionalFormField[];
};

function walkFields(
  fields: readonly ConditionalFormField[] | undefined,
  visitor: (field: ConditionalFormField) => void,
): void {
  for (const field of fields ?? []) {
    visitor(field);
    if (field.fieldType === "fieldset") walkFields(field.fields, visitor);
  }
}

export function formHasConditions(
  fields: readonly ConditionalFormField[] | undefined,
  steps: readonly ConditionalFormStep[] | undefined,
): boolean {
  let found = false;
  for (const group of getGroups(fields, steps)) {
    walkFields(group, (field) => {
      if (field.visibilityCondition) found = true;
    });
  }
  return found;
}

/** Only trigger values belong in React state; never retain free-text answers. */
export function getConditionSourceNames(
  fields: readonly ConditionalFormField[] | undefined,
  steps: readonly ConditionalFormStep[] | undefined,
): Set<string> {
  const sources = new Set<string>();
  for (const group of getGroups(fields, steps)) {
    walkFields(group, (field) => {
      if (field.visibilityCondition?.sourceField) {
        sources.add(field.visibilityCondition.sourceField);
      }
    });
  }
  return sources;
}

/** Avoid re-rendering the whole FormBlock on unrelated text keystrokes. */
export function sameConditionValues(
  previous: FormConditionValues,
  current: FormConditionValues,
): boolean {
  const names = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const name of names) {
    const before = previous[name];
    const after = current[name];
    if (Array.isArray(before) || Array.isArray(after)) {
      if (!Array.isArray(before) || !Array.isArray(after)) return false;
      if (
        before.length !== after.length ||
        before.some((value, index) => value !== after[index])
      )
        return false;
      continue;
    }
    // Missing and empty single-select/radio values both mean unanswered.
    if ((before == null || before === "") && (after == null || after === ""))
      continue;
    if (before !== after) return false;
  }
  return true;
}

function getGroups(
  fields: readonly ConditionalFormField[] | undefined,
  steps: readonly ConditionalFormStep[] | undefined,
): ReadonlyArray<readonly ConditionalFormField[]> {
  return steps?.length ? steps.map((step) => step.fields) : [fields ?? []];
}

/** Default selections must be reflected in the initial SSR/hydrated markup. */
export function getDefaultConditionValues(
  fields: readonly ConditionalFormField[] | undefined,
  steps: readonly ConditionalFormStep[] | undefined,
): FormConditionValues {
  const sources = getConditionSourceNames(fields, steps);
  const values: Record<string, string | readonly string[] | boolean> = {};
  for (const group of getGroups(fields, steps)) {
    walkFields(group, (field) => {
      if (
        !field.name ||
        !sources.has(field.name) ||
        ("disabled" in field && field.disabled)
      )
        return;
      if (field.fieldType === "checkbox") {
        values[field.name] = field.defaultChecked
          ? typeof field.value === "string"
            ? field.value
            : "on"
          : false;
      } else if (field.fieldType === "select") {
        values[field.name] = field.multiple
          ? Array.isArray(field.defaultValue)
            ? field.defaultValue
            : []
          : typeof field.defaultValue === "string"
            ? field.defaultValue
            : "";
      } else if (field.fieldType === "radio") {
        values[field.name] = field.defaultValue ?? "";
      }
    });
  }
  return values;
}

/**
 * All rendered fields, including controls on inactive (but still mounted)
 * steps, are collected. FormData excludes disabled fields automatically.
 * Multiple selects retain array semantics even when only one option is chosen.
 * Unchecked checkboxes use false (not missing) for Batch 2A's notEquals rule.
 */
export function readFormConditionValues(
  form: HTMLFormElement,
): FormConditionValues {
  const data = new FormData(form);
  const values: Record<string, string | string[] | boolean> = {};
  const multiSelects = new Set<string>();
  const checkboxes = new Set<string>();

  for (const control of Array.from(form.elements)) {
    if (
      !(
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement
      )
    )
      continue;
    if (!control.name || control.matches(":disabled")) continue;
    if (control instanceof HTMLSelectElement && control.multiple)
      multiSelects.add(control.name);
    if (control instanceof HTMLInputElement && control.type === "checkbox")
      checkboxes.add(control.name);
  }
  for (const name of new Set([...data.keys(), ...multiSelects])) {
    const entries = data
      .getAll(name)
      .filter((value): value is string => typeof value === "string");
    if (multiSelects.has(name)) values[name] = entries;
    else if (entries.length > 1) values[name] = entries;
    else if (entries.length) values[name] = entries[0];
  }
  for (const name of checkboxes) {
    if (!(name in values)) values[name] = false;
  }
  return values;
}

/** Include Fieldset names so descendants can be cleared when a parent hides. */
export function getVisibleFieldNames(
  fields: readonly ConditionalFormField[] | undefined,
  steps: readonly ConditionalFormStep[] | undefined,
  values: FormConditionValues,
): Set<string> {
  const names = new Set<string>();
  const visit = (items: readonly ConditionalFormField[] | undefined) => {
    for (const field of items ?? []) {
      if (!isFormVisibilityConditionMet(field.visibilityCondition, values))
        continue;
      if (field.name) names.add(field.name);
      if (field.fieldType === "fieldset") visit(field.fields);
    }
  };
  getGroups(fields, steps).forEach(visit);
  return names;
}

/** Labels for live-region announcements; only authored conditional targets. */
export function getVisibleConditionalLabels(
  fields: readonly ConditionalFormField[] | undefined,
  steps: readonly ConditionalFormStep[] | undefined,
  values: FormConditionValues,
): Map<string, string> {
  const labels = new Map<string, string>();
  const visit = (items: readonly ConditionalFormField[] | undefined) => {
    for (const field of items ?? []) {
      if (!isFormVisibilityConditionMet(field.visibilityCondition, values))
        continue;
      if (field.visibilityCondition && field.name) {
        const label =
          field.fieldType === "fieldset"
            ? typeof field.legend === "string"
              ? field.legend
              : undefined
            : "label" in field && typeof field.label === "string"
              ? field.label
              : undefined;
        labels.set(field.name, label || field.name);
      }
      if (field.fieldType === "fieldset") visit(field.fields);
    }
  };
  getGroups(fields, steps).forEach(visit);
  return labels;
}

/** Strip metadata and remove hidden controls from Mino's render tree. */
export function filterVisibleFormFields(
  fields: readonly ConditionalFormField[] | undefined,
  values: FormConditionValues,
  clearedNames: ReadonlySet<string>,
): FormFieldConfig[] {
  const output: FormFieldConfig[] = [];
  for (const field of fields ?? []) {
    if (!isFormVisibilityConditionMet(field.visibilityCondition, values))
      continue;
    const { visibilityCondition: _condition, ...nativeField } = field;
    void _condition;
    if (field.fieldType === "fieldset") {
      output.push({
        ...nativeField,
        fieldType: "fieldset",
        fields: filterVisibleFormFields(field.fields, values, clearedNames),
      } as FieldsetFieldConfig);
      continue;
    }
    // A previously hidden field is remounted with an empty state, rather than
    // restoring its original authored default value/checked state.
    if (field.name && clearedNames.has(field.name)) {
      const cleared = { ...nativeField } as FormFieldConfig;

      Reflect.deleteProperty(cleared, "defaultValue");
      Reflect.deleteProperty(cleared, "defaultChecked");
      Reflect.deleteProperty(cleared, "defaultValues");

      output.push(cleared);
    } else {
      output.push(nativeField as FormFieldConfig);
    }
  }
  return output;
}
