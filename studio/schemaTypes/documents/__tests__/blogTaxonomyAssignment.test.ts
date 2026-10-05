import {describe, expect, it} from 'vitest'

import blogSource from '../blogType.ts?raw'

describe('Blog Taxonomy assignment schema', () => {
  it('restricts Blog Taxonomy assignment to Blog-taggable Taxonomy Terms', () => {
    expect(blogSource).toContain('taxonomyBlogTagReferenceFilter')

    expect(blogSource).toContain('filter: ({document}) => taxonomyBlogTagReferenceFilter(document)')
  })
})
