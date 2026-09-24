import {defineArrayMember, defineField, defineType} from 'sanity'

import {TaxonomyTranslationsInput} from '../../components/inputs/TaxonomyTranslationsInput'
import {validateSiteTranslations} from '../validation/siteTranslations'
import {validateTaxonomyRouteIntegrity} from '../validation/taxonomyRoutes'
import {siteReferenceFilter} from '../validation/referenceFilters'
import {validateTaxonomyParent} from '../validation/taxonomyParent'
import {validateTaxonomySlug} from '../validation/taxonomySlug'

export const taxonomyType = defineType({
  name: 'taxonomy',
  title: 'Taxonomy Term',
  type: 'document',

  validation: (rule) =>
    rule
      .custom((document, context) =>
        validateSiteTranslations(document, context, {
          documentLabel: 'Taxonomy',
          baseFieldsLabel: 'base Title and Description fields',
        }),
      )
      .custom((document, context) => validateTaxonomyRouteIntegrity(document, context)),

  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'translations',
      title: 'Translations',
    },
    {
      name: 'assignment',
      title: 'Site & Hierarchy',
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description:
        'Taxonomy display name for the Site default Locale. Other locale labels are stored in Translations.',
      validation: (rule) => rule.required().max(160),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Optional Taxonomy description for the Site default Locale.',
      validation: (rule) => rule.max(500),
    }),

    defineField({
      name: 'translations',
      title: 'Translations',
      type: 'array',
      group: 'translations',
      description:
        'Locale-specific display text. Locales are generated automatically from the selected Site.',
      components: {
        input: TaxonomyTranslationsInput,
      },
      of: [
        defineArrayMember({
          name: 'taxonomyTranslation',
          title: 'Taxonomy Translation',
          type: 'object',

          fields: [
            defineField({
              name: 'locale',
              title: 'Locale',
              type: 'string',
              readOnly: true,
              validation: (rule) => rule.required(),
            }),

            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (rule) => rule.required().max(160),
            }),

            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
              validation: (rule) => rule.max(500),
            }),
          ],

          preview: {
            select: {
              title: 'title',
              locale: 'locale',
            },

            prepare({title, locale}) {
              return {
                title: title ?? 'Untitled Translation',
                subtitle: locale,
              }
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description: 'Website this Taxonomy Term belongs to.',
      to: [
        {
          type: 'site',
        },
      ],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'parent',
      title: 'Parent Taxonomy Term',
      type: 'reference',
      group: 'assignment',
      description: 'Optional parent used to build the hierarchical Taxonomy path.',

      to: [
        {
          type: 'taxonomy',
        },
      ],

      options: {
        disableNew: true,

        filter: ({document}) =>
          siteReferenceFilter(document, {
            excludeCurrentDocument: true,
          }),
      },

      validation: (rule) => rule.custom((value, context) => validateTaxonomyParent(value, context)),
    }),

    defineField({
      name: 'slug',
      title: 'URL Segment',
      type: 'slug',
      group: 'assignment',
      description:
        'Shared URL segment for every locale. Parent Taxonomy segments are added automatically.',

      options: {
        source: 'title',
        maxLength: 96,

        /*
         * Sanity's default slug uniqueness check is global to Taxonomy.
         * Taxonomy route uniqueness is Site/path scoped and is enforced by
         * validateTaxonomyRouteIntegrity(...) at the document level.
         */
        isUnique: () => true,
      },

      validation: (rule) => rule.required().custom((slug) => validateTaxonomySlug(slug)),
    }),
  ],

  orderings: [
    {
      title: 'Title',
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
      slug: 'slug.current',
      site: 'site.name',
      translationCount: 'translations',
    },

    prepare({title, slug, site, translationCount}) {
      const translatedLocales = Array.isArray(translationCount) ? translationCount.length : 0

      return {
        title: title ?? 'Untitled Taxonomy Term',
        subtitle: [
          site,
          slug ? `/${slug}` : undefined,
          translatedLocales > 0
            ? `${translatedLocales} translation${translatedLocales === 1 ? '' : 's'}`
            : undefined,
        ]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
