import {describe, expect, it} from 'vitest'

import {validateDocumentListTaxonomyReferences} from '../documentListTaxonomy'
import {createValidationContext} from './testUtils'

describe('Document List taxonomy validation', () => {
  it('accepts Taxonomy Terms belonging to the same Site without requiring a Locale', async () => {
    const {context, fetch, withConfig} = createValidationContext({
      document: {
        site: {_ref: 'drafts.site-1'},
        locale: 'us-es',
      },
      fetchResults: [
        [
          {
            _id: 'taxonomy-a',
            site: {_ref: 'site-1'},
          },
          {
            _id: 'taxonomy-b',
            site: {_ref: 'site-1'},
          },
        ],
      ],
    })

    await expect(
      validateDocumentListTaxonomyReferences(
        [{_ref: 'taxonomy-a'}, {_ref: 'drafts.taxonomy-b'}],
        context,
      ),
    ).resolves.toBe(true)

    expect(withConfig).toHaveBeenCalledWith({
      perspective: 'raw',
    })

    const [query, params] = fetch.mock.calls[0]

    expect(query).toContain('_type == "taxonomy"')
    expect(query).not.toContain('locale')
    expect(params).toEqual({
      ids: ['taxonomy-a', 'drafts.taxonomy-a', 'taxonomy-b', 'drafts.taxonomy-b'],
    })
  })

  it('prefers a draft Taxonomy Term when validating Site ownership', async () => {
    const {context} = createValidationContext({
      document: {
        site: {_ref: 'site-1'},
      },
      fetchResults: [
        [
          {
            _id: 'taxonomy-a',
            site: {_ref: 'site-1'},
          },
          {
            _id: 'drafts.taxonomy-a',
            site: {_ref: 'site-2'},
          },
        ],
      ],
    })

    await expect(
      validateDocumentListTaxonomyReferences([{_ref: 'taxonomy-a'}], context),
    ).resolves.toBe('Taxonomy terms must belong to the same Site as this Document List.')
  })

  it('requires a Site before validating selected Taxonomy Terms', async () => {
    const {context, fetch} = createValidationContext()

    await expect(
      validateDocumentListTaxonomyReferences([{_ref: 'taxonomy-a'}], context),
    ).resolves.toBe('Select a Site before choosing taxonomy terms.')

    expect(fetch).not.toHaveBeenCalled()
  })
})
