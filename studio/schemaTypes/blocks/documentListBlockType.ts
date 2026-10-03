import {defineArrayMember, defineField, defineType} from 'sanity'

import {TaxonomyFilterPickerInput} from '../../components/inputs/TaxonomyFilterPickerInput'

import {validateDocumentListTaxonomyReferences} from '../validation/documentListTaxonomy'
import {
  taxonomyTermReferenceFilter,
  taxonomyVisitorFilterReferenceFilter,
} from '../validation/referenceFilters'

type TaxonomyReference = {
  _ref?: string
}

export const documentListBlockType = defineType({
  name: 'documentListBlock',
  title: 'Document List',
  type: 'object',

  fields: [
    /* === Heading === */

    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'sectionHeading',
    }),

    /* === Content Source === */

    defineField({
      name: 'sourceMode',
      title: 'Content Source',
      type: 'string',

      description: 'Choose whether items are selected manually or loaded dynamically.',

      initialValue: 'manual',

      options: {
        list: [
          {
            title: 'Manual Selection',
            value: 'manual',
          },
          {
            title: 'Dynamic',
            value: 'dynamic',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    /* === Manual Content === */

    defineField({
      name: 'documents',
      title: 'Documents',
      type: 'array',

      description: 'Manually select and order the items that should appear in this document list.',

      hidden: ({parent}) => parent?.sourceMode === 'dynamic',

      of: [
        defineArrayMember({
          type: 'resourceCard',
        }),

        defineArrayMember({
          type: 'articleCard',
        }),

        defineArrayMember({
          type: 'testimonialCard',
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode !== 'dynamic' && (!Array.isArray(value) || value.length === 0)) {
            return 'Add at least one item when using Manual Selection.'
          }

          return true
        }),
    }),

    /* === Dynamic Content === */

    defineField({
      name: 'dynamicContentTypes',
      title: 'Content Types',
      type: 'array',

      description:
        'Choose which types of content are eligible to appear in this list. Select all available types for a site-wide search.',

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],

      options: {
        list: [
          {
            title: 'Pages',
            value: 'page',
          },
          {
            title: 'Articles',
            value: 'article',
          },
          {
            title: 'Blog Posts',
            value: 'blog',
          },
          {
            title: 'News',
            value: 'news',
          },
          {
            title: 'Resources',
            value: 'resource',
          },
        ],
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode === 'dynamic' && (!Array.isArray(value) || value.length === 0)) {
            return 'Select at least one content type for dynamic loading.'
          }

          return true
        }),
    }),

    defineField({
      name: 'dynamicTaxonomy',
      title: 'Taxonomy',
      type: 'array',

      description:
        'Optionally restrict dynamic results to content assigned to specific taxonomy terms.',

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

      of: [
        defineArrayMember({
          type: 'reference',

          to: [
            {
              type: 'taxonomy',
            },
          ],

          options: {
            disableNew: true,

            filter: ({document}) => taxonomyTermReferenceFilter(document),
          },
        }),
      ],

      validation: (Rule) =>
        Rule.unique().custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode !== 'dynamic') {
            return true
          }

          return validateDocumentListTaxonomyReferences(
            value as TaxonomyReference[] | undefined,
            context,
          )
        }),
    }),

    defineField({
      name: 'dynamicTaxonomyMatchLogic',
      title: 'Taxonomy Match',
      type: 'string',

      description:
        'Any Match includes content assigned to at least one selected taxonomy term. All Match requires every selected taxonomy term.',

      initialValue: 'any',

      hidden: ({parent}) =>
        parent?.sourceMode !== 'dynamic' ||
        !Array.isArray(parent?.dynamicTaxonomy) ||
        parent.dynamicTaxonomy.length === 0,

      options: {
        list: [
          {
            title: 'Any Match',
            value: 'any',
          },
          {
            title: 'All Match',
            value: 'all',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
                dynamicTaxonomy?: unknown[]
              }
            | undefined

          const hasTaxonomy =
            parent?.sourceMode === 'dynamic' &&
            Array.isArray(parent.dynamicTaxonomy) &&
            parent.dynamicTaxonomy.length > 0

          if (hasTaxonomy && !value) {
            return 'Choose how selected taxonomy terms should be matched.'
          }

          return true
        }),
    }),

    defineField({
      name: 'dynamicSort',
      title: 'Initial Sort',
      type: 'string',

      description: 'Controls the initial order of dynamically loaded content.',

      initialValue: 'newest',

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

      options: {
        list: [
          {
            title: 'Newest First',
            value: 'newest',
          },
          {
            title: 'Oldest First',
            value: 'oldest',
          },
          {
            title: 'Title A–Z',
            value: 'title-asc',
          },
          {
            title: 'Title Z–A',
            value: 'title-desc',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode === 'dynamic' && !value) {
            return 'Initial sort is required for dynamic loading.'
          }

          return true
        }),
    }),

    defineField({
      name: 'dynamicLimit',
      title: 'Maximum Results',
      type: 'number',

      description:
        'Maximum number shown before a visitor searches. Search queries use the full selected content scope.',

      initialValue: 50,

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode === 'dynamic' && (typeof value !== 'number' || value < 1)) {
            return 'Maximum results must be at least 1.'
          }

          if (parent?.sourceMode === 'dynamic' && typeof value === 'number' && value > 200) {
            return 'Maximum results cannot exceed 200.'
          }

          return true
        }),
    }),

    /* === Display === */

    defineField({
      name: 'alignment',
      title: 'Heading Alignment',
      type: 'string',

      initialValue: 'left',

      options: {
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Center',
            value: 'center',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'gridCols',
      title: 'Grid Columns',
      type: 'number',

      initialValue: 3,

      options: {
        list: [
          {
            title: '1 Column',
            value: 1,
          },
          {
            title: '2 Columns',
            value: 2,
          },
          {
            title: '3 Columns',
            value: 3,
          },
          {
            title: '4 Columns',
            value: 4,
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required().integer().min(1).max(4),
    }),

    /* === Search === */

    defineField({
      name: 'enableSearch',
      title: 'Enable Search',
      type: 'boolean',

      description: 'Allow visitors to search the full eligible content scope selected above.',

      initialValue: true,
    }),

    defineField({
      name: 'searchPlaceholder',
      title: 'Search Placeholder',
      type: 'string',

      initialValue: 'Search documents...',

      hidden: ({parent}) => parent?.enableSearch === false,
    }),

    defineField({
      name: 'requireSearchQuery',
      title: 'Require Search Query',
      type: 'boolean',

      description:
        'When enabled, no dynamic results are loaded until the visitor enters a search term. Useful for a dedicated Site Search page.',

      initialValue: false,

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic' || parent?.enableSearch === false,
    }),

    defineField({
      name: 'initialStateText',
      title: 'Initial State Text',
      type: 'string',

      description: 'Displayed before the visitor enters a search term.',

      initialValue: 'Enter a search term to begin.',

      hidden: ({parent}) =>
        parent?.sourceMode !== 'dynamic' ||
        parent?.enableSearch === false ||
        parent?.requireSearchQuery !== true,
    }),

    /* === Visitor Filters === */

    defineField({
      name: 'enableFilters',
      title: 'Enable Filters',
      type: 'boolean',

      description: 'Show filtering controls to visitors.',

      initialValue: false,
    }),

    defineField({
      name: 'filterTitle',
      title: 'Filter Title',
      type: 'string',

      initialValue: 'Categories',

      hidden: ({parent}) => !parent?.enableFilters,
    }),

    defineField({
      name: 'filterLogic',
      title: 'Filter Selection',
      type: 'string',

      description:
        'Single Selection allows one filter at a time. Multiple Selection allows several.',

      initialValue: 'radio',

      hidden: ({parent}) => !parent?.enableFilters,

      options: {
        list: [
          {
            title: 'Single Selection',
            value: 'radio',
          },
          {
            title: 'Multiple Selection',
            value: 'checkbox',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                enableFilters?: boolean
              }
            | undefined

          if (parent?.enableFilters && !value) {
            return 'Filter selection type is required when filters are enabled.'
          }

          return true
        }),
    }),

    defineField({
      name: 'filterOptions',
      title: 'Filter Options',
      type: 'array',

      description: 'Define filters visitors can use. Use "all" as the value for an All option.',

      hidden: ({parent}) => !parent?.enableFilters,

      of: [
        defineArrayMember({
          name: 'filterOption',
          title: 'Filter Option',
          type: 'object',

          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',

              description: 'Machine-readable value, for example: article, blog, reports, guides.',

              validation: (Rule) => Rule.required(),
            }),
          ],

          preview: {
            select: {
              title: 'label',
              value: 'value',
            },

            prepare({title, value}) {
              return {
                title: title || 'Filter Option',

                subtitle: value || undefined,
              }
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'taxonomyFilterTitle',
      title: 'Taxonomy Filter Title',
      type: 'string',

      description: 'Heading displayed above the visitor-facing Taxonomy filter group.',

      initialValue: 'Topics',

      hidden: ({parent}) =>
        !parent?.enableFilters ||
        parent?.sourceMode !== 'dynamic' ||
        !Array.isArray(parent?.filterTaxonomy) ||
        parent.filterTaxonomy.length === 0,
    }),

    defineField({
      name: 'taxonomyFilterLogic',
      title: 'Taxonomy Filter Selection',
      type: 'string',

      description:
        'Single Selection allows one Taxonomy Term at a time. Multiple Selection allows several.',

      initialValue: 'checkbox',

      hidden: ({parent}) =>
        !parent?.enableFilters ||
        parent?.sourceMode !== 'dynamic' ||
        !Array.isArray(parent?.filterTaxonomy) ||
        parent.filterTaxonomy.length === 0,

      options: {
        list: [
          {
            title: 'Single Selection',
            value: 'radio',
          },
          {
            title: 'Multiple Selection',
            value: 'checkbox',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'taxonomyFilterMatchLogic',
      title: 'Taxonomy Match',
      type: 'string',

      description:
        'Any Match includes content assigned to at least one selected visitor Taxonomy filter. All Match requires every selected Taxonomy filter.',

      initialValue: 'any',

      hidden: ({parent}) =>
        !parent?.enableFilters ||
        parent?.sourceMode !== 'dynamic' ||
        parent?.taxonomyFilterLogic !== 'checkbox' ||
        !Array.isArray(parent?.filterTaxonomy) ||
        parent.filterTaxonomy.length === 0,

      options: {
        list: [
          {
            title: 'Any Match',
            value: 'any',
          },
          {
            title: 'All Match',
            value: 'all',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'filterTaxonomy',
      title: 'Taxonomy Filters',
      type: 'array',

      description:
        'Choose the Site Taxonomy Terms visitors may use as filters. Labels are pulled automatically from the Taxonomy Term and localized for the current document Locale.',

      hidden: ({parent}) => !parent?.enableFilters || parent?.sourceMode !== 'dynamic',

      components: {
        input: TaxonomyFilterPickerInput,
      },

      of: [
        defineArrayMember({
          type: 'reference',

          to: [
            {
              type: 'taxonomy',
            },
          ],

          options: {
            disableNew: true,

            filter: ({document}) => taxonomyVisitorFilterReferenceFilter(document),
          },
        }),
      ],

      validation: (Rule) =>
        Rule.unique().custom((value, context) => {
          const parent = context.parent as
            | {
                enableFilters?: boolean
                sourceMode?: string
              }
            | undefined

          if (!parent?.enableFilters || parent.sourceMode !== 'dynamic') {
            return true
          }

          return validateDocumentListTaxonomyReferences(
            value as TaxonomyReference[] | undefined,
            context,
            {
              requireFilterable: true,
            },
          )
        }),
    }),

    /* === Visitor Sorting === */

    defineField({
      name: 'enableSorting',
      title: 'Enable Sorting',
      type: 'boolean',

      description: 'Allow visitors to change the displayed content order.',

      initialValue: false,
    }),

    defineField({
      name: 'sortOptions',
      title: 'Sort Options',
      type: 'array',

      description:
        'Choose which standard sort options visitors can use. Public labels are localized automatically from the page Locale.',

      hidden: ({parent}) => !parent?.enableSorting,

      of: [
        defineArrayMember({
          name: 'sortOption',
          title: 'Sort Option',
          type: 'object',

          fields: [
            defineField({
              name: 'label',
              title: 'Legacy Label',
              type: 'string',

              description:
                'Legacy stored label retained for existing content. The public label is localized automatically from Sort Value.',

              hidden: true,
            }),

            defineField({
              name: 'value',
              title: 'Sort Value',
              type: 'string',

              description: 'Choose the machine value used by the Document List query.',

              options: {
                list: [
                  {
                    title: 'Relevance',
                    value: 'relevance',
                  },
                  {
                    title: 'Newest',
                    value: 'newest',
                  },
                  {
                    title: 'Oldest',
                    value: 'oldest',
                  },
                  {
                    title: 'Title A–Z',
                    value: 'title-asc',
                  },
                  {
                    title: 'Title Z–A',
                    value: 'title-desc',
                  },
                ],
              },

              validation: (Rule) => Rule.required(),
            }),
          ],

          preview: {
            select: {
              value: 'value',
            },

            prepare({value}) {
              const titles: Record<string, string> = {
                relevance: 'Relevance',
                newest: 'Newest',
                oldest: 'Oldest',
                'title-asc': 'Title A–Z',
                'title-desc': 'Title Z–A',
              }

              return {
                title: titles[value] || 'Sort Option',

                subtitle: value || undefined,
              }
            },
          },
        }),
      ],
    }),

    /* === Pagination === */

    defineField({
      name: 'enablePagination',
      title: 'Enable Pagination',
      type: 'boolean',

      initialValue: true,
    }),

    defineField({
      name: 'itemsPerPage',
      title: 'Items Per Page',
      type: 'number',

      initialValue: 9,

      hidden: ({parent}) => parent?.enablePagination === false,

      options: {
        list: [
          {
            title: '6',
            value: 6,
          },
          {
            title: '9',
            value: 9,
          },
          {
            title: '12',
            value: 12,
          },
          {
            title: '18',
            value: 18,
          },
          {
            title: '24',
            value: 24,
          },
        ],
      },

      validation: (Rule) => Rule.integer().min(1),
    }),

    /* === Empty State === */

    defineField({
      name: 'emptyStateText',
      title: 'Empty State Text',
      type: 'string',

      description: 'Displayed when no items match the current search or filters.',

      initialValue: 'No documents found matching your criteria.',
    }),
  ],

  preview: {
    select: {
      sourceMode: 'sourceMode',
      documents: 'documents',
      dynamicContentTypes: 'dynamicContentTypes',
      dynamicTaxonomy: 'dynamicTaxonomy',
    },

    prepare({sourceMode, documents, dynamicContentTypes, dynamicTaxonomy}) {
      const mode = sourceMode || 'manual'

      if (mode === 'dynamic') {
        const types = Array.isArray(dynamicContentTypes) ? dynamicContentTypes : []

        const taxonomyCount = Array.isArray(dynamicTaxonomy) ? dynamicTaxonomy.length : 0

        const typeLabel = types.length > 0 ? types.join(', ') : 'No content types'

        const taxonomyLabel =
          taxonomyCount > 0
            ? ` · ${taxonomyCount} taxonomy term${taxonomyCount === 1 ? '' : 's'}`
            : ''

        return {
          title: 'Document List',
          subtitle: `Dynamic · ${typeLabel}${taxonomyLabel}`,
        }
      }

      const count = Array.isArray(documents) ? documents.length : 0

      return {
        title: 'Document List',
        subtitle: `Manual · ${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
