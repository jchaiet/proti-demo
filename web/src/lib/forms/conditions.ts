/**
 * Pure condition matcher shared by client rendering and trusted submission
 * validation. It intentionally performs no DOM or Sanity access.
 * The Studio schema validates field references and supported operators.
 */
export type FormVisibilityOperator = "equals" | "notEquals" | "contains";

export interface FormVisibilityCondition {
  sourceField: string;
  operator: FormVisibilityOperator;
  value: string;
}

/**
 * A checkbox's explicit `false` represents an unchecked (known) value.
 * An absent/undefined value represents an unanswered question.
 */
export type FormConditionInput =
  | string
  | readonly string[]
  | boolean
  | null
  | undefined;
export type FormConditionValues = Readonly<Record<string, FormConditionInput>>;

export function isFormVisibilityConditionMet(
  condition: FormVisibilityCondition | null | undefined,
  values: FormConditionValues,
): boolean {
  if (condition == null) return true;

  // Fail closed on malformed CMS configuration, rather than exposing fields.
  if (
    !condition.sourceField ||
    typeof condition.sourceField !== "string" ||
    typeof condition.value !== "string" ||
    condition.value.length === 0 ||
    !["equals", "notEquals", "contains"].includes(condition.operator)
  )
    return false;

  const selection = values[condition.sourceField];
  if (selection == null) return false;

  if (condition.operator === "contains") {
    // This operator refers to multi-select option membership, not substrings.
    return Array.isArray(selection) && selection.includes(condition.value);
  }

  if (Array.isArray(selection)) return false;
  if (selection === "") return false;

  // The form adapter/server supplies the checkbox's configured submitted
  // string when checked, and boolean false when explicitly unchecked.
  const matches = selection === condition.value;
  return condition.operator === "equals" ? matches : !matches;
}
