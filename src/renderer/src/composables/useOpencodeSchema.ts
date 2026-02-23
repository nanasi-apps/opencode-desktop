import { ref, computed } from 'vue'
import { client } from '../rpc/client.js'
import type { OmoSchemaField, JsonSchemaProperty } from '../types/settings.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatLabel(key: string): string {
  return key
    .split('_')
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

function pickFieldType(property: JsonSchemaProperty): OmoSchemaField['type'] {
  if (Array.isArray(property.enum) && property.enum.length > 0) return 'enum'

  if (Array.isArray(property.anyOf) && property.anyOf.length > 0) {
    const enumValues = collectAnyOfEnumValues(property)
    if (enumValues.length > 0 && !hasFreeStringAnyOfBranch(property)) {
      return 'enum'
    }

    const objectBranch = property.anyOf.find((branch) => {
      const type = Array.isArray(branch.type) ? branch.type[0] : branch.type
      return type === 'object'
    })

    if (objectBranch && isRecord(objectBranch.properties) && Object.keys(objectBranch.properties).length > 0) {
      return 'nested-object'
    }

    if (objectBranch) {
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
  if (rawType === 'boolean') return 'boolean'
  if (rawType === 'number' || rawType === 'integer') return 'number'
  if (rawType === 'string') return 'string'
  if (rawType === 'object') {
    if (property.properties && Object.keys(property.properties).length > 0) {
      return 'nested-object'
    }
    return 'object'
  }
  if (rawType === 'array') {
    if (Array.isArray(property.items?.enum) && property.items.enum.length > 0) {
      return 'enum-array'
    }
    return 'array'
  }

  return 'json'
}

function parseSchemaProperties(properties: Record<string, JsonSchemaProperty>): OmoSchemaField[] {
  return Object.entries(properties)
    .filter(([key]) => key !== '$schema')
    .map(([key, property]) => {
      const type = pickFieldType(property)
      const anyOfEnumValues = collectAnyOfEnumValues(property)
      const enumValues = Array.isArray(property.enum)
        ? property.enum.map((item) => String(item))
        : anyOfEnumValues

      const field: OmoSchemaField = {
        key,
        label: property.title?.trim() || formatLabel(key),
        type,
        description: property.description ?? '',
        options: enumValues.length > 0
          ? enumValues
          : (Array.isArray(property.items?.enum) ? property.items.enum : undefined),
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
    })
}

function buildPermissionFields(permissionSchema: JsonSchemaProperty): OmoSchemaField[] {
  if (!Array.isArray(permissionSchema.anyOf)) return []
  const objectBranch = permissionSchema.anyOf.find((branch) => isRecord(branch.properties))
  if (!objectBranch || !isRecord(objectBranch.properties)) return []
  const fields = parseSchemaProperties(objectBranch.properties as Record<string, JsonSchemaProperty>)
  return fields.filter((field) => field.key !== '__originalKeys')
}

function buildAgentFields(agentSchema: JsonSchemaProperty): OmoSchemaField[] {
  if (!isRecord(agentSchema.additionalProperties)) return []
  const additionalProperties = agentSchema.additionalProperties as JsonSchemaProperty
  if (!isRecord(additionalProperties.properties)) return []
  return parseSchemaProperties(additionalProperties.properties as Record<string, JsonSchemaProperty>)
}

export function useOpencodeSchema() {
  const schemaError = ref('')
  const isLoading = ref(false)
  const generalFields = ref<OmoSchemaField[]>([])
  const serverFields = ref<OmoSchemaField[]>([])
  const compactionFields = ref<OmoSchemaField[]>([])
  const experimentalFields = ref<OmoSchemaField[]>([])
  const permissionFields = ref<OmoSchemaField[]>([])
  const agentFields = ref<OmoSchemaField[]>([])
  const tuiFields = ref<OmoSchemaField[]>([])
  const skillsFields = ref<OmoSchemaField[]>([])
  const watcherFields = ref<OmoSchemaField[]>([])

  async function loadSchema() {
    isLoading.value = true
    schemaError.value = ''

    try {
      console.log('Fetching OpenCode schema...')
      const response = await client.schema.getOpencodeSchema()
      console.log('Schema response:', { fromCache: response.fromCache, hasError: !!response.error, hasSchema: !!response.schema })
      
      const schema = response.schema as { properties?: Record<string, JsonSchemaProperty> }
      
      if (response.error) {
        console.warn('OpenCode schema fetch issue:', response.error, '- using fallback schema')
      }
      
      const properties = schema.properties ?? {}

      const generalKeys = ['theme', 'model', 'small_model', 'default_agent', 'username', 'logLevel']
      generalFields.value = generalKeys
        .map((key) => properties[key])
        .map((property, index) => {
          if (!property) return null
          return parseSchemaProperties({ [generalKeys[index]]: property })[0]
        })
        .filter((field): field is OmoSchemaField => Boolean(field))

      serverFields.value = isRecord(properties.server?.properties)
        ? parseSchemaProperties(properties.server.properties as Record<string, JsonSchemaProperty>)
        : []

      compactionFields.value = isRecord(properties.compaction?.properties)
        ? parseSchemaProperties(properties.compaction.properties as Record<string, JsonSchemaProperty>)
        : []

      experimentalFields.value = isRecord(properties.experimental?.properties)
        ? parseSchemaProperties(properties.experimental.properties as Record<string, JsonSchemaProperty>)
        : []

      tuiFields.value = isRecord(properties.tui?.properties)
        ? parseSchemaProperties(properties.tui.properties as Record<string, JsonSchemaProperty>)
        : []

      skillsFields.value = isRecord(properties.skills?.properties)
        ? parseSchemaProperties(properties.skills.properties as Record<string, JsonSchemaProperty>)
        : []

      watcherFields.value = isRecord(properties.watcher?.properties)
        ? parseSchemaProperties(properties.watcher.properties as Record<string, JsonSchemaProperty>)
        : []

      permissionFields.value = properties.permission
        ? buildPermissionFields(properties.permission)
        : []

      agentFields.value = properties.agent
        ? buildAgentFields(properties.agent)
        : []
    } catch (err) {
      console.error('Failed to load OpenCode schema:', err)
      generalFields.value = []
      serverFields.value = []
      compactionFields.value = []
      experimentalFields.value = []
      tuiFields.value = []
      skillsFields.value = []
      watcherFields.value = []
      permissionFields.value = []
      agentFields.value = []
      schemaError.value = err instanceof Error
        ? `Could not load OpenCode schema: ${err.message}`
        : 'Could not load OpenCode schema'
    } finally {
      isLoading.value = false
    }
  }

  return {
    schemaError,
    isLoading,
    generalFields,
    serverFields,
    compactionFields,
    experimentalFields,
    tuiFields,
    skillsFields,
    watcherFields,
    permissionFields,
    agentFields,
    loadSchema,
  }
}
