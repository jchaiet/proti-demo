import {defineField, defineType} from 'sanity'

import {validateNonBlankText} from './validation'

/**
 * One visibility condition per field. Source names refer to earlier, unconditional
 * select/radio/checkbox fields in the same form (including earlier steps).
 * See docs/CONDITIONAL_FORMS.md for the staged rollout and operator semantics.
 */
export const formVisibilityConditionType = defineType({
  name: 'formVisibilityCondition',
  title: 'Visibility Condition',
  type: 'object',
  fields: [
    defineField({
      name: 'sourceField',
      title: 'Trigger Field Name',
      type: 'string',
      description:
        'Use the exact Field Name of an earlier, unconditional Select, Radio Group, or Checkbox in this form. For stepped forms, it can be in an earlier step.',
      validation: (Rule) =>
        Rule.required().custom((value) => validateNonBlankText(value, 'Trigger Field Name')),
    }),
    defineField({
      name: 'operator',
      title: 'Match Rule',
      type: 'string',
      initialValue: 'equals',
      options: {
        list: [
          {title: 'Equals', value: 'equals'},
          {title: 'Does Not Equal', value: 'notEquals'},
          {title: 'Contains Selection (multiple select only)', value: 'contains'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'value',
      title: 'Option Value',
      type: 'string',
      description:
        'Enter the exact submitted option value (not its label). For Checkbox, use its Submitted Value, usually "on".',
      validation: (Rule) =>
        Rule.required().custom((value) => validateNonBlankText(value, 'Option Value')),
    }),
  ],
  preview: {
    select: {sourceField: 'sourceField', operator: 'operator', value: 'value'},
    prepare({sourceField, operator, value}) {
      return {
        title: 'Show when…',
        subtitle: `${sourceField || 'Select a trigger'} ${operator || 'equals'} ${value || '?'}`,
      }
    },
  },
})
