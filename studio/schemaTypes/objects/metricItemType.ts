import {defineField, defineType} from 'sanity'

export const metricItemType = defineType({
  name: 'metricItem',
  title: 'Metric',
  type: 'object',
  fields: [
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
      description:
        'Enter exactly what people should read, such as 95, 2M, or 24/7. Do not include the optional prefix or suffix.',
      validation: (rule) => rule.required().max(40),
    }),
    defineField({
      name: 'prefix',
      title: 'Prefix',
      type: 'string',
      description: 'Optional text before the value, such as $.',
      validation: (rule) => rule.max(16),
    }),
    defineField({
      name: 'suffix',
      title: 'Suffix',
      type: 'string',
      description: 'Optional text after the value, such as % or +.',
      validation: (rule) => rule.max(16),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Explain what this number represents. Avoid relying on the number alone.',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'description',
      title: 'Supporting Text',
      type: 'inlineRichText',
      description: 'Optional short explanation beneath the label.',
    }),
  ],
  preview: {
    select: {value: 'value', prefix: 'prefix', suffix: 'suffix', label: 'label'},
    prepare({value, prefix, suffix, label}) {
      return {title: `${prefix ?? ''}${value ?? 'Metric'}${suffix ?? ''}`, subtitle: label ?? ''}
    },
  },
})
