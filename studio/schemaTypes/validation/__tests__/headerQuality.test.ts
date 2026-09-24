import {describe, expect, it} from 'vitest'

import {validateBlogHeadingQuality, validatePageHeadingQuality} from '../headingQuality'
import {createValidationContext, pt} from './testUtils'

describe('heading quality validation', () => {
  it('accepts a Page with exactly one H1 and a valid hierarchy', () => {
    const {context} = createValidationContext()

    expect(
      validatePageHeadingQuality(
        [
          {_type: 'heroBlock', heading: {title: pt('Primary page heading', 'h1')}},
          {_type: 'contentBlock', heading: {title: pt('Supporting section', 'h2')}},
          {_type: 'richTextBlock', content: pt('Nested section', 'h3')},
        ],
        context,
      ),
    ).toBe(true)
  })

  it('warns when a Page has no H1', () => {
    const {context} = createValidationContext()

    expect(
      validatePageHeadingQuality(
        [{_type: 'contentBlock', heading: {title: pt('Section', 'h2')}}],
        context,
      ),
    ).toContain('Page has no H1')
  })

  it('warns when a Page has multiple H1s', () => {
    const {context} = createValidationContext()

    expect(
      validatePageHeadingQuality(
        [
          {_type: 'heroBlock', heading: {title: pt('First', 'h1')}},
          {_type: 'contentBlock', heading: {title: pt('Second', 'h1')}},
        ],
        context,
      ),
    ).toContain('Page has 2 H1 headings')
  })

  it('warns when the first Page H1 appears after another heading', () => {
    const {context} = createValidationContext()

    expect(
      validatePageHeadingQuality(
        [
          {_type: 'contentBlock', heading: {title: pt('Premature H2', 'h2')}},
          {_type: 'heroBlock', heading: {title: pt('Primary', 'h1')}},
        ],
        context,
      ),
    ).toContain('The first H1 appears after another heading')
  })

  it('warns when heading levels are skipped', () => {
    const {context} = createValidationContext()

    expect(
      validatePageHeadingQuality(
        [
          {_type: 'heroBlock', heading: {title: pt('Primary', 'h1')}},
          {_type: 'contentBlock', heading: {title: pt('Skipped', 'h3')}},
        ],
        context,
      ),
    ).toContain('Heading hierarchy skips')
  })

  it('finds headings inside Rich Text and Tabs content', () => {
    const {context} = createValidationContext()

    expect(
      validatePageHeadingQuality(
        [
          {_type: 'heroBlock', heading: {title: pt('Primary', 'h1')}},
          {_type: 'richTextBlock', content: pt('Rich text H2', 'h2')},
          {_type: 'tabsBlock', items: [{content: pt('Tab H4', 'h4')}]},
        ],
        context,
      ),
    ).toContain('Heading hierarchy skips')
  })

  it('treats the Blog document title as the H1', () => {
    const {context} = createValidationContext({document: {title: 'Article title'}})

    expect(
      validateBlogHeadingQuality(
        [{_type: 'contentBlock', heading: {title: pt('Body section', 'h2')}}],
        context,
      ),
    ).toBe(true)
  })

  it('warns when Blog Content adds another H1', () => {
    const {context} = createValidationContext({document: {title: 'Article title'}})

    expect(
      validateBlogHeadingQuality([{_type: 'richTextBlock', content: pt('Body H1', 'h1')}], context),
    ).toContain('Blog title already renders as H1')
  })
})
