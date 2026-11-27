import {describe, expect, it} from 'vitest'
import {schemaTypes} from '../../index'
import {noticeBlockType} from '../noticeBlockType'
import {pageType} from '../../documents/pageType'
import {blogType} from '../../documents/blogType'
import {singletonType} from '../../documents/singletonType'

function blockMemberTypes(schema: unknown, field: string) {
  const fields = (schema as {fields?: readonly {name: string; of?: readonly {type: string}[]}[]})
    .fields
  const target = fields?.find((item) => item.name === field)
  return (target?.of ?? []).map(({type}) => type)
}

describe('Notice Block authoring', () => {
  it('registers the schema for Studio', () => {
    expect(schemaTypes.some((schema) => schema.name === 'noticeBlock')).toBe(true)
    expect(noticeBlockType.fields.map((field: {name: string}) => field.name)).toEqual(
      expect.arrayContaining(['heading', 'variant', 'alignment', 'icon', 'ctaGroup', 'styles']),
    )
  })

  it('is available on pages, blogs and reusable singletons', () => {
    expect(blockMemberTypes(pageType, 'sections')).toContain('noticeBlock')
    expect(blockMemberTypes(blogType, 'sections')).toContain('noticeBlock')
    expect(blockMemberTypes(singletonType, 'component')).toContain('noticeBlock')
  })
})
