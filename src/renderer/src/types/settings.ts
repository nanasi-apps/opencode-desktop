export type SettingsGroup = 'opencode' | 'wrapper' | 'omo'

export interface SettingsSection {
  id: string
  label: string
  group: SettingsGroup
}

export interface GeneralField {
  key: string
  label: string
  type?: 'text' | 'select' | 'password' | 'number'
  placeholder?: string
  description: string
  options?: string[]
}

export interface ExperimentalField {
  key: string
  label: string
  description: string
}

export interface ProviderConfig {
  options?: {
    apiKey?: string
    baseURL?: string
    [key: string]: unknown
  }
  models?: string[]
  [key: string]: unknown
}

export type ProvidersConfig = Record<string, ProviderConfig>

export type McpType = 'local' | 'remote'

export interface McpServerConfig {
  enabled?: boolean
  type?: McpType
  command?: string | string[]
  environment?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  timeout?: number
  [key: string]: unknown
}

export type McpServersConfig = Record<string, McpServerConfig>

export interface AgentConfig {
  model?: string
  temperature?: number
  steps?: number
  [key: string]: unknown
}

export type AgentsConfig = Record<string, AgentConfig>

export type PermissionValue = '' | 'ask' | 'allow' | 'deny'

export type PermissionsConfig = Record<string, PermissionValue>

export interface ServerConfig {
  port?: number
  hostname?: string
  cors?: boolean
}

export interface CompactionConfig {
  auto?: boolean
  prune?: boolean
}

export interface ExperimentalConfig {
  disable_paste_summary?: boolean
  batch_tool?: boolean
  continue_loop_on_deny?: boolean
}

export interface WebSettings {
  port: number | null
  hostname: string
  mdns: boolean
  mdnsDomain: string | null
  cors: string[]
  username: string | null
  password: string | null
  extraArgs: string[]
}

export type TunnelMode = 'named' | 'quick'

export interface TunnelSettings {
  enabled: boolean
  mode: TunnelMode
  token: string | null
  hostname: string | null
  cloudflaredPath: string | null
  autoStartWithWeb: boolean
}

export interface OpencodeConfig {
  theme?: string
  model?: string
  small_model?: string
  default_agent?: string
  username?: string
  logLevel?: string
  provider?: ProvidersConfig
  mcp?: McpServersConfig
  agent?: AgentsConfig
  permission?: PermissionsConfig
  server?: ServerConfig
  compaction?: CompactionConfig
  experimental?: ExperimentalConfig
  plugin?: string[]
}

export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'

export interface JsonSchemaProperty {
  type?: JsonSchemaType | JsonSchemaType[]
  enum?: string[]
  description?: string
  title?: string
  required?: string[]
  properties?: Record<string, JsonSchemaProperty>
  additionalProperties?: JsonSchemaProperty | boolean
  anyOf?: JsonSchemaProperty[]
  minimum?: number
  maximum?: number
  pattern?: string
  items?: {
    type?: string
    enum?: string[]
  }
}

export type OmoFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'enum-array' | 'array' | 'object' | 'nested-object' | 'json'

export interface OmoSchemaField {
  key: string
  label: string
  type: OmoFieldType
  description: string
  options?: string[]
  properties?: OmoSchemaField[]
}

export type OmoAgentMode = 'subagent' | 'primary' | 'all' | ''

export interface OmoAgentPermission {
  edit?: OmoPermissionValue
  bash?: OmoPermissionValue | Record<string, OmoPermissionValue>
  webfetch?: OmoPermissionValue
  doom_loop?: OmoPermissionValue
  external_directory?: OmoPermissionValue
}

export type OmoPermissionValue = 'ask' | 'allow' | 'deny' | ''

export interface OmoAgentConfig {
  model?: string
  variant?: string
  category?: string
  mode?: OmoAgentMode
  temperature?: number
  top_p?: number
  disable?: boolean
  color?: string
  description?: string
  prompt?: string
  prompt_append?: string
  skills?: string[]
  tools?: Record<string, boolean>
  permission?: OmoAgentPermission
  [key: string]: unknown
}

export type OmoAgentsConfig = Record<string, OmoAgentConfig>

export type OmoCategoryConfig = Record<string, unknown>

export type OmoCategoriesConfig = Record<string, OmoCategoryConfig>

export interface OmoConfig {
  agents?: OmoAgentsConfig
  categories?: OmoCategoriesConfig
  [key: string]: unknown
}

export interface WrapperSettings {
  launchAtLogin: boolean
  web: WebSettings
  tunnel: TunnelSettings
}

export type CollapsedState = Record<string, boolean>
