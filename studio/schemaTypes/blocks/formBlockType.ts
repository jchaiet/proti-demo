import {defineArrayMember, defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'
import {validateSingleFormFields, validateSteppedFormSteps} from '../forms/validation'

export const formBlockType = defineType({
  name: 'formBlock',
  title: 'Form',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'sectionHeading',
    }),

    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',

      initialValue: 'default',

      options: {
        list: [
          {
            title: 'Default',
            value: 'default',
          },
          {
            title: 'Split 50 / 50',
            value: 'split',
          },
          {
            title: 'Split 35 / 65',
            value: 'split-35-65',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'alignment',
      title: 'Content Alignment',
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
    }),

    defineField({
      name: 'formPosition',
      title: 'Form Position',
      type: 'string',

      initialValue: 'right',

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

    defineField({
      name: 'image',
      title: 'Side Image',
      type: 'image',

      options: {
        hotspot: true,
      },

      fields: createAccessibleImageFields('Image'),
    }),

    defineField({
      name: 'submitButtonText',

      title: 'Submit Button Text',

      type: 'string',

      initialValue: 'Submit',

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'submitButtonVariant',

      title: 'Submit Button Style',

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
            title: 'Glass',
            value: 'glass',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'submitButtonSize',

      title: 'Submit Button Size',

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
    }),

    defineField({
      name: 'submitButtonIcon',

      title: 'Submit Button Icon',

      type: 'iconPicker',
    }),

    defineField({
      name: 'submitButtonIconAlignment',

      title: 'Icon Position',

      type: 'string',

      initialValue: 'right',

      hidden: ({parent}) => !parent?.submitButtonIcon,

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

    defineField({
      name: 'formMode',
      title: 'Form Type',
      type: 'string',

      initialValue: 'single',

      options: {
        list: [
          {
            title: 'Single Page',
            value: 'single',
          },
          {
            title: 'Stepped Form',
            value: 'stepped',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'steps',
      title: 'Steps',
      type: 'array',

      hidden: ({parent}) => parent?.formMode !== 'stepped',

      of: [
        defineArrayMember({
          type: 'formStep',
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                formMode?: string
              }
            | undefined

          if (parent?.formMode !== 'stepped') {
            return true
          }

          if (!Array.isArray(value) || value.length < 2) {
            return 'A stepped form must contain at least two steps.'
          }

          return validateSteppedFormSteps(value)
        }),
    }),

    defineField({
      name: 'nextButtonText',
      title: 'Next Button Text',
      type: 'string',

      initialValue: 'Next',

      hidden: ({parent}) => parent?.formMode !== 'stepped',
    }),

    defineField({
      name: 'previousButtonText',
      title: 'Previous Button Text',
      type: 'string',

      initialValue: 'Previous',

      hidden: ({parent}) => parent?.formMode !== 'stepped',
    }),

    defineField({
      name: 'showProgress',
      title: 'Show Progress',
      type: 'boolean',

      initialValue: true,

      hidden: ({parent}) => parent?.formMode !== 'stepped',
    }),

    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',
      hidden: ({parent}) => parent?.formMode === 'stepped',

      of: [
        defineArrayMember({
          type: 'formInputField',
        }),

        defineArrayMember({
          type: 'formTextareaField',
        }),

        defineArrayMember({
          type: 'formCheckboxField',
        }),

        defineArrayMember({
          type: 'formDatePickerField',
        }),

        defineArrayMember({
          type: 'formCalendarField',
        }),

        defineArrayMember({
          type: 'formFileUploadField',
        }),

        defineArrayMember({
          type: 'formRadioGroupField',
        }),

        defineArrayMember({
          type: 'formRangeField',
        }),

        defineArrayMember({
          type: 'formSelectField',
        }),

        defineArrayMember({
          type: 'formSwitchField',
        }),

        defineArrayMember({
          type: 'formFieldset',
        }),

        defineArrayMember({
          type: 'formDividerField',
        }),

        defineArrayMember({
          type: 'formSpacerField',
        }),

        defineArrayMember({
          type: 'formHiddenField',
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                formMode?: string
              }
            | undefined

          if (parent?.formMode === 'stepped') {
            return true
          }

          return validateSingleFormFields(value)
        }),
    }),

    /*
     * This identifies which frontend/backend
     * form handler receives the submission.
     */
    defineField({
      name: 'formKey',
      title: 'Form Key',
      type: 'slug',

      description: 'Stable identifier used by the website to determine how this form is submitted.',

      options: {
        source: 'heading.title',
      },

      validation: (Rule) => Rule.required(),
    }),
  ],

  preview: {
    select: {
      title: 'heading.title',

      formMode: 'formMode',

      fields: 'fields',

      steps: 'steps',

      media: 'image',
    },

    prepare({title, formMode, fields, steps, media}) {
      const headingTitle = portableTextToPlainText(title)

      const isStepped = formMode === 'stepped'
      const previewItems = isStepped ? steps : fields
      const count = Array.isArray(previewItems) ? previewItems.length : 0
      const itemLabel = isStepped ? 'step' : 'field'

      return {
        title: headingTitle || 'Form',

        subtitle: `${count} ${itemLabel}${count === 1 ? '' : 's'}`,

        media,
      }
    },
  },
})
