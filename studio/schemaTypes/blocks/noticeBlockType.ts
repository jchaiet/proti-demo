import {defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'

export const noticeBlockType = defineType({
  name: 'noticeBlock',
  title: 'Notice / Callout',
  type: 'object',
  groups: [{name: 'styles', title: 'Styles'}],
  fields: [
    defineField({
      name: 'heading',
      title: 'Content',
      type: 'sectionHeading',
      description:
        'Add a title and/or description. Use the same Portable Text heading semantics as other blocks.',
    }),
    defineField({
      name: 'variant',
      title: 'Appearance',
      type: 'string',
      initialValue: 'neutral',
      options: {
        layout: 'radio',
        list: [
          {title: 'Neutral', value: 'neutral'},
          {title: 'Information', value: 'info'},
          {title: 'Success', value: 'success'},
          {title: 'Warning', value: 'warning'},
          {title: 'Promotion', value: 'promotion'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alignment',
      title: 'Content Alignment',
      type: 'string',
      initialValue: 'left',
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
      name: 'icon',
      title: 'Optional Icon',
      type: 'iconPicker',
      description:
        'Decorative only. Do not rely on the icon alone to communicate a warning or instruction.',
    }),
    defineField({
      name: 'ctaGroup',
      title: 'Calls to Action',
      type: 'ctaGroup',
    }),
    defineField({
      name: 'styles',
      title: 'Block Styles',
      type: 'blockStyles',
      group: 'styles',
      description: 'Optional shared spacing, background, and width overrides.',
    }),
  ],
  validation: (rule) =>
    rule.custom((block) => {
      if (!block) return true
      const typedBlock = block as {heading?: {title?: unknown[]; description?: unknown[]}}
      const heading = typedBlock.heading
      const hasText = Boolean(heading?.title?.length || heading?.description?.length)
      return hasText ? true : 'Add a title or description to make the notice meaningful.'
    }),
  preview: {
    select: {title: 'heading.title', description: 'heading.description', variant: 'variant'},
    prepare({title, description, variant}) {
      const label = portableTextToPlainText(title) || portableTextToPlainText(description)
      return {title: label || 'Notice / Callout', subtitle: `Notice · ${variant ?? 'neutral'}`}
    },
  },
})
