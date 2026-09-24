import {defineArrayMember, defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const contentBlockType = defineType({
  name: 'contentBlock',
  title: 'Content',
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
      name: 'vAlignment',
      title: 'Vertical Alignment',
      type: 'string',

      initialValue: 'center',

      hidden: ({parent}) => !parent || parent.layout === 'default',

      options: {
        list: [
          {
            title: 'Top',
            value: 'top',
          },
          {
            title: 'Center',
            value: 'center',
          },
          {
            title: 'Bottom',
            value: 'bottom',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'mediaType',
      title: 'Media',
      type: 'string',

      initialValue: 'none',

      options: {
        list: [
          {
            title: 'None',
            value: 'none',
          },
          {
            title: 'Image',
            value: 'image',
          },
          {
            title: 'Video',
            value: 'video',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',

      options: {
        hotspot: true,
      },

      hidden: ({parent}) => parent?.mediaType !== 'image',

      fields: createAccessibleImageFields('Image'),
    }),

    defineField({
      name: 'imageShape',
      title: 'Image Shape',
      type: 'string',
      description:
        'Circle uses a square frontend crop. Sanity crop and hotspot settings determine which part of the source image is kept.',
      initialValue: 'rounded',
      hidden: ({parent}) => parent?.mediaType !== 'image',
      options: {
        list: [
          {title: 'Square', value: 'square'},
          {title: 'Rounded', value: 'rounded'},
          {title: 'Circle', value: 'circle'},
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'imageSize',
      title: 'Image Size',
      type: 'string',
      initialValue: 'full',
      hidden: ({parent}) => parent?.mediaType !== 'image',
      options: {
        list: [
          {title: 'Small · 160px', value: 'sm'},
          {title: 'Medium · 240px', value: 'md'},
          {title: 'Large · 360px', value: 'lg'},
          {title: 'Full layout width', value: 'full'},
        ],
      },
    }),

    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',

      description: 'Direct URL to the video file.',

      hidden: ({parent}) => parent?.mediaType !== 'video',

      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),

    defineField({
      name: 'defaultMediaPosition',

      title: 'Media Position',

      type: 'string',

      initialValue: 'below',

      hidden: ({parent}) => !parent || parent.mediaType === 'none' || parent.layout !== 'default',

      options: {
        list: [
          {
            title: 'Above',
            value: 'above',
          },
          {
            title: 'Below',
            value: 'below',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'splitMediaPosition',

      title: 'Media Position',

      type: 'string',

      initialValue: 'right',

      hidden: ({parent}) => !parent || parent.mediaType === 'none' || parent.layout === 'default',

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
      name: 'ctas',
      title: 'Calls to Action',

      type: 'array',

      of: [
        defineArrayMember({
          type: 'cta',
        }),
      ],

      validation: (Rule) =>
        Rule.max(3).warning('More than three CTAs may make the content block difficult to scan.'),
    }),

    defineField({
      name: 'ctaStackOnMobile',

      title: 'Stack CTAs on Mobile',

      type: 'boolean',

      initialValue: true,
    }),
  ],

  preview: {
    select: {
      headingTitle: 'heading.title',

      media: 'image',

      mediaType: 'mediaType',
    },

    prepare({headingTitle, media, mediaType}) {
      const title = portableTextToPlainText(headingTitle)

      return {
        title: title || 'Content',

        subtitle: mediaType && mediaType !== 'none' ? `Content · ${mediaType}` : 'Content',

        media,
      }
    },
  },
})
