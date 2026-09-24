import {describe, expect, it} from 'vitest'

import {
  siteLocaleReferenceFilter,
  siteOwnedReferenceFilter,
  siteReferenceFilter,
} from '../referenceFilters'

describe('siteOwnedReferenceFilter', () => {
  it('blocks the picker before the Site document has an id', () => {
    expect(siteOwnedReferenceFilter({})).toEqual({
      filter: 'false',
    })
  })

  it('filters references by the Site document currently being edited', () => {
    const result = siteOwnedReferenceFilter({
      _id: 'drafts.site-1',
    })

    expect(result).toEqual({
      filter: 'site._ref == $siteId',
      params: {
        siteId: 'site-1',
      },
    })
  })
})

describe('siteReferenceFilter', () => {
  it('blocks the picker when Site is missing', () => {
    expect(siteReferenceFilter({})).toEqual({
      filter: 'false',
    })
  })

  it('filters references by the current Site', () => {
    const result = siteReferenceFilter({
      site: {
        _type: 'reference',
        _ref: 'site-1',
      },
    })

    expect(result.filter).toContain('site._ref == $siteId')

    if ('params' in result) {
      expect(result.params).toEqual({
        siteId: 'site-1',
      })
    }
  })

  it('normalizes a draft Site id', () => {
    const result = siteReferenceFilter({
      site: {
        _type: 'reference',
        _ref: 'drafts.site-1',
      },
    })

    expect(result).toMatchObject({
      params: {
        siteId: 'site-1',
      },
    })
  })

  it('can exclude the current document', () => {
    const result = siteReferenceFilter(
      {
        _id: 'drafts.taxonomy-1',
        site: {
          _type: 'reference',
          _ref: 'drafts.site-1',
        },
      },
      {
        excludeCurrentDocument: true,
      },
    )

    expect(result.filter).toContain('site._ref == $siteId')
    expect(result.filter).toContain('!(_id in [$documentId, $draftId])')

    if ('params' in result) {
      expect(result.params).toEqual({
        siteId: 'site-1',
        documentId: 'taxonomy-1',
        draftId: 'drafts.taxonomy-1',
      })
    }
  })

  it('falls back to Site-only filtering when exclusion is requested before an id exists', () => {
    const result = siteReferenceFilter(
      {
        site: {
          _type: 'reference',
          _ref: 'site-1',
        },
      },
      {
        excludeCurrentDocument: true,
      },
    )

    expect(result.filter).toContain('site._ref == $siteId')
    expect(result.filter).not.toContain('$documentId')

    if ('params' in result) {
      expect(result.params).toEqual({
        siteId: 'site-1',
      })
    }
  })
})

describe('siteLocaleReferenceFilter', () => {
  it('blocks the picker when Site is missing', () => {
    expect(
      siteLocaleReferenceFilter({
        locale: 'us-en',
      }),
    ).toEqual({
      filter: 'false',
    })
  })

  it('blocks the picker when Locale is missing', () => {
    expect(
      siteLocaleReferenceFilter({
        site: {
          _type: 'reference',
          _ref: 'site-1',
        },
      }),
    ).toEqual({
      filter: 'false',
    })
  })

  it('filters references by the current Site and Locale', () => {
    const result = siteLocaleReferenceFilter({
      site: {
        _type: 'reference',
        _ref: 'site-1',
      },
      locale: 'us-en',
    })

    expect(result.filter).toContain('site._ref == $siteId')
    expect(result.filter).toContain('locale == $locale')

    if ('params' in result) {
      expect(result.params).toEqual({
        siteId: 'site-1',
        locale: 'us-en',
      })
    }
  })

  it('normalizes a draft Site id', () => {
    const result = siteLocaleReferenceFilter({
      site: {
        _type: 'reference',
        _ref: 'drafts.site-1',
      },
      locale: 'us-es',
    })

    expect(result).toMatchObject({
      params: {
        siteId: 'site-1',
        locale: 'us-es',
      },
    })
  })
})
