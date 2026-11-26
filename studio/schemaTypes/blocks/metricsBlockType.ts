import {defineArrayMember, defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'

export const metricsBlockType = defineType({
  name: 'metricsBlock',
  title: 'Metrics / Statistics',
  type: 'object',
  groups: [{name: 'styles', title: 'Styles'}],
  fields: [
    defineField({
      name: 'heading',
      title: 'Section Heading',
      type: 'sectionHeading',
      description: 'Optional eyebrow, title and supporting introduction.',
    }),
    defineField({
      name: 'variant',
      title: 'Appearance',
      type: 'string',
      initialValue: 'default',
      options: {
        layout: 'radio',
        list: [
          {title: 'Default', value: 'default'},
          {title: 'Cards', value: 'cards'},
          {title: 'Divided', value: 'divided'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alignment',
      title: 'Content Alignment',
      type: 'string',
      initialValue: 'center',
      options: {
        layout: 'radio',
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
      },
    }),
    defineField({
      name: 'columns',
      title: 'Desktop Columns',
      type: 'number',
      description: 'Small screens automatically reduce to two or one column.',
      initialValue: 3,
      options: {list: [2, 3, 4].map((value) => ({title: `${value} columns`, value}))},
      validation: (rule) => rule.required().integer().min(2).max(4),
    }),
    defineField({
      name: 'metrics',
      title: 'Metrics',
      type: 'array',
      of: [defineArrayMember({type: 'metricItem'})],
      validation: (rule) => rule.required().min(1).max(12),
    }),
    defineField({
      name: 'styles',
      title: 'Block Styles',
      type: 'blockStyles',
      group: 'styles',
      description: 'Optional shared spacing, background and width overrides.',
    }),
  ],
  preview: {
    select: {title: 'heading.title', metrics: 'metrics', variant: 'variant'},
    prepare({title, metrics, variant}) {
      const name = portableTextToPlainText(title)
      const count = Array.isArray(metrics) ? metrics.length : 0
      return {
        title: name || 'Metrics / Statistics',
        subtitle: `${count} metric${count === 1 ? '' : 's'} · ${variant ?? 'default'}`,
      }
    },
  },
})
