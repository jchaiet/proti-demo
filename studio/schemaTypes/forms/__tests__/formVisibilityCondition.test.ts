import {describe, expect, it} from 'vitest'

import {formVisibilityConditionType} from '../formVisibilityConditionType'
import {
  type FormFieldLike,
  validateFormVisibilityConditions,
  validateSingleFormFields,
  validateSteppedFormSteps,
} from '../validation'
import {schemaTypes} from '../../index'
import {formInputFieldType} from '../formInputFieldType'
import {formFieldsetType} from '../formFieldsetType'
import {formSelectFieldType} from '../formSelectFieldType'

const select = {
  _type: 'formSelectField',
  name: 'interest',
  options: [{value: 'nutrition'}, {value: 'fitness'}, {value: 'hidden', disabled: true}],
}
const branch = {
  _type: 'formInputField',
  name: 'goals',
  visibilityCondition: {sourceField: 'interest', operator: 'equals', value: 'nutrition'},
}
const result = (fields: unknown) => validateFormVisibilityConditions(fields)

describe('Conditional form authoring contract (Batch 2A)', () => {
  it('registers one shared condition object and fields in the actual form schemas', () => {
    expect(schemaTypes).toContain(formVisibilityConditionType)
    const names = formVisibilityConditionType.fields.map((field) => field.name)
    expect(names).toEqual(['sourceField', 'operator', 'value'])
    const operatorField = formVisibilityConditionType.fields.find(
      (field) => field.name === 'operator',
    ) as {options?: {list?: Array<{value: string}>}} | undefined
    expect(operatorField?.options?.list?.map((option) => option.value)).toEqual([
      'equals',
      'notEquals',
      'contains',
    ])
    for (const schema of [formInputFieldType, formSelectFieldType, formFieldsetType]) {
      expect(schema.fields.map((field) => field.name)).toContain('visibilityCondition')
    }
  })

  it('accepts a previous single-select trigger and an exact configured value', () => {
    expect(result([select, branch])).toBe(true)
  })

  it('rejects unknown, future, and self-referencing trigger names', () => {
    expect(result([branch, select])).toContain('earlier')
    expect(
      result([
        select,
        {...branch, visibilityCondition: {...branch.visibilityCondition, sourceField: 'unknown'}},
      ]),
    ).toContain('earlier')
    expect(
      result([
        select,
        {...branch, visibilityCondition: {...branch.visibilityCondition, sourceField: 'goals'}},
      ]),
    ).toContain('earlier')
  })

  it('rejects disabled or conditional trigger fields (prevents chained/circular rules)', () => {
    expect(result([{...select, disabled: true}, branch])).toContain('enabled')
    expect(
      result([
        {...select, visibilityCondition: {sourceField: 'other', operator: 'equals', value: 'yes'}},
        branch,
      ]),
    ).not.toBe(true)
  })

  it('rejects unsupported field types and non-option values', () => {
    expect(result([{_type: 'formInputField', name: 'interest'}, branch])).toContain('enabled')
    expect(
      result([
        select,
        {...branch, visibilityCondition: {...branch.visibilityCondition, value: 'hidden'}},
      ]),
    ).toContain('enabled option')
    expect(
      result([
        select,
        {...branch, visibilityCondition: {...branch.visibilityCondition, value: 'Article'}},
      ]),
    ).toContain('enabled option')
  })

  it('requires contains for multiple-select, and rejects contains for radio/checkbox/single-select', () => {
    expect(result([{...select, multiple: true}, branch])).toContain('Contains Selection')
    expect(
      result([
        {...select, multiple: true},
        {...branch, visibilityCondition: {...branch.visibilityCondition, operator: 'contains'}},
      ]),
    ).toBe(true)
    expect(
      result([
        select,
        {...branch, visibilityCondition: {...branch.visibilityCondition, operator: 'contains'}},
      ]),
    ).toContain('multiple-select')
  })

  it('supports checkbox triggers with configured or default submitted values', () => {
    const cond = {
      ...branch,
      visibilityCondition: {...branch.visibilityCondition, sourceField: 'optIn', value: 'on'},
    }
    expect(result([{_type: 'formCheckboxField', name: 'optIn'}, cond])).toBe(true)
    expect(
      result([
        {_type: 'formCheckboxField', name: 'optIn', value: 'yes'},
        {...cond, visibilityCondition: {...cond.visibilityCondition, value: 'yes'}},
      ]),
    ).toBe(true)
  })

  it('supports earlier-step fields and nested fieldsets but excludes disabled ancestors', () => {
    const steps: Array<{fields: FormFieldLike[]}> = [
      {fields: [select]},
      {fields: [{_type: 'formFieldset', name: 'details', fields: [branch]}]},
    ]
    expect(result(steps.flatMap((step) => step.fields))).toBe(true)
    expect(result([{_type: 'formFieldset', disabled: true, fields: [select]}, branch])).toContain(
      'enabled',
    )
  })

  it('allows valid conditional and unconditional forms to be published', () => {
    expect(validateSingleFormFields([select, {_type: 'formInputField', name: 'goals'}])).toBe(true)
    expect(validateSingleFormFields([select, branch])).toBe(true)
    expect(
      validateSteppedFormSteps([
        {title: 'First', fields: [select]},
        {title: 'Second', fields: [branch]},
      ]),
    ).toBe(true)
    expect(
      validateSingleFormFields([
        select,
        {...branch, visibilityCondition: {...branch.visibilityCondition, value: 'unknown'}},
      ]),
    ).not.toBe(true)
  })
})
