export interface FormOptionLike {
  value?: unknown
}

export interface FormFieldLike {
  _type?: string
  name?: unknown
  disabled?: boolean
  fields?: unknown
  visibilityCondition?: unknown
  options?: unknown
  multiple?: boolean
  value?: unknown
}

export interface FormStepLike {
  title?: unknown
  fields?: unknown
}

const SUBMITTABLE_FIELD_TYPES = new Set([
  'formInputField',
  'formTextareaField',
  'formCheckboxField',
  'formDatePickerField',
  'formCalendarField',
  'formFileUploadField',
  'formRadioGroupField',
  'formRangeField',
  'formSelectField',
  'formSwitchField',
  'formHiddenField',
])

function asFields(value: unknown): FormFieldLike[] {
  return Array.isArray(value) ? (value as FormFieldLike[]) : []
}

function normalizedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()

  return normalized || undefined
}

function collectSubmittableFields(value: unknown): FormFieldLike[] {
  const result: FormFieldLike[] = []

  for (const field of asFields(value)) {
    if (field?._type === 'formFieldset') {
      result.push(...collectSubmittableFields(field.fields))
      continue
    }

    if (field?._type && SUBMITTABLE_FIELD_TYPES.has(field._type)) {
      result.push(field)
    }
  }

  return result
}

function collectFieldsets(value: unknown): FormFieldLike[] {
  const result: FormFieldLike[] = []

  for (const field of asFields(value)) {
    if (field?._type !== 'formFieldset') {
      continue
    }

    result.push(field)
    result.push(...collectFieldsets(field.fields))
  }

  return result
}

function duplicateValues(values: Array<string | undefined>, caseInsensitive = false): string[] {
  const counts = new Map<string, {display: string; count: number}>()

  for (const value of values) {
    if (!value) {
      continue
    }

    const key = caseInsensitive ? value.toLowerCase() : value
    const current = counts.get(key)

    if (current) {
      current.count += 1
    } else {
      counts.set(key, {
        display: value,
        count: 1,
      })
    }
  }

  return Array.from(counts.values())
    .filter(({count}) => count > 1)
    .map(({display}) => display)
    .sort((a, b) => a.localeCompare(b))
}

function quotedList(values: string[]): string {
  return values.map((value) => `“${value}”`).join(', ')
}

function optionValues(options: unknown): string[] {
  if (!Array.isArray(options)) {
    return []
  }

  return options
    .map((option) => normalizedString((option as FormOptionLike | undefined)?.value))
    .filter((value): value is string => Boolean(value))
}

function parseDate(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value) {
    return undefined
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : undefined
}

function formatStepLabel(step: FormStepLike, index: number): string {
  const title = normalizedString(step.title)

  return title ? `Step ${index + 1} (“${title}”)` : `Step ${index + 1}`
}

export function validateNonBlankText(value: unknown, label: string): true | string {
  if (value === undefined || value === null) {
    return true
  }

  if (normalizedString(value)) {
    return true
  }

  return `${label} cannot be empty or contain only whitespace.`
}

export function validateSubmittedFieldName(value: unknown): true | string {
  return validateNonBlankText(value, 'Field Name')
}

export function validateUniqueSubmittedFieldNames(value: unknown): true | string {
  const duplicates = duplicateValues(
    collectSubmittableFields(value).map((field) => normalizedString(field.name)),
    true,
  )

  if (duplicates.length === 0) {
    return true
  }

  return `Submitted field names must be unique across the entire form. Duplicate name${
    duplicates.length === 1 ? '' : 's'
  }: ${quotedList(duplicates)}.`
}

export function validateUniqueFieldsetKeys(value: unknown): true | string {
  const duplicates = duplicateValues(
    collectFieldsets(value).map((field) => normalizedString(field.name)),
    true,
  )

  if (duplicates.length === 0) {
    return true
  }

  return `Fieldset Keys must be unique across the entire form. Duplicate key${
    duplicates.length === 1 ? '' : 's'
  }: ${quotedList(duplicates)}.`
}

export function validateContainsSubmittableField(value: unknown, label = 'Form'): true | string {
  if (collectSubmittableFields(value).length > 0) {
    return true
  }

  return `${label} must contain at least one submittable field. Divider and Spacer do not submit values.`
}

/**
 * Legacy File Upload entries must stay in the schema so Sanity can display
 * existing content. No storage adapter is installed: prevent new publishes
 * that would offer visitors a form which cannot accept attachments.
 * Disabled uploads (or uploads inside disabled Fieldsets) are safe to retain.
 */
export function validateUnsupportedFileUploads(value: unknown): true | string {
  function hasActiveUpload(fields: unknown, depth = 0): boolean {
    if (depth > 4) return false
    return asFields(fields).some((field) => {
      if (!field || field.disabled) return false
      if (field._type === 'formFileUploadField') return true
      return field._type === 'formFieldset' && hasActiveUpload(field.fields, depth + 1)
    })
  }

  return hasActiveUpload(value)
    ? 'File Upload is unavailable without a storage adapter. Disable or remove the File Upload field before publishing this form.'
    : true
}

/**
 * Batch 2A authoring contract. Conditions reference an earlier, unconditional
 * enabled Select, Radio Group, or Checkbox. Conditional trigger chains are
 * intentionally disallowed in v1 to avoid cycles and ambiguous step state.
 * Validation is shared by single-page and stepped forms.
 */
export function validateFormVisibilityConditions(fields: unknown): true | string {
  interface IndexedField {
    field: FormFieldLike
    disabledByAncestor: boolean
    conditionalByAncestor: boolean
  }

  const ordered: IndexedField[] = []

  function visit(
    entries: unknown,
    disabledByAncestor = false,
    conditionalByAncestor = false,
    depth = 0,
  ): void {
    if (depth > 4) return
    for (const field of asFields(entries)) {
      if (!field || typeof field !== 'object') continue
      const entry = {
        field,
        disabledByAncestor,
        conditionalByAncestor,
      }
      ordered.push(entry)
      if (field._type === 'formFieldset') {
        visit(
          field.fields,
          disabledByAncestor || field.disabled === true,
          conditionalByAncestor || field.visibilityCondition != null,
          depth + 1,
        )
      }
    }
  }
  visit(fields)

  const recognized = new Map<string, {field: FormFieldLike; index: number; eligible: boolean}>()
  for (let index = 0; index < ordered.length; index += 1) {
    const {field, disabledByAncestor, conditionalByAncestor} = ordered[index]
    const name = normalizedString(field.name)
    if (!name || recognized.has(name.toLowerCase())) continue
    const allowed = ['formSelectField', 'formRadioGroupField', 'formCheckboxField'].includes(
      field._type ?? '',
    )
    recognized.set(name.toLowerCase(), {
      field,
      index,
      eligible:
        allowed &&
        !disabledByAncestor &&
        !conditionalByAncestor &&
        field.disabled !== true &&
        field.visibilityCondition == null,
    })
  }

  for (let index = 0; index < ordered.length; index += 1) {
    const {field, disabledByAncestor} = ordered[index]
    if (disabledByAncestor || field.disabled === true || field.visibilityCondition == null) {
      continue
    }
    const label =
      normalizedString(field.name) ?? (field._type === 'formFieldset' ? 'Fieldset' : 'Field')
    const condition = field.visibilityCondition
    if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
      return `Visibility Condition for “${label}” is invalid.`
    }
    const {sourceField, operator, value} = condition as Record<string, unknown>
    if (
      typeof sourceField !== 'string' ||
      !sourceField.trim() ||
      typeof value !== 'string' ||
      !value.trim() ||
      !['equals', 'notEquals', 'contains'].includes(String(operator))
    ) {
      return `Visibility Condition for “${label}” needs a trigger name, valid operator, and option value.`
    }
    const trigger = recognized.get(sourceField.toLowerCase())
    if (!trigger || trigger.field.name !== sourceField || trigger.index >= index) {
      return `Visibility Condition for “${label}” must reference an earlier Trigger Field Name: “${sourceField}”.`
    }
    if (!trigger.eligible) {
      return `Visibility Condition for “${label}” must reference an enabled, unconditional Select, Radio Group, or Checkbox.`
    }
    if (trigger.field._type === 'formSelectField' && trigger.field.multiple === true) {
      if (operator !== 'contains') {
        return `Visibility Condition for “${label}” must use Contains Selection for a multiple-select trigger.`
      }
    } else if (operator === 'contains') {
      return `Visibility Condition for “${label}” can only use Contains Selection with a multiple-select trigger.`
    }
    const allowedValues =
      trigger.field._type === 'formCheckboxField'
        ? [typeof trigger.field.value === 'string' ? trigger.field.value : 'on']
        : Array.isArray(trigger.field.options)
          ? trigger.field.options
              .filter(
                (option) =>
                  option &&
                  typeof option === 'object' &&
                  (option as {disabled?: boolean}).disabled !== true,
              )
              .map((option) => (option as FormOptionLike).value)
          : []
    if (!allowedValues.includes(value)) {
      return `Visibility Condition for “${label}” must match an enabled option value on “${sourceField}”.`
    }
  }
  return true
}

export function validateSingleFormFields(value: unknown): true | string {
  const uploads = validateUnsupportedFileUploads(value)
  if (uploads !== true) return uploads

  const containsField = validateContainsSubmittableField(value)

  if (containsField !== true) {
    return containsField
  }

  const uniqueNames = validateUniqueSubmittedFieldNames(value)

  if (uniqueNames !== true) {
    return uniqueNames
  }

  const keys = validateUniqueFieldsetKeys(value)
  if (keys !== true) return keys

  const conditions = validateFormVisibilityConditions(value)
  if (conditions !== true) return conditions
  return true
}

export function validateSteppedFormSteps(value: unknown): true | string {
  if (!Array.isArray(value)) {
    return true
  }

  const steps = value as FormStepLike[]

  for (let index = 0; index < steps.length; index += 1) {
    const result = validateContainsSubmittableField(
      steps[index]?.fields,
      formatStepLabel(steps[index] ?? {}, index),
    )

    if (result !== true) {
      return result
    }
  }

  const allFields = steps.flatMap((step) => asFields(step?.fields))
  const uploads = validateUnsupportedFileUploads(allFields)
  if (uploads !== true) return uploads

  const uniqueNames = validateUniqueSubmittedFieldNames(allFields)

  if (uniqueNames !== true) {
    return uniqueNames
  }

  const keys = validateUniqueFieldsetKeys(allFields)
  if (keys !== true) return keys

  const conditions = validateFormVisibilityConditions(allFields)
  if (conditions !== true) return conditions
  return true
}

export function validateUniqueOptionValues(options: unknown): true | string {
  const duplicates = duplicateValues(optionValues(options))

  if (duplicates.length === 0) {
    return true
  }

  return `Option values must be unique. Duplicate value${
    duplicates.length === 1 ? '' : 's'
  }: ${quotedList(duplicates)}.`
}

export function validateDefaultOptionValue(value: unknown, options: unknown): true | string {
  const defaultValue = normalizedString(value)

  if (!defaultValue) {
    return true
  }

  if (optionValues(options).includes(defaultValue)) {
    return true
  }

  return `Default Value must match one of the configured option values. “${defaultValue}” was not found.`
}

export function validateDefaultOptionValues(value: unknown, options: unknown): true | string {
  if (!Array.isArray(value) || value.length === 0) {
    return true
  }

  const defaults = value.map(normalizedString)

  if (defaults.some((item) => !item)) {
    return 'Default Values cannot contain empty values.'
  }

  const normalizedDefaults = defaults as string[]
  const duplicateDefaults = duplicateValues(normalizedDefaults)

  if (duplicateDefaults.length > 0) {
    return `Default Values must not contain duplicates. Duplicate value${
      duplicateDefaults.length === 1 ? '' : 's'
    }: ${quotedList(duplicateDefaults)}.`
  }

  const configuredValues = new Set(optionValues(options))
  const missing = normalizedDefaults.filter((item) => !configuredValues.has(item))

  if (missing.length === 0) {
    return true
  }

  return `Every Default Value must match a configured option value. Not found: ${quotedList(
    missing,
  )}.`
}

export function validateNumericMinMax(
  min: unknown,
  max: unknown,
  minLabel = 'Minimum',
  maxLabel = 'Maximum',
): true | string {
  if (typeof min !== 'number' || typeof max !== 'number') {
    return true
  }

  if (min <= max) {
    return true
  }

  return `${minLabel} cannot be greater than ${maxLabel}.`
}

export function validateDateMinMax(
  min: unknown,
  max: unknown,
  minLabel = 'Minimum Date',
  maxLabel = 'Maximum Date',
): true | string {
  const minDate = parseDate(min)
  const maxDate = parseDate(max)

  if (minDate === undefined || maxDate === undefined || minDate <= maxDate) {
    return true
  }

  return `${minLabel} cannot be later than ${maxLabel}.`
}

export function validateNumericDefaultWithinBounds(
  value: unknown,
  min: unknown,
  max: unknown,
): true | string {
  if (typeof value !== 'number') {
    return true
  }

  if (typeof min === 'number' && value < min) {
    return 'Default Value cannot be less than Minimum.'
  }

  if (typeof max === 'number' && value > max) {
    return 'Default Value cannot be greater than Maximum.'
  }

  return true
}

export function validateNumericInputDefaultWithinBounds(
  value: unknown,
  min: unknown,
  max: unknown,
): true | string {
  if (value === undefined || value === null || value === '') {
    return true
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return 'Default Value must be a valid number.'
  }

  const numericValue = typeof value === 'number' ? value : Number(value.trim())

  if (!Number.isFinite(numericValue)) {
    return 'Default Value must be a valid number.'
  }

  return validateNumericDefaultWithinBounds(numericValue, min, max)
}

export function validateDateDefaultWithinBounds(
  value: unknown,
  min: unknown,
  max: unknown,
): true | string {
  const defaultDate = parseDate(value)

  if (defaultDate === undefined) {
    return true
  }

  const minDate = parseDate(min)
  const maxDate = parseDate(max)

  if (minDate !== undefined && defaultDate < minDate) {
    return 'Default Date cannot be earlier than Minimum Date.'
  }

  if (maxDate !== undefined && defaultDate > maxDate) {
    return 'Default Date cannot be later than Maximum Date.'
  }

  return true
}
