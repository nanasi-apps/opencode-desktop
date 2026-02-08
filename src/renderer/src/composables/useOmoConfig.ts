import { ref, reactive, computed } from 'vue'
import type {
  OmoConfig,
  OmoAgentsConfig,
  OmoAgentConfig,
  OmoCategoriesConfig,
  OmoCategoryConfig,
  OmoPermissionValue,
  OmoSchemaField,
  JsonSchemaProperty,
} from '../types/settings.js'

const OMO_SCHEMA_URL = 'https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatLabel(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function pickFieldType(property: JsonSchemaProperty): OmoSchemaField['type'] {
  if (Array.isArray(property.enum) && property.enum.length > 0) return 'enum'
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
      const field: OmoSchemaField = {
        key,
        label: property.title?.trim() || formatLabel(key),
        type,
        description: property.description ?? '',
        options: Array.isArray(property.enum)
          ? property.enum
          : (Array.isArray(property.items?.enum) ? property.items.enum : undefined),
      }
      if (type === 'nested-object' && property.properties) {
        field.properties = parseSchemaProperties(property.properties)
      }
      return field
    })
}

const OMO_DEDICATED_SECTION_FIELD_MAP: Record<string, string> = {
  'omo-agents': 'agents',
  'omo-categories': 'categories',
  'omo-claude-code': 'claude_code',
  'omo-sisyphus-agent': 'sisyphus_agent',
  'omo-comment-checker': 'comment_checker',
  'omo-experimental': 'experimental',
  'omo-auto-update': 'auto_update',
  'omo-skills': 'skills',
  'omo-ralph-loop': 'ralph_loop',
  'omo-background-task': 'background_task',
  'omo-notification': 'notification',
  'omo-git-master': 'git_master',
}

const OMO_DEDICATED_FIELD_KEYS = new Set(Object.values(OMO_DEDICATED_SECTION_FIELD_MAP))

export function useOmoConfig() {
  const config = reactive<OmoConfig>({})
  const schemaFields = ref<OmoSchemaField[]>([])
  const categoryValueFields = ref<OmoSchemaField[]>([])
  const schemaError = ref('')

  const agentNames = computed(() => {
    const agents = config.agents ?? {}
    return Object.keys(agents)
  })

  const categoryNames = computed(() => {
    const categories = config.categories ?? {}
    return Object.keys(categories)
  })

  const customKeys = computed(() => {
    const known = new Set(schemaFields.value.map(field => field.key))
    return Object.keys(config).filter(key => !known.has(key) && key !== 'agents')
  })

  function getFieldValue(key: string): unknown {
    return config[key]
  }

  function setFieldValue(key: string, value: unknown) {
    if (value === '' || value === undefined || value === null) {
      delete config[key]
    } else {
      config[key] = value
    }
  }

  function setNumberField(key: string, value: string) {
    if (value.trim() === '') {
      delete config[key]
      return
    }
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      config[key] = parsed
    }
  }

  function setArrayField(key: string, value: string) {
    const lines = value.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) {
      delete config[key]
    } else {
      config[key] = lines
    }
  }

  function getEnumArrayValues(key: string): string[] {
    const value = config[key]
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === 'string')
  }

  function toggleEnumArrayValue(key: string, option: string, checked: boolean) {
    const current = getEnumArrayValues(key)
    const next = checked
      ? Array.from(new Set([...current, option]))
      : current.filter(item => item !== option)

    if (next.length === 0) {
      delete config[key]
    } else {
      config[key] = next
    }
  }

  function getJsonValue(key: string): string {
    const value = config[key]
    if (value === undefined) return ''
    return JSON.stringify(value, null, 2)
  }

  function setJsonField(key: string, value: string): boolean {
    const trimmed = value.trim()
    if (!trimmed) {
      delete config[key]
      return true
    }
    try {
      config[key] = JSON.parse(trimmed)
      return true
    } catch {
      return false
    }
  }

  function getObjectMapField(key: string): string {
    const value = config[key]
    if (!isRecord(value)) return ''
    return Object.entries(value)
      .map(([entryKey, entryValue]) => {
        if (typeof entryValue === 'string' || typeof entryValue === 'number' || typeof entryValue === 'boolean') {
          return `${entryKey}=${String(entryValue)}`
        }
        return `${entryKey}=${JSON.stringify(entryValue)}`
      })
      .join('\n')
  }

  function setObjectMapField(key: string, raw: string) {
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) {
      delete config[key]
      return
    }

    const next: Record<string, unknown> = {}
    for (const line of lines) {
      const index = line.indexOf('=')
      if (index <= 0) continue
      const entryKey = line.slice(0, index).trim()
      const entryValue = line.slice(index + 1).trim()
      if (!entryKey) continue
      if (entryValue.startsWith('{') || entryValue.startsWith('[') || entryValue.startsWith('"')) {
        try {
          next[entryKey] = JSON.parse(entryValue)
          continue
        } catch {
        }
      }
      if (entryValue === 'true') next[entryKey] = true
      else if (entryValue === 'false') next[entryKey] = false
      else if (!Number.isNaN(Number(entryValue)) && entryValue !== '') next[entryKey] = Number(entryValue)
      else next[entryKey] = entryValue
    }

    if (Object.keys(next).length === 0) {
      delete config[key]
    } else {
      config[key] = next
    }
  }

  function isDisabledField(field: OmoSchemaField): boolean {
    return field.key.startsWith('disabled_')
  }

  function getFieldsForSection(sectionId: string): OmoSchemaField[] {
    if (sectionId === 'omo-general') {
      return schemaFields.value.filter(
        field => !OMO_DEDICATED_FIELD_KEYS.has(field.key)
          && !isDisabledField(field)
      )
    }

    const dedicatedKey = OMO_DEDICATED_SECTION_FIELD_MAP[sectionId]
    if (dedicatedKey) {
      return schemaFields.value.filter(field => field.key === dedicatedKey)
    }

    if (sectionId === 'omo-disabled') {
      return schemaFields.value.filter(field => isDisabledField(field))
    }
    if (sectionId === 'omo-agents') {
      return schemaFields.value.filter(field => field.key === 'agents')
    }
    return []
  }

  function getAgentObject(name: string): OmoAgentConfig {
    const agents = config.agents ?? {}
    const value = agents[name]
    return isRecord(value) ? (value as OmoAgentConfig) : {}
  }

  function getCategoryObject(name: string): OmoCategoryConfig {
    const categories = config.categories ?? {}
    const value = categories[name]
    return isRecord(value) ? (value as OmoCategoryConfig) : {}
  }

  function ensureCategoryObject(name: string): OmoCategoryConfig {
    if (!isRecord(config.categories)) {
      config.categories = {}
    }
    const categories = config.categories as OmoCategoriesConfig
    if (!isRecord(categories[name])) {
      categories[name] = {}
    }
    return categories[name] as OmoCategoryConfig
  }

  function cleanupCategory(name: string) {
    const categories = config.categories as OmoCategoriesConfig
    const category = categories[name]
    if (!isRecord(category) || Object.keys(category).length > 0) {
      return
    }
    delete categories[name]
    if (Object.keys(categories).length === 0) {
      delete config.categories
    }
  }

  function getCategoryFieldValue(name: string, key: string): unknown {
    const category = getCategoryObject(name)
    return category[key]
  }

  function setCategoryFieldValue(name: string, key: string, value: unknown) {
    const category = ensureCategoryObject(name)
    if (value === undefined || value === null || value === '') {
      delete category[key]
    } else {
      category[key] = value
    }
    cleanupCategory(name)
  }

  function addCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    ensureCategoryObject(trimmed)
  }

  function removeCategory(name: string) {
    const categories = config.categories ?? {}
    delete (categories as OmoCategoriesConfig)[name]
    if (Object.keys(categories).length === 0) {
      delete config.categories
    }
  }

  function ensureAgentObject(name: string): OmoAgentConfig {
    if (!isRecord(config.agents)) {
      config.agents = {}
    }
    const agents = config.agents as OmoAgentsConfig
    if (!isRecord(agents[name])) {
      agents[name] = {}
    }
    return agents[name] as OmoAgentConfig
  }

  function cleanupAgent(name: string) {
    const agents = config.agents as OmoAgentsConfig
    const agent = agents[name]
    if (!isRecord(agent) || Object.keys(agent).length > 0) {
      return
    }
    delete agents[name]
    if (Object.keys(agents).length === 0) {
      delete config.agents
    }
  }

  function getAgentStringField(name: string, key: string): string {
    const agent = getAgentObject(name)
    const value = agent[key]
    return typeof value === 'string' ? value : ''
  }

  function setAgentStringField(name: string, key: string, value: string) {
    const agent = ensureAgentObject(name)
    if (value.trim() === '') {
      delete agent[key]
    } else {
      agent[key] = value
    }
    cleanupAgent(name)
  }

  function getAgentNumberField(name: string, key: string): string {
    const agent = getAgentObject(name)
    const value = agent[key]
    return typeof value === 'number' ? String(value) : ''
  }

  function setAgentNumberField(name: string, key: string, value: string) {
    const agent = ensureAgentObject(name)
    const trimmed = value.trim()
    if (trimmed === '') {
      delete agent[key]
      cleanupAgent(name)
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isNaN(parsed)) {
      agent[key] = parsed
    }
  }

  function getAgentBooleanField(name: string, key: string): boolean {
    const agent = getAgentObject(name)
    return agent[key] === true
  }

  function setAgentBooleanField(name: string, key: string, value: boolean) {
    const agent = ensureAgentObject(name)
    if (!value) {
      delete agent[key]
      cleanupAgent(name)
      return
    }
    agent[key] = true
  }

  function getAgentArrayField(name: string, key: string): string {
    const agent = getAgentObject(name)
    const value = agent[key]
    if (!Array.isArray(value)) return ''
    return value.filter((item): item is string => typeof item === 'string').join('\n')
  }

  function setAgentArrayField(name: string, key: string, value: string) {
    const agent = ensureAgentObject(name)
    const lines = value.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) {
      delete agent[key]
      cleanupAgent(name)
      return
    }
    agent[key] = lines
  }

  function getAgentBooleanMapField(name: string, key: string): string {
    const agent = getAgentObject(name)
    const value = agent[key]
    if (!isRecord(value)) return ''
    return Object.entries(value)
      .filter(([, mapValue]) => typeof mapValue === 'boolean')
      .map(([mapKey, mapValue]) => `${mapKey}=${mapValue ? 'true' : 'false'}`)
      .join('\n')
  }

  function setAgentBooleanMapField(name: string, key: string, raw: string) {
    const agent = ensureAgentObject(name)
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) {
      delete agent[key]
      cleanupAgent(name)
      return
    }

    const next: Record<string, boolean> = {}
    for (const line of lines) {
      const index = line.indexOf('=')
      if (index <= 0) continue
      const mapKey = line.slice(0, index).trim()
      const rawValue = line.slice(index + 1).trim().toLowerCase()
      if (!mapKey) continue
      if (rawValue === 'true') next[mapKey] = true
      if (rawValue === 'false') next[mapKey] = false
    }

    if (Object.keys(next).length === 0) {
      delete agent[key]
      cleanupAgent(name)
      return
    }

    agent[key] = next
  }

  function getAgentPermissionField(name: string, key: string): OmoPermissionValue {
    const agent = getAgentObject(name)
    if (!isRecord(agent.permission)) return ''
    const value = agent.permission[key]
    return typeof value === 'string' ? (value as OmoPermissionValue) : ''
  }

  function setAgentPermissionField(name: string, key: string, value: OmoPermissionValue) {
    const agent = ensureAgentObject(name)
    if (!isRecord(agent.permission)) {
      agent.permission = {}
    }
    const permission = agent.permission as Record<string, OmoPermissionValue>
    if (value !== 'ask' && value !== 'allow' && value !== 'deny') {
      delete permission[key]
    } else {
      permission[key] = value
    }
    cleanupAgentPermission(name)
  }

  function getAgentPermissionBashMap(name: string): string {
    const agent = getAgentObject(name)
    if (!isRecord(agent.permission)) return ''
    const bash = agent.permission.bash
    if (!isRecord(bash)) return ''
    return Object.entries(bash)
      .filter(([, value]) => value === 'ask' || value === 'allow' || value === 'deny')
      .map(([command, value]) => `${command}=${value}`)
      .join('\n')
  }

  function setAgentPermissionBashMap(name: string, raw: string) {
    const agent = ensureAgentObject(name)
    if (!isRecord(agent.permission)) {
      agent.permission = {}
    }
    const permission = agent.permission as Record<string, unknown>
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) {
      if (isRecord(permission.bash)) {
        delete permission.bash
      }
      cleanupAgentPermission(name)
      return
    }

    const next: Record<string, OmoPermissionValue> = {}
    for (const line of lines) {
      const index = line.indexOf('=')
      if (index <= 0) continue
      const command = line.slice(0, index).trim()
      const value = line.slice(index + 1).trim()
      if (!command) continue
      if (value === 'ask' || value === 'allow' || value === 'deny') {
        next[command] = value
      }
    }

    if (Object.keys(next).length === 0) {
      delete permission.bash
      cleanupAgentPermission(name)
      return
    }

    permission.bash = next
  }

  function cleanupAgentPermission(name: string) {
    const agent = ensureAgentObject(name)
    if (!isRecord(agent.permission)) {
      cleanupAgent(name)
      return
    }

    if (Object.keys(agent.permission).length === 0) {
      delete agent.permission
    }

    cleanupAgent(name)
  }

  function addAgent(name: string) {
    if (!isRecord(config.agents)) {
      config.agents = {}
    }
    const agents = config.agents as OmoAgentsConfig
    if (!isRecord(agents[name])) {
      agents[name] = {}
    }
  }

  function removeAgent(name: string) {
    const agents = config.agents ?? {}
    delete (agents as OmoAgentsConfig)[name]
    if (Object.keys(agents).length === 0) {
      delete config.agents
    }
  }

  async function loadSchema() {
    schemaError.value = ''

    try {
      const response = await fetch(OMO_SCHEMA_URL)
      if (!response.ok) {
        throw new Error(`schema fetch failed (${response.status})`)
      }

      const schema = await response.json() as {
        properties?: Record<string, JsonSchemaProperty>
      }

      const properties = schema.properties ?? {}
      schemaFields.value = parseSchemaProperties(properties)

      const categoriesProperty = properties.categories
      const additionalProperties = categoriesProperty?.additionalProperties
      if (isRecord(additionalProperties) && isRecord(additionalProperties.properties)) {
        categoryValueFields.value = parseSchemaProperties(additionalProperties.properties as Record<string, JsonSchemaProperty>)
      } else {
        categoryValueFields.value = []
      }
    } catch (err) {
      categoryValueFields.value = []
      schemaError.value = err instanceof Error
        ? `Could not load OMO schema: ${err.message}`
        : 'Could not load OMO schema'
    }
  }

  function getConfigForSave(): OmoConfig {
    return JSON.parse(JSON.stringify(config))
  }

  function loadConfig(loadedConfig: OmoConfig) {
    Object.assign(config, loadedConfig)
  }

  return {
    config,
    schemaFields,
    categoryValueFields,
    schemaError,
    agentNames,
    categoryNames,
    customKeys,
    OMO_SCHEMA_URL,
    getFieldValue,
    setFieldValue,
    setNumberField,
    setArrayField,
    getEnumArrayValues,
    toggleEnumArrayValue,
    getJsonValue,
    setJsonField,
    getObjectMapField,
    setObjectMapField,
    isDisabledField,
    getFieldsForSection,
    getAgentObject,
    getAgentStringField,
    setAgentStringField,
    getAgentNumberField,
    setAgentNumberField,
    getAgentBooleanField,
    setAgentBooleanField,
    getAgentArrayField,
    setAgentArrayField,
    getAgentBooleanMapField,
    setAgentBooleanMapField,
    getAgentPermissionField,
    setAgentPermissionField,
    getAgentPermissionBashMap,
    setAgentPermissionBashMap,
    addAgent,
    removeAgent,
    getCategoryFieldValue,
    setCategoryFieldValue,
    addCategory,
    removeCategory,
    loadSchema,
    getConfigForSave,
    loadConfig,
  }
}
