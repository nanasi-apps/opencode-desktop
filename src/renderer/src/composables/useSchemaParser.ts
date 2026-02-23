import { ref } from 'vue'
import type { OmoSchemaField, JsonSchemaProperty } from '../types/settings.js'

export type SchemaFieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'enum' 
  | 'enum-array' 
  | 'array' 
  | 'object' 
  | 'nested-object' 
  | 'json'

export interface SchemaField {
  key: string
  label: string
  type: SchemaFieldType
  description?: string
  placeholder?: string
  options?: string[]
  properties?: SchemaField[]
  required?: boolean
  minimum?: number
  maximum?: number
  pattern?: string
  default?: unknown
}

export interface SchemaSection {
  id: string
  key: string
  label: string
  description?: string
  fields: SchemaField[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatLabel(key: string): string {
  return key
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function collectAnyOfEnumValues(property: JsonSchemaProperty): string[] {
  if (!Array.isArray(property.anyOf)) return []
  const values = new Set<string>()

  for (const branch of property.anyOf) {
    if (Array.isArray(branch.enum)) {
      branch.enum.forEach((item) => values.add(String(item)))
    }
    if (Object.prototype.hasOwnProperty.call(branch, 'const')) {
      values.add(String((branch as Record<string, unknown>).const))
    }
  }

  return [...values]
}

function hasFreeStringAnyOfBranch(property: JsonSchemaProperty): boolean {
  if (!Array.isArray(property.anyOf)) return false
  return property.anyOf.some((branch) => {
    const type = Array.isArray(branch.type) ? branch.type[0] : branch.type
    return type === 'string' && !Array.isArray(branch.enum) && !Object.prototype.hasOwnProperty.call(branch, 'const')
  })
}

function pickFieldType(property: JsonSchemaProperty): SchemaFieldType {
  if (Array.isArray(property.enum) && property.enum.length > 0) return 'enum'

  if (Array.isArray(property.anyOf) && property.anyOf.length > 0) {
    const enumValues = collectAnyOfEnumValues(property)
    if (enumValues.length > 0 && !hasFreeStringAnyOfBranch(property)) {
      return 'enum'
    }

    const objectBranch = property.anyOf.find((branch) => {
      const type = Array.isArray(branch.type) ? branch.type[0] : branch.type
      return type === 'object' && isRecord(branch.properties) && Object.keys(branch.properties).length > 0
    })

    if (objectBranch) {
      return 'nested-object'
    }

    const simpleObjectBranch = property.anyOf.find((branch) => {
      const type = Array.isArray(branch.type) ? branch.type[0] : branch.type
      return type === 'object'
    })

    if (simpleObjectBranch) {
      return 'object'
    }

    const stringBranch = property.anyOf.find((branch) => {
      const type = Array.isArray(branch.type) ? branch.type[0] : branch.type
      return type === 'string'
    })
    if (stringBranch) return 'string'

    const numberBranch = property.anyOf.find((branch) => {
      const type = Array.isArray(branch.type) ? branch.type[0] : branch.type
      return type === 'number' || type === 'integer'
    })
    if (numberBranch) return 'number'

    const booleanBranch = property.anyOf.find((branch) => {
      const type = Array.isArray(branch.type) ? branch.type[0] : branch.type
      return type === 'boolean'
    })
    if (booleanBranch) return 'boolean'
  }

  const rawType = Array.isArray(property.type) ? property.type[0] : property.type
  
  switch (rawType) {
    case 'boolean':
      return 'boolean'
    case 'number':
    case 'integer':
      return 'number'
    case 'string':
      return 'string'
    case 'object':
      if (property.properties && Object.keys(property.properties).length > 0) {
        return 'nested-object'
      }
      return 'object'
    case 'array':
      if (Array.isArray(property.items?.enum) && property.items.enum.length > 0) {
        return 'enum-array'
      }
      return 'array'
    default:
      return 'json'
  }
}

function parseProperty(key: string, property: JsonSchemaProperty): SchemaField {
  const type = pickFieldType(property)
  const anyOfEnumValues = collectAnyOfEnumValues(property)
  const enumValues = Array.isArray(property.enum)
    ? property.enum.map((item) => String(item))
    : anyOfEnumValues

  const field: SchemaField = {
    key,
    label: property.title?.trim() || formatLabel(key),
    type,
    description: property.description,
    placeholder: property.description,
    options: enumValues.length > 0
      ? enumValues
      : (Array.isArray(property.items?.enum) ? property.items.enum : undefined),
    required: false,
    minimum: property.minimum,
    maximum: property.maximum,
    pattern: property.pattern,
  }

  if (type === 'nested-object') {
    if (property.properties && Object.keys(property.properties).length > 0) {
      field.properties = parseSchemaProperties(property.properties)
    } else if (Array.isArray(property.anyOf)) {
      const objectBranch = property.anyOf.find((branch) => isRecord(branch.properties))
      if (objectBranch && isRecord(objectBranch.properties)) {
        field.properties = parseSchemaProperties(objectBranch.properties as Record<string, JsonSchemaProperty>)
      }
    }
  }

  return field
}

function parseSchemaProperties(properties: Record<string, JsonSchemaProperty>): SchemaField[] {
  return Object.entries(properties)
    .filter(([key]) => key !== '$schema')
    .map(([key, property]) => parseProperty(key, property))
}

function parseSectionFromProperty(key: string, property: JsonSchemaProperty): SchemaSection | null {
  const type = Array.isArray(property.type) ? property.type[0] : property.type
  
  if (type !== 'object') {
    return null
  }

  const fields: SchemaField[] = []
  
  if (property.properties && Object.keys(property.properties).length > 0) {
    fields.push(...parseSchemaProperties(property.properties))
  }

  if (isRecord(property.additionalProperties)) {
    const additionalProps = property.additionalProperties as JsonSchemaProperty
    if (additionalProps.properties && Object.keys(additionalProps.properties).length > 0) {
      const templateFields = parseSchemaProperties(additionalProps.properties)
      fields.push({
        key: '__template',
        label: 'Template',
        type: 'nested-object',
        description: 'Template for items in this section',
        properties: templateFields,
      })
    }
  }

  if (fields.length === 0) {
    return null
  }

  return {
    id: `section-${key}`,
    key,
    label: property.title?.trim() || formatLabel(key),
    description: property.description,
    fields,
    collapsible: true,
    defaultCollapsed: true,
  }
}

export interface ParsedSchema {
  title?: string
  description?: string
  sections: SchemaSection[]
  rootFields: SchemaField[]
}

export function parseSchema(schema: { properties?: Record<string, JsonSchemaProperty> }): ParsedSchema {
  const properties = schema.properties ?? {}
  const sections: SchemaSection[] = []
  const rootFields: SchemaField[] = []

  for (const [key, property] of Object.entries(properties)) {
    if (key === '$schema') continue

    const type = Array.isArray(property.type) ? property.type[0] : property.type

    if (type === 'object' && (property.properties || isRecord(property.additionalProperties))) {
      const section = parseSectionFromProperty(key, property)
      if (section) {
        sections.push(section)
      }
    } else {
      rootFields.push(parseProperty(key, property))
    }
  }

  return {
    title: schema.title,
    description: schema.description,
    sections,
    rootFields,
  }
}

export function useSchemaParser() {
  const parsedSchema = ref<ParsedSchema | null>(null)
  const error = ref<string>('')
  const loading = ref(false)

  async function loadAndParseSchema(url: string): Promise<ParsedSchema | null> {
    loading.value = true
    error.value = ''
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.status}`)
      }

      const schema = await response.json()
      parsedSchema.value = parseSchema(schema)
      return parsedSchema.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error loading schema'
      parsedSchema.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  function parseLocalSchema(schema: { properties?: Record<string, JsonSchemaProperty> }): ParsedSchema {
    parsedSchema.value = parseSchema(schema)
    return parsedSchema.value
  }

  return {
    parsedSchema,
    error,
    loading,
    loadAndParseSchema,
    parseLocalSchema,
    parseSchema,
    parseProperty,
  }
}
