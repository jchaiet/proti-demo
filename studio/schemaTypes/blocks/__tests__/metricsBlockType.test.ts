import {describe, expect, it} from 'vitest'
import {schemaTypes} from '../../index'
import {metricsBlockType} from '../metricsBlockType'
import {metricItemType} from '../../objects/metricItemType'
import {pageType} from '../../documents/pageType'
import {blogType} from '../../documents/blogType'
import {singletonType} from '../../documents/singletonType'

function arrayMembers(schema: unknown, fieldName: string): string[] {
  const fields = (schema as {fields?: readonly {name: string; of?: readonly {type: string}[]}[]})
    .fields
  const target = fields?.find((field) => field.name === fieldName)
  return (target?.of ?? []).map((item) => item.type)
}

describe('Metrics block authoring contract', () => {
  it('registers both the block and its metric item schema', () => {
    expect(schemaTypes.some((type) => type.name === 'metricsBlock')).toBe(true)
    expect(schemaTypes.some((type) => type.name === 'metricItem')).toBe(true)
    expect(metricsBlockType.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['heading', 'variant', 'alignment', 'columns', 'metrics', 'styles']),
    )
    expect(metricItemType.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['value', 'prefix', 'suffix', 'label', 'description']),
    )
  })
  it('makes the block available on pages, blogs and singletons', () => {
    expect(arrayMembers(pageType, 'sections')).toContain('metricsBlock')
    expect(arrayMembers(blogType, 'sections')).toContain('metricsBlock')
    expect(arrayMembers(singletonType, 'component')).toContain('metricsBlock')
    expect(arrayMembers(metricsBlockType, 'metrics')).toContain('metricItem')
  })
})
