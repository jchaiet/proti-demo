import {defineArrayMember, defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {validateSiteLocale} from '../validation/siteLocale'
import {validateDocumentInternalPageLinks} from '../validation/internalPageLink'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const navigationFooterType = defineType({
  name: 'navigationFooter',
  title: 'Footer Navigation',
  type: 'document',

  validation: (rule) =>
    rule.custom((document, context) =>
      validateDocumentInternalPageLinks(document, context, {
        documentLabel: 'Footer Navigation',
      }),
    ),

  groups: [
    {
      name: 'content',
      title: 'Footer',
      default: true,
    },
    {
      name: 'assignment',
      title: 'Site & Locale',
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Footer Name',
      type: 'string',
      group: 'content',
      description: 'Internal name such as Default Footer or Campaign Footer.',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'content',
      description: 'Stable internal key such as default-footer or campaign-footer.',
      validation: (rule) =>
        rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'lowercase kebab-case',
        }),
    }),

    defineField({
      name: 'logoMode',
      title: 'Logo',
      type: 'string',
      group: 'content',
      initialValue: 'site',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Use Site Logo',
            value: 'site',
          },
          {
            title: 'Custom Logo',
            value: 'custom',
          },
          {
            title: 'No Logo',
            value: 'none',
          },
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'logoOverride',
      title: 'Custom Logo',
      type: 'image',
      group: 'content',
      options: {
        hotspot: false,
      },
      hidden: ({document}) => document?.logoMode !== 'custom',
      fields: createAccessibleImageFields('Image'),
      validation: (rule) =>
        rule.custom((value, context) => {
          if (context.document?.logoMode === 'custom' && !value) {
            return 'Select a Custom Logo or change the Logo option.'
          }

          return true
        }),
    }),

    defineField({
      name: 'description',
      title: 'Brand Description',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (rule) => rule.max(500),
    }),

    defineField({
      name: 'columns',
      title: 'Navigation Columns',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'footerColumn',
        }),
      ],
      validation: (rule) => rule.max(8),
    }),

    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'navigationSocialLink',
        }),
      ],
      validation: (rule) => rule.max(12),
    }),

    defineField({
      name: 'legalLinks',
      title: 'Legal Links',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'footerLink',
        }),
      ],
      validation: (rule) => rule.max(12),
    }),

    defineField({
      name: 'copyright',
      title: 'Copyright',
      type: 'string',
      group: 'content',
      description: 'Example: © 2026 Company Name. All rights reserved.',
      validation: (rule) => rule.max(240),
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      to: [
        {
          type: 'site',
        },
      ],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'assignment',

      components: {
        input: PageLocaleInput,
      },

      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),
  ],

  orderings: [
    {
      title: 'Name',
      name: 'titleAsc',
      by: [
        {
          field: 'title',
          direction: 'asc',
        },
      ],
    },
  ],

  preview: {
    select: {
      title: 'title',
      key: 'key',
      site: 'site.name',
      locale: 'locale',
    },

    prepare({title, key, site, locale}) {
      return {
        title: title ?? 'Untitled Footer Navigation',
        subtitle: [site, locale, key].filter(Boolean).join(' • '),
      }
    },
  },
})
