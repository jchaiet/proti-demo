import {defineField, defineType} from 'sanity'

import {validateRequiredLink} from '../validation/linkDestination'

export const ctaType = defineType({
  name: 'cta',
  title: 'Call to Action',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',

      validation: (rule) =>
        rule
          .required()
          .custom((value) => validateRequiredLink(value, 'CTA must have a destination.')),
    }),

    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',

      initialValue: 'primary',

      options: {
        list: [
          {
            title: 'Primary',
            value: 'primary',
          },
          {
            title: 'Secondary',
            value: 'secondary',
          },
          {
            title: 'Text Link',
            value: 'link',
          },
          {
            title: 'Glass',
            value: 'glass',
          },
        ],

        layout: 'radio',
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',

      initialValue: 'md',

      options: {
        list: [
          {
            title: 'Small',
            value: 'sm',
          },
          {
            title: 'Medium',
            value: 'md',
          },
          {
            title: 'Large',
            value: 'lg',
          },
        ],

        layout: 'radio',
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'inverted',
      title: 'Inverted',
      type: 'boolean',

      initialValue: false,

      description: 'Use the inverted button treatment for dark or image backgrounds.',
    }),

    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'iconPicker',

      description: 'Optional icon displayed alongside the button label.',
    }),

    defineField({
      name: 'iconAlignment',
      title: 'Icon Position',
      type: 'string',

      initialValue: 'right',

      hidden: ({parent}) => !parent?.icon || parent.icon === 'none',

      options: {
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],

        layout: 'radio',
      },
    }),
  ],

  preview: {
    select: {
      title: 'label',

      type: 'link.type',

      page: 'link.internalPage.title',

      url: 'link.externalUrl',

      email: 'link.email',

      phone: 'link.phone',

      anchor: 'link.anchor',

      icon: 'icon',
    },

    prepare({title, type, page, url, email, phone, anchor, icon}) {
      let destination = 'No destination'

      switch (type) {
        case 'internal':
          destination = page ?? 'Internal page'
          break

        case 'external':
          destination = url ?? 'External URL'
          break

        case 'email':
          destination = email ? `mailto:${email}` : 'Email'
          break

        case 'phone':
          destination = phone ? `tel:${phone}` : 'Phone'
          break

        case 'anchor':
          destination = anchor ? `#${anchor.replace(/^#/, '')}` : 'Anchor'
          break
      }

      const iconLabel = icon && icon !== 'none' ? ` · ${icon}` : ''

      return {
        title: title ?? 'Untitled CTA',

        subtitle: `${destination}${iconLabel}`,
      }
    },
  },
})
