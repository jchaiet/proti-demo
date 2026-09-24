import {defineField, defineType} from 'sanity'

export const siteLocaleType = defineType({
  name: 'siteLocale',
  title: 'Locale',
  type: 'object',
  fields: [
    defineField({
      name: 'code',
      title: 'Locale Code',
      type: 'string',
      description: 'Regional language code (e.g. us-en, us-es, ca-fr)',
      validation: (rule) =>
        rule.required().regex(/^[a-z]{2}-[a-z]{2}$/, {
          name: 'regional locale',
        }),
    }),

    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Human-readable name shown to content editors',
      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    select: {
      title: 'label',
      subtitle: 'code',
    },
  },
})
