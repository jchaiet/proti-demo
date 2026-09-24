import type {ValidationContext} from 'sanity'

import {cleanId, documentIds, isDraftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type TaxonomyDocument = {
  _id: string
  site?: ReferenceValue
}

export async function validateDocumentListTaxonomyReferences(
  references: ReferenceValue[] | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!references?.length) {
    return true
  }

  const siteId = cleanId((context.document?.site as ReferenceValue | undefined)?._ref)

  if (!siteId) {
    return 'Select a Site before choosing taxonomy terms.'
  }

  const referenceIds = references.map((reference) => cleanId(reference?._ref)).filter(Boolean)

  if (referenceIds.length === 0) {
    return true
  }

  const ids = [...new Set(referenceIds.flatMap((id) => documentIds(id)))]

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const taxonomyDocuments = await client.fetch<TaxonomyDocument[]>(
    `
      *[
        _type == "taxonomy" &&
        _id in $ids
      ]{
        _id,
        site
      }
    `,
    {
      ids,
    },
  )

  const taxonomyById = new Map<string, TaxonomyDocument>()

  for (const taxonomyDocument of taxonomyDocuments) {
    const id = cleanId(taxonomyDocument._id)

    if (!id) {
      continue
    }

    const current = taxonomyById.get(id)

    if (!current || isDraftId(taxonomyDocument._id)) {
      taxonomyById.set(id, taxonomyDocument)
    }
  }

  for (const referenceId of referenceIds) {
    const taxonomyDocument = taxonomyById.get(referenceId)

    if (!taxonomyDocument || cleanId(taxonomyDocument.site?._ref) !== siteId) {
      return 'Taxonomy terms must belong to the same Site as this Document List.'
    }
  }

  return true
}
