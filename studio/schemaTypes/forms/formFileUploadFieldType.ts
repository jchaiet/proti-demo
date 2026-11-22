import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldWidthField,
} from './shared'

export const formFileUploadFieldType = defineType({
  name: 'formFileUploadField',
  title: 'File Upload (Unavailable)',
  deprecated: {
    reason:
      'No file-storage adapter is installed. Existing fields are retained for migration; disable or remove them before publishing.',
  },
  type: 'object',
  description:
    'Unavailable with the default webhook adapter. Existing settings are preserved, but active uploads prevent publishing. Disable the field or remove it. No storage adapter is currently supported.',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      readOnly: true,
    }),

    defineField({...formFieldNameField(), readOnly: true}),

    defineField({
      name: 'helperText',
      title: 'Helper Text',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'accept',
      title: 'Accepted File Types',
      type: 'string',
      readOnly: true,

      description:
        'Comma-separated MIME types or extensions, for example ".pdf,.doc,.docx" or "image/*".',
    }),

    defineField({
      name: 'multiple',
      title: 'Allow Multiple Files',
      type: 'boolean',
      readOnly: true,

      initialValue: false,
    }),

    defineField({
      name: 'maxSizeMb',
      title: 'Maximum File Size',
      type: 'number',
      readOnly: true,

      description: 'Maximum allowed size for each uploaded file, in MB.',

      validation: (Rule) => Rule.min(1),
    }),

    defineField({...formFieldRequiredField(), readOnly: true}),

    defineField({
      ...formFieldDisabledField(),
      initialValue: true,
      description:
        'Keep this checked to retain a legacy upload field without blocking publication. Active file uploads are unsupported.',
    }),

    defineField({...formFieldWidthField(), readOnly: true}),
  ],

  preview: {
    select: {
      label: 'label',
      name: 'name',
      multiple: 'multiple',
    },

    prepare({label, name, multiple}) {
      return {
        title: label || name || 'File Upload',

        subtitle: `Unavailable · ${multiple ? 'Multiple Files' : 'Single File'}${name ? ` · ${name}` : ''}`,
      }
    },
  },
})
