import {describe, expect, it} from 'vitest'

import {navigationHeaderType} from '../navigationHeaderType'
import {navigationItemType} from '../../objects/navigationItemType'
import {
  navigationMegaMenuType,
  navigationMegaContentSectionType,
  navigationMegaFeatureSectionType,
} from '../../objects/navigationMegaMenuTypes'

type Field = {
  name?: string
  type?: string
  of?: Array<{type?: string}>
  options?: {list?: Array<{value?: string}>}
}

function field(schema: {fields?: unknown}, name: string): Field {
  const result = ((schema.fields ?? []) as Field[]).find((item) => item.name === name)
  if (!result) throw new Error(`Missing schema field: ${name}`)
  return result
}

describe('Header Mega Menu authoring', () => {
  it('uses navigationItem for Header Primary Navigation', () => {
    expect(field(navigationHeaderType, 'items').of?.map((item) => item.type)).toContain(
      'navigationItem',
    )
  })

  it('allows top-level Header items to select Mega Menu', () => {
    expect(field(navigationItemType, 'mode').options?.list?.map((item) => item.value)).toContain(
      'mega',
    )
    expect(field(navigationItemType, 'megaMenu').type).toBe('navigationMegaMenu')
  })

  it('makes mixed links, tiles, cards and Featured styles available within the Mega Menu', () => {
    expect(field(navigationMegaMenuType, 'sections').of?.map((item) => item.type)).toContain(
      'navigationMegaContentSection',
    )
    expect(field(navigationMegaContentSectionType, 'items').of?.map((item) => item.type)).toEqual([
      'navigationSubItem',
      'navigationMegaTile',
      'navigationMegaCard',
    ])
    expect(
      field(navigationMegaFeatureSectionType, 'presentation').options?.list?.map(
        (item) => item.value,
      ),
    ).toEqual(['tile', 'card'])
  })
})
