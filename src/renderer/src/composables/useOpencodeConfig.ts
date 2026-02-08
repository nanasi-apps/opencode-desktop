import { reactive, computed } from 'vue'
import type {
  OpencodeConfig,
  ProvidersConfig,
  McpServersConfig,
  AgentsConfig,
  PermissionsConfig,
  PermissionValue,
} from '../types/settings.js'

export function useOpencodeConfig() {
  const config = reactive<OpencodeConfig>({})

  const providers = computed(() => config.provider ?? {})
  const mcpServers = computed(() => config.mcp ?? {})
  const agents = computed(() => config.agent ?? {})
  const permissions = computed(() => config.permission ?? {})
  const server = computed(() => config.server ?? {})
  const compaction = computed(() => config.compaction ?? {})
  const experimental = computed(() => config.experimental ?? {})

  function setValue(key: keyof OpencodeConfig, value: unknown) {
    if (value === '' || value === undefined) {
      delete (config as Record<string, unknown>)[key]
    } else {
      (config as Record<string, unknown>)[key] = value
    }
  }

  function setNestedValue(
    section: 'server' | 'compaction' | 'experimental',
    key: string,
    value: unknown
  ) {
    const sectionObj = (config[section] ?? {}) as Record<string, unknown>
    if (value === undefined || value === '' || value === false) {
      delete sectionObj[key]
    } else {
      sectionObj[key] = value
    }
    if (Object.keys(sectionObj).length === 0) {
      delete (config as Record<string, unknown>)[section]
    } else {
      (config as Record<string, unknown>)[section] = sectionObj
    }
  }

  function setProviderField(name: string, path: string, value: unknown) {
    const provs = (config.provider ?? {}) as ProvidersConfig
    if (!provs[name]) provs[name] = {}
    const parts = path.split('.')

    if (parts.length === 2) {
      const parent = parts[0]
      const child = parts[1]
      if (!provs[name][parent]) provs[name][parent] = {}
      const nested = provs[name][parent] as Record<string, unknown>
      if (value === '' || value === undefined) {
        delete nested[child]
      } else {
        nested[child] = value
      }
      if (Object.keys(nested).length === 0) {
        delete provs[name][parent]
      }
    } else {
      const key = parts[0]
      if (value === '' || value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete provs[name][key]
      } else {
        provs[name][key] = value
      }
    }

    if (Object.keys(provs[name]).length === 0) {
      delete provs[name]
    }
    if (Object.keys(provs).length === 0) {
      delete (config as Record<string, unknown>).provider
    } else {
      config.provider = provs
    }
  }

  function addProvider(name: string) {
    const provs = (config.provider ?? {}) as ProvidersConfig
    if (!provs[name]) {
      provs[name] = {}
      config.provider = provs
    }
  }

  function removeProvider(name: string) {
    const provs = (config.provider ?? {}) as ProvidersConfig
    delete provs[name]
    if (Object.keys(provs).length === 0) {
      delete (config as Record<string, unknown>).provider
    } else {
      config.provider = provs
    }
  }

  function setMcpField(name: string, key: string, value: unknown) {
    const mcps = (config.mcp ?? {}) as McpServersConfig
    if (!mcps[name]) mcps[name] = { type: 'local', enabled: true }
    if (value === '' || value === undefined) {
      delete mcps[name][key]
    } else {
      mcps[name][key] = value
    }
    if (Object.keys(mcps[name]).length === 0) {
      delete mcps[name]
    }
    if (Object.keys(mcps).length === 0) {
      delete (config as Record<string, unknown>).mcp
    } else {
      config.mcp = mcps
    }
  }

  function addMcp(name: string) {
    const mcps = (config.mcp ?? {}) as McpServersConfig
    if (!mcps[name]) {
      mcps[name] = { type: 'local', enabled: true }
      config.mcp = mcps
    }
  }

  function removeMcp(name: string) {
    const mcps = (config.mcp ?? {}) as McpServersConfig
    delete mcps[name]
    if (Object.keys(mcps).length === 0) {
      delete (config as Record<string, unknown>).mcp
    } else {
      config.mcp = mcps
    }
  }

  function getAgentField(name: string, field: string): unknown {
    return (config.agent ?? {})[name]?.[field] ?? ''
  }

  function setAgentField(name: string, field: string, value: unknown) {
    const agents = (config.agent ?? {}) as AgentsConfig
    if (!agents[name]) agents[name] = {}
    if (value === '' || value === undefined || (typeof value === 'number' && isNaN(value))) {
      delete agents[name][field]
    } else {
      agents[name][field] = value
    }
    if (Object.keys(agents[name]).length === 0) {
      delete agents[name]
    }
    if (Object.keys(agents).length === 0) {
      delete (config as Record<string, unknown>).agent
    } else {
      config.agent = agents
    }
  }

  function addAgent(name: string) {
    const agents = (config.agent ?? {}) as AgentsConfig
    if (!agents[name]) {
      agents[name] = {}
      config.agent = agents
    }
  }

  function removeAgent(name: string) {
    const agents = (config.agent ?? {}) as AgentsConfig
    delete agents[name]
    if (Object.keys(agents).length === 0) {
      delete (config as Record<string, unknown>).agent
    } else {
      config.agent = agents
    }
  }

  function getPermission(tool: string): string {
    const perms = (config.permission ?? {}) as PermissionsConfig
    return perms[tool] ?? ''
  }

  function setPermission(tool: string, value: string) {
    const perms = (config.permission ?? {}) as PermissionsConfig
    if (value === '') {
      delete perms[tool]
    } else {
      perms[tool] = value as PermissionValue
    }
    if (Object.keys(perms).length === 0) {
      delete (config as Record<string, unknown>).permission
    } else {
      config.permission = perms
    }
  }

  function getConfigForSave(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(config))
  }

  function loadConfig(loadedConfig: OpencodeConfig) {
    Object.assign(config, loadedConfig)
  }

  return {
    config,
    providers,
    mcpServers,
    agents,
    permissions,
    server,
    compaction,
    experimental,
    setValue,
    setNestedValue,
    setProviderField,
    addProvider,
    removeProvider,
    setMcpField,
    addMcp,
    removeMcp,
    getAgentField,
    setAgentField,
    addAgent,
    removeAgent,
    getPermission,
    setPermission,
    getConfigForSave,
    loadConfig,
  }
}
