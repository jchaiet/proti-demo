import {defineArrayMember, defineField, defineType} from 'sanity'

import {validateNavigationItemDestination} from '../validation/linkDestination'

export const navigationItemType = defineType({
  name: 'navigationItem',
  title: 'Navigation Item',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description:
        'Optional when this item only opens a dropdown. Required for a normal top-level link.',
    }),

    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'string',
      description: 'Optional short label such as New or Beta.',
      validation: (rule) => rule.max(40),
    }),

    defineField({
      name: 'children',
      title: 'Dropdown Items',
      type: 'array',
      description: 'Optional one-level dropdown. This mirrors the mino Navigation component.',
      of: [
        defineArrayMember({
          type: 'navigationSubItem',
        }),
      ],
      validation: (rule) => rule.max(12),
    }),
  ],

  validation: (rule) => rule.custom((value) => validateNavigationItemDestination(value)),

  preview: {
    select: {
      title: 'label',
      badge: 'badge',
      children: 'children',
    },

    prepare({title, badge, children}) {
      const count = Array.isArray(children) ? children.length : 0

      return {
        title: title ?? 'Untitled Navigation Item',
        subtitle: [
          count > 0 ? `${count} dropdown item${count === 1 ? '' : 's'}` : 'Top-level link',
          badge ? `Badge: ${badge}` : undefined,
        ]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
