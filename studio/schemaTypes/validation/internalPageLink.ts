import type {ValidationContext} from 'sanity'

import {cleanId, documentIds, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type LinkValue = {
  _type?: string
  type?: string
  internalPage?: ReferenceValue
  externalUrl?: string
  email?: string
  phone?: string
  anchor?: string
  openInNewTab?: boolean
}

type ParentDocument = {
  site?: ReferenceValue
  locale?: string
  [key: string]: unknown
}

type PageDocument = {
  _id: string
  title?: string
  site?: ReferenceValue
  locale?: string
}

type SanityPathSegment = string | number | {_key: string}

type InternalLinkCandidate = {
  pageId?: string
  path: SanityPathSegment[]
}

type DocumentInternalLinkOptions = {
  documentLabel: string
}

function pickDraftFirst(pages: PageDocument[], pageId: string): PageDocument | undefined {
  const pageDraftId = draftId(pageId)

  return (
    pages.find((page) => page._id === pageDraftId) ??
    pages.find((page) => cleanId(page._id) === pageId)
  )
}

function pageLabel(page: PageDocument, fallback: string): string {
  const title = page.title?.trim()

  return title ? `"${title}"` : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function looksLikeLink(value: Record<string, unknown>): value is LinkValue {
  if (value._type === 'link') {
    return true
  }

  if (typeof value.type !== 'string') {
    return false
  }

  return ['internalPage', 'externalUrl', 'email', 'phone', 'anchor', 'openInNewTab'].some(
    (field) => field in value,
  )
}

function arrayPathSegment(value: unknown, index: number): SanityPathSegment {
  if (isRecord(value) && typeof value._key === 'string') {
    return {
      _key: value._key,
    }
  }

  return index
}

function collectInternalLinks(
  value: unknown,
  path: SanityPathSegment[] = [],
  results: InternalLinkCandidate[] = [],
): InternalLinkCandidate[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectInternalLinks(item, [...path, arrayPathSegment(item, index)], results)
    })

    return results
  }

  if (!isRecord(value)) {
    return results
  }

  if (looksLikeLink(value) && value.type === 'internal') {
    results.push({
      pageId: cleanId(value.internalPage?._ref),
      path: [...path, 'internalPage'],
    })
  }

  for (const [key, child] of Object.entries(value)) {
    /*
     * We already inspected the Link object's own internalPage above.
     * A reference object itself does not need recursive traversal.
     */
    if (looksLikeLink(value) && key === 'internalPage') {
      continue
    }

    collectInternalLinks(child, [...path, key], results)
  }

  return results
}

/**
 * Field/object-level validator used by the shared Link schema.
 *
 * This protects selection/editing of an individual Link.
 */
export async function validateInternalPageLink(
  value: unknown,
  context: ValidationContext,
): Promise<true | string> {
  const link = value as LinkValue | undefined

  if (link?.type !== 'internal') {
    return true
  }

  if (!link.internalPage?._ref) {
    return 'Internal page is required.'
  }

  const document = context.document as ParentDocument | undefined
  const siteId = cleanId(document?.site?._ref)
  const locale = document?.locale?.trim()

  if (!siteId || !locale) {
    return true
  }

  const pageId = cleanId(link.internalPage._ref)

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const pages = await client.fetch<PageDocument[]>(
    `
      *[
        _type == "page" &&
        _id in [$pageId, $draftPageId]
      ]{
        _id,
        title,
        site,
        locale
      }
    `,
    {
      pageId,
      draftPageId: draftId(pageId),
    },
  )

  const page = pickDraftFirst(pages, pageId)

  if (!page) {
    return 'The selected Internal Page could not be found.'
  }

  if (cleanId(page.site?._ref) !== siteId) {
    return `Internal Page ${pageLabel(page, pageId)} must belong to the same Site as this document.`
  }

  if (page.locale !== locale) {
    return `Internal Page ${pageLabel(page, pageId)} must use the same Locale as this document.`
  }

  return true
}

/**
 * Document-level safety net for documents that contain deeply nested Link
 * objects, such as Header and Footer Navigation.
 *
 * Sanity reference picker filters prevent selecting new invalid Pages, but a
 * previously valid nested Link can become stale when the parent document's
 * Site or Locale changes. This validator scans the complete document so that
 * those stale links remain visible as validation errors.
 */
export async function validateDocumentInternalPageLinks(
  value: unknown,
  context: ValidationContext,
  options: DocumentInternalLinkOptions,
) {
  const document = value as ParentDocument | undefined

  const siteId = cleanId(document?.site?._ref)
  const locale = document?.locale?.trim()

  /*
   * Let the document's required Site/Locale rules report incomplete routing
   * identity. Once both exist, validate every nested internal destination.
   */
  if (!siteId || !locale) {
    return true
  }

  const links = collectInternalLinks(document)

  if (links.length === 0) {
    return true
  }

  const missingDestination = links.find((link) => !link.pageId)

  if (missingDestination) {
    return {
      message: 'Internal page is required.',
      path: missingDestination.path,
    }
  }

  const pageIds = [
    ...new Set(
      links.map((link) => link.pageId).filter((pageId): pageId is string => Boolean(pageId)),
    ),
  ]

  const ids = [...new Set(pageIds.flatMap((pageId) => documentIds(pageId)))]

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const pages = await client.fetch<PageDocument[]>(
    `
      *[
        _type == "page" &&
        _id in $ids
      ]{
        _id,
        title,
        site,
        locale
      }
    `,
    {
      ids,
    },
  )

  for (const link of links) {
    const pageId = link.pageId

    if (!pageId) {
      continue
    }

    const page = pickDraftFirst(pages, pageId)

    if (!page) {
      return {
        message: `The selected Internal Page "${pageId}" could not be found.`,
        path: link.path,
      }
    }

    if (cleanId(page.site?._ref) !== siteId) {
      return {
        message:
          `Internal Page ${pageLabel(page, pageId)} must belong to the same ` +
          `Site as this ${options.documentLabel}.`,
        path: link.path,
      }
    }

    if (page.locale !== locale) {
      return {
        message:
          `Internal Page ${pageLabel(page, pageId)} must use the same Locale ` +
          `as this ${options.documentLabel}.`,
        path: link.path,
      }
    }
  }

  return true
}
