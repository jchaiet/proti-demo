/** Server-side validation for the public CMS Form Block. No client schema is trusted. */
import {
  isFormVisibilityConditionMet,
  type FormConditionValues,
  type FormVisibilityCondition,
} from "./conditions";

export interface PublishedFormField {
  _type: string;
  name?: string;
  type?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  minDate?: string;
  maxDate?: string;
  multiple?: boolean;
  options?: { value?: string; disabled?: boolean }[];
  fields?: PublishedFormField[];
  visibilityCondition?: FormVisibilityCondition | null;
}

export interface PublishedFormDefinition {
  _key: string;
  /** Trusted published CMS selection, never taken from the browser. */
  webhookDestination?: string;
  formMode?: string;
  fields?: PublishedFormField[];
  steps?: { fields?: PublishedFormField[] }[];
}

export type SubmittedValue = string | string[];
export type SubmittedValues = Record<string, SubmittedValue>;

export type ValidationResult =
  | { ok: true; values: SubmittedValues }
  | {
      ok: false;
      error: string;
      code?: "unsupported_file_upload" | "invalid_configuration";
    };

const SUBMITTABLE = new Set([
  "formInputField",
  "formTextareaField",
  "formCheckboxField",
  "formDatePickerField",
  "formCalendarField",
  "formFileUploadField",
  "formRadioGroupField",
  "formRangeField",
  "formSelectField",
  "formSwitchField",
  "formHiddenField",
]);
// Matches the fields where Studio exposes the condition authoring control.
const CONDITIONAL_TARGETS = new Set([
  "formInputField",
  "formTextareaField",
  "formCheckboxField",
  "formDatePickerField",
  "formCalendarField",
  "formRadioGroupField",
  "formRangeField",
  "formSelectField",
  "formSwitchField",
  "formFieldset",
]);

/** True if an enabled File Upload exists in the published form field tree. */
export function hasActiveFileUploads(fields: unknown, depth = 0): boolean {
  if (!Array.isArray(fields) || depth > 4) return false;
  return fields.some((field: unknown) => {
    if (!field || typeof field !== "object") return false;
    const item = field as {
      _type?: string;
      disabled?: boolean;
      fields?: unknown;
    };
    if (item.disabled) return false;
    if (item._type === "formFileUploadField") return true;
    return (
      item._type === "formFieldset" &&
      hasActiveFileUploads(item.fields, depth + 1)
    );
  });
}

const MAX_FIELDS = 100;
const MAX_STRING_LENGTH = 10_000;

/** The ordered field tree is indexed before any visitor-supplied answer is trusted. */
interface IndexedField {
  field: PublishedFormField;
  order: number;
  /** Conditions on containing Fieldsets (all must match). */
  parentConditions: FormVisibilityCondition[];
}

function indexEnabledFields(
  fields: PublishedFormField[] | undefined,
): { nodes: IndexedField[]; inputs: IndexedField[] } | null {
  const nodes: IndexedField[] = [];
  const inputs: IndexedField[] = [];
  let order = 0;
  let valid = true;

  const visit = (
    entries: PublishedFormField[] | undefined,
    parents: FormVisibilityCondition[],
    depth: number,
  ) => {
    if (!Array.isArray(entries) || depth > 4) {
      valid = false;
      return;
    }
    for (const field of entries) {
      if (
        !field ||
        typeof field !== "object" ||
        typeof field._type !== "string"
      ) {
        valid = false;
        return;
      }
      if (field.disabled) continue;
      if (
        field.visibilityCondition != null &&
        !CONDITIONAL_TARGETS.has(field._type)
      ) {
        valid = false;
        return;
      }
      const indexed = { field, order: order++, parentConditions: parents };
      if (field._type === "formFieldset") {
        nodes.push(indexed);
        visit(
          field.fields,
          field.visibilityCondition == null
            ? parents
            : [...parents, field.visibilityCondition],
          depth + 1,
        );
      } else if (SUBMITTABLE.has(field._type)) {
        nodes.push(indexed);
        inputs.push(indexed);
      }
    }
  };
  visit(fields, [], 0);
  return valid ? { nodes, inputs } : null;
}

/**
 * Recheck CMS-authored condition contracts at the API boundary. An outdated,
 * malformed or manually edited published record cannot bypass Studio rules.
 * In particular, do not evaluate notEquals against an invalid option, since
 * that would make an unintended branch visible.
 */
function validPublishedConditions(
  nodes: IndexedField[],
  inputByName: ReadonlyMap<string, IndexedField>,
): boolean {
  for (const target of nodes) {
    const condition = target.field.visibilityCondition;
    if (condition == null) continue;
    if (typeof condition !== "object" || Array.isArray(condition)) return false;
    const { sourceField, operator, value } = condition;
    if (
      typeof sourceField !== "string" ||
      !sourceField.trim() ||
      typeof value !== "string" ||
      !value.trim() ||
      !["equals", "notEquals", "contains"].includes(operator)
    )
      return false;

    const source = inputByName.get(sourceField);
    if (
      !source ||
      source.order >= target.order ||
      source.field.name !== sourceField ||
      source.field.visibilityCondition != null ||
      source.parentConditions.length > 0
    )
      return false;

    const trigger = source.field;
    if (trigger._type === "formSelectField" && trigger.multiple) {
      if (operator !== "contains") return false;
    } else {
      if (operator === "contains") return false;
      if (
        trigger._type !== "formSelectField" &&
        trigger._type !== "formRadioGroupField" &&
        trigger._type !== "formCheckboxField"
      )
        return false;
    }

    const options =
      trigger._type === "formCheckboxField"
        ? [trigger.value ?? "on"]
        : (trigger.options
            ?.filter((option) => !option.disabled)
            .map((option) => option.value) ?? []);
    if (!options.includes(value)) return false;
  }
  return true;
}

function isNodeVisible(
  node: IndexedField,
  values: FormConditionValues,
): boolean {
  return (
    node.parentConditions.every((condition) =>
      isFormVisibilityConditionMet(condition, values),
    ) && isFormVisibilityConditionMet(node.field.visibilityCondition, values)
  );
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isAllowedValue(value: string, field: PublishedFormField): boolean {
  const type = field._type;
  const options =
    field.options
      ?.filter((option) => !option.disabled)
      .map((option) => option.value) ?? [];

  if (type === "formHiddenField") return value === (field.value ?? "");
  if (type === "formFileUploadField") return false;
  // Native form controls submit an empty string for optional unfilled inputs.
  if (
    value === "" &&
    !field.required &&
    type !== "formCheckboxField" &&
    type !== "formSwitchField"
  )
    return true;
  if (type === "formCheckboxField" || type === "formSwitchField")
    return value === (field.value ?? "on");
  if (type === "formRadioGroupField" || type === "formSelectField")
    return options.includes(value);

  if (type === "formInputField") {
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return false;
    if (field.type === "url") {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") return false;
      } catch {
        return false;
      }
    }
  }

  if (type === "formDatePickerField" || type === "formCalendarField") {
    if (!isValidDate(value)) return false;
    const minimum = type === "formCalendarField" ? field.minDate : field.min;
    const maximum = type === "formCalendarField" ? field.maxDate : field.max;
    if (typeof minimum === "string" && isValidDate(minimum) && value < minimum)
      return false;
    if (typeof maximum === "string" && isValidDate(maximum) && value > maximum)
      return false;
  }

  if (
    type === "formRangeField" ||
    (type === "formInputField" && field.type === "number")
  ) {
    if (value.trim() === "") return false;
    const number = Number(value);
    if (!Number.isFinite(number)) return false;
    if (typeof field.min === "number" && number < field.min) return false;
    if (typeof field.max === "number" && number > field.max) return false;
  }

  if (typeof field.minLength === "number" && value.length < field.minLength)
    return false;
  if (typeof field.maxLength === "number" && value.length > field.maxLength)
    return false;
  return true;
}

/**
 * Only the trusted published field tree controls which values can be
 * forwarded. First validate condition triggers; then evaluate visibility;
 * finally validate and forward visible inputs. Known hidden inputs are
 * discarded (including stale/forged answers), unknown keys are rejected.
 */
export function validateFormValues(
  form: PublishedFormDefinition,
  raw: unknown,
): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid fields." };
  }

  const configuredFields =
    form.formMode === "stepped"
      ? form.steps?.flatMap((step) => step.fields ?? [])
      : form.fields;
  // Preserve the fail-closed legacy upload behavior, even when an upload
  // sits inside a currently hidden conditional Fieldset.
  if (hasActiveFileUploads(configuredFields)) {
    return {
      ok: false,
      code: "unsupported_file_upload",
      error:
        "This form is unavailable because file attachments are not supported.",
    };
  }

  const indexed = indexEnabledFields(configuredFields);
  if (!indexed || indexed.inputs.length > MAX_FIELDS) {
    return {
      ok: false,
      code: "invalid_configuration",
      error: "Invalid form configuration.",
    };
  }

  const byName = new Map<string, IndexedField>();
  const namesLowercase = new Set<string>();
  for (const entry of indexed.inputs) {
    const name = entry.field.name;
    if (!name || name.length > 100 || namesLowercase.has(name.toLowerCase())) {
      return {
        ok: false,
        code: "invalid_configuration",
        error: "Invalid form configuration.",
      };
    }
    byName.set(name, entry);
    namesLowercase.add(name.toLowerCase());
  }
  if (!byName.size) return { ok: false, error: "Form contains no fields." };
  if (!validPublishedConditions(indexed.nodes, byName)) {
    return {
      ok: false,
      code: "invalid_configuration",
      error: "Invalid form configuration.",
    };
  }

  const supplied = raw as Record<string, unknown>;
  // An unrecognized or disabled field is always a client error, regardless of
  // the conditions. Never trust a browser-supplied field definition.
  for (const name of Object.keys(supplied)) {
    if (!byName.has(name)) return { ok: false, error: "Invalid field data." };
  }

  // Triggers must be validated *before* checking any notEquals conditions.
  // The only missing value treated as a selection is an unchecked Checkbox.
  const triggers = new Set<string>();
  for (const node of indexed.nodes) {
    if (node.field.visibilityCondition != null) {
      triggers.add(node.field.visibilityCondition.sourceField);
    }
  }
  const triggerValues: Record<string, string | string[] | boolean | undefined> =
    Object.create(null);
  for (const name of triggers) {
    const trigger = byName.get(name)!.field;
    const answer = supplied[name];
    if (answer === undefined) {
      triggerValues[name] =
        trigger._type === "formCheckboxField" ? false : undefined;
      continue;
    }
    const parsed = validateValue(answer, trigger);
    if (parsed === null) {
      return { ok: false, error: "One or more field values are invalid." };
    }
    triggerValues[name] = parsed;
  }

  const values = Object.create(null) as SubmittedValues;
  for (const [name, indexedField] of byName) {
    // Do not inspect or forward a hidden answer, even if a client bypasses the
    // FormBlock and explicitly includes that key in its JSON payload.
    if (!isNodeVisible(indexedField, triggerValues)) continue;
    const field = indexedField.field;
    const answer = supplied[name];
    if (answer !== undefined) {
      const parsed = validateValue(answer, field);
      if (parsed === null) {
        return { ok: false, error: "One or more field values are invalid." };
      }
      values[name] = parsed;
    }
    if (
      field.required &&
      (values[name] === undefined ||
        values[name] === "" ||
        (Array.isArray(values[name]) && values[name].length === 0))
    ) {
      return { ok: false, error: "Please complete all required fields." };
    }
  }
  return { ok: true, values };
}

/** Validate a single browser value against the already trusted field config. */
function validateValue(
  rawValue: unknown,
  field: PublishedFormField,
): SubmittedValue | null {
  if (!(typeof rawValue === "string" || Array.isArray(rawValue))) return null;
  const items: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];
  if (
    items.length > 30 ||
    items.some(
      (item) => typeof item !== "string" || item.length > MAX_STRING_LENGTH,
    )
  )
    return null;
  if (
    items.length !== 1 &&
    !(field._type === "formSelectField" && field.multiple)
  )
    return null;
  const strings = items as string[];
  if (strings.some((item) => !isAllowedValue(item, field))) return null;
  return field._type === "formSelectField" && field.multiple
    ? strings
    : strings[0];
}
