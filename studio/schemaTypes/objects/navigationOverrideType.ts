import {defineField, defineType} from 'sanity'

import {siteLocaleReferenceFilter} from '../validation/referenceFilters'

export const navigationOverrideType = defineType({
  name: 'navigationOverride',
  title: 'Navigation',
  type: 'object',

  fields: [
    defineField({
      name: 'mode',
      title: 'Navigation Behavior',
      type: 'string',
      initialValue: 'inherit',

      options: {
        layout: 'radio',
        list: [
          {
            title: 'Inherit Site Default',
            value: 'inherit',
          },
          {
            title: 'Custom Navigation',
            value: 'custom',
          },
          {
            title: 'No Navigation',
            value: 'none',
          },
        ],
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'navigationSet',
      title: 'Navigation Set',
      type: 'reference',

      to: [
        {
          type: 'navigationSet',
        },
      ],

      hidden: ({parent}) => parent?.mode !== 'custom',

      options: {
        disableNew: true,

        filter: ({document}) => siteLocaleReferenceFilter(document),
      },

      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as
            | {
                mode?: string
              }
            | undefined

          if (parent?.mode === 'custom' && !value) {
            return 'Select a Navigation Set when Custom Navigation is selected.'
          }

          return true
        }),
    }),
  ],

  preview: {
    select: {
      mode: 'mode',
      customTitle: 'navigationSet.title',
    },

    prepare({mode, customTitle}) {
      if (mode === 'none') {
        return {
          title: 'No Navigation',
        }
      }

      if (mode === 'custom') {
        return {
          title: customTitle ?? 'Custom Navigation',
          subtitle: 'Custom',
        }
      }

      return {
        title: 'Site Default Navigation',
        subtitle: 'Inherited',
      }
    },
  },
})
