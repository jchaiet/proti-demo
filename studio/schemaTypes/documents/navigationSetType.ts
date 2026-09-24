import {defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {validateSiteLocale} from '../validation/siteLocale'
import {validateNavigationSetReferences} from '../validation/navigationReferences'
import {siteLocaleReferenceFilter} from '../validation/referenceFilters'

export const navigationSetType = defineType({
  name: 'navigationSet',
  title: 'Navigation Set',
  type: 'document',

  validation: (rule) =>
    rule.custom((document, context) => validateNavigationSetReferences(document, context)),

  groups: [
    {
      name: 'content',
      title: 'Navigation Set',
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
      title: 'Navigation Set Name',
      type: 'string',
      group: 'content',
      description: 'Internal name such as Default, Marketing Minimal, or Campaign.',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'content',
      description: 'Stable internal key such as default, marketing-minimal, or campaign.',
      validation: (rule) =>
        rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'lowercase kebab-case',
        }),
    }),

    defineField({
      name: 'headerMode',
      title: 'Header',
      type: 'string',
      group: 'content',
      initialValue: 'custom',

      options: {
        layout: 'radio',
        list: [
          {
            title: 'Use Header Navigation',
            value: 'custom',
          },
          {
            title: 'No Header',
            value: 'none',
          },
        ],
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'header',
      title: 'Header Navigation',
      type: 'reference',
      group: 'content',

      to: [
        {
          type: 'navigationHeader',
        },
      ],

      hidden: ({document}) => document?.headerMode === 'none',

      options: {
        disableNew: true,

        filter: ({document}) => siteLocaleReferenceFilter(document),
      },

      validation: (rule) =>
        rule.custom((value, context) => {
          if (context.document?.headerMode === 'none') {
            return true
          }

          return value ? true : 'Select a Header Navigation.'
        }),
    }),

    defineField({
      name: 'footerMode',
      title: 'Footer',
      type: 'string',
      group: 'content',
      initialValue: 'custom',

      options: {
        layout: 'radio',
        list: [
          {
            title: 'Use Footer Navigation',
            value: 'custom',
          },
          {
            title: 'No Footer',
            value: 'none',
          },
        ],
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'footer',
      title: 'Footer Navigation',
      type: 'reference',
      group: 'content',

      to: [
        {
          type: 'navigationFooter',
        },
      ],

      hidden: ({document}) => document?.footerMode === 'none',

      options: {
        disableNew: true,

        filter: ({document}) => siteLocaleReferenceFilter(document),
      },

      validation: (rule) =>
        rule.custom((value, context) => {
          if (context.document?.footerMode === 'none') {
            return true
          }

          return value ? true : 'Select a Footer Navigation.'
        }),
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
      headerTitle: 'header.title',
      footerTitle: 'footer.title',
      headerMode: 'headerMode',
      footerMode: 'footerMode',
    },

    prepare({title, key, site, locale, headerTitle, footerTitle, headerMode, footerMode}) {
      const header = headerMode === 'none' ? 'No Header' : (headerTitle ?? 'Header not selected')

      const footer = footerMode === 'none' ? 'No Footer' : (footerTitle ?? 'Footer not selected')

      return {
        title: title ?? 'Untitled Navigation Set',

        subtitle: [site, locale, `${header} / ${footer}`, key].filter(Boolean).join(' • '),
      }
    },
  },
})
