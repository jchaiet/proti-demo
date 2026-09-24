import {defineArrayMember, defineField, defineType} from 'sanity'

import {portableTextToPlainText} from '../../lib/portableText'

const POLL_OPTION_ID_PATTERN = /^[A-Za-z0-9_]+$/

type PollOptionValue = {
  id?: string
  label?: string
}

export const pollBlockType = defineType({
  name: 'pollBlock',
  title: 'Poll',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      title: 'Poll Heading',
      type: 'sectionHeading',

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'pollKey',
      title: 'Poll Key',
      type: 'slug',

      description: 'Stable identifier used when recording votes.',

      options: {
        source: 'heading.title',

        maxLength: 96,
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'options',
      title: 'Poll Options',
      type: 'array',

      validation: (Rule) =>
        Rule.required()
          .min(2)
          .custom((value) => {
            if (!Array.isArray(value)) {
              return true
            }

            const options = value as PollOptionValue[]

            const ids = options.map((option) => option.id).filter((id): id is string => Boolean(id))

            return new Set(ids).size === ids.length ? true : 'Each Option ID must be unique.'
          }),

      of: [
        defineArrayMember({
          name: 'pollOption',

          title: 'Poll Option',

          type: 'object',

          fields: [
            defineField({
              name: 'label',

              title: 'Label',

              type: 'string',

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'id',

              title: 'Option ID',

              type: 'string',

              description: 'Stable machine value, e.g. yes, no, red, option_1.',

              validation: (Rule) =>
                Rule.required().custom((value) => {
                  if (!value) {
                    return true
                  }

                  return POLL_OPTION_ID_PATTERN.test(value)
                    ? true
                    : 'Use only letters, numbers, and underscores.'
                }),
            }),
          ],

          preview: {
            select: {
              title: 'label',

              subtitle: 'id',
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'layout',
      title: 'Option Layout',
      type: 'string',

      initialValue: 'buttons',

      options: {
        list: [
          {
            title: 'Buttons',
            value: 'buttons',
          },
          {
            title: 'Cards',
            value: 'cards',
          },
          {
            title: 'List',
            value: 'list',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'alignment',

      title: 'Alignment',

      type: 'string',

      initialValue: 'center',

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
    }),

    defineField({
      name: 'resultsType',
      title: 'Results Type',
      type: 'string',

      description: 'Controls how poll results are displayed after voting.',

      initialValue: 'percentageBars',

      hidden: ({parent}) => parent?.showResultsOnSubmit === false,

      options: {
        list: [
          {
            title: 'Percentage Bars',
            value: 'percentageBars',
          },
          {
            title: 'Vote Counts',
            value: 'counts',
          },
          {
            title: 'Single Option Count',
            value: 'singleOptionCount',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'singleResultOptionId',
      title: 'Result Option ID',
      type: 'string',

      description: 'Option whose vote count should be shown. For example: yes or helpful.',

      hidden: ({parent}) =>
        !parent?.showResultsOnSubmit || parent?.resultsType !== 'singleOptionCount',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                showResultsOnSubmit?: boolean
                resultsType?: string
                options?: PollOptionValue[]
              }
            | undefined

          if (!parent?.showResultsOnSubmit || parent.resultsType !== 'singleOptionCount') {
            return true
          }

          if (!value) {
            return 'Result Option ID is required.'
          }

          const optionExists = parent.options?.some((option) => option.id === value)

          return optionExists ? true : 'Result Option ID must match one of the Poll Option IDs.'
        }),
    }),

    defineField({
      name: 'singleResultMessage',
      title: 'Single Result Message',
      type: 'string',

      description:
        'Use {count} for the vote count and {label} for the option label. Example: "{count} people found this helpful."',

      initialValue: '{count} people found this helpful.',

      hidden: ({parent}) =>
        !parent?.showResultsOnSubmit || parent?.resultsType !== 'singleOptionCount',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                showResultsOnSubmit?: boolean
                resultsType?: string
              }
            | undefined

          if (!parent?.showResultsOnSubmit || parent.resultsType !== 'singleOptionCount') {
            return true
          }

          return value?.trim() ? true : 'Single Result Message is required.'
        }),
    }),

    defineField({
      name: 'showResultsOnSubmit',
      title: 'Show Results',
      type: 'boolean',

      description: 'Show poll results after the visitor submits their vote.',

      initialValue: true,
    }),

    defineField({
      name: 'confirmationMessage',

      title: 'Confirmation Message',
      description: 'Message shown after the visitor successfully submits their vote.',

      type: 'string',

      initialValue: 'Thank you for your feedback!',
    }),

    defineField({
      name: 'errorMessage',

      title: 'Error Message',

      type: 'string',

      initialValue: 'Failed to record vote. Please try again.',
    }),
  ],

  preview: {
    select: {
      title: 'heading.title',

      options: 'options',
    },

    prepare({title, options}) {
      const question = portableTextToPlainText(title)

      const count = Array.isArray(options) ? options.length : 0

      return {
        title: question || 'Poll',

        subtitle: `${count} option${count === 1 ? '' : 's'}`,
      }
    },
  },
})
