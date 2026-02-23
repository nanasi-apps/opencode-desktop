import { os } from '@orpc/server'
import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const OPENCODE_SCHEMA_URL = 'https://opencode.ai/config.json'
const CACHE_DIR = join(app.getPath('userData'), 'cache')
const SCHEMA_CACHE_PATH = join(CACHE_DIR, 'opencode-schema.json')
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

const DEFAULT_SCHEMA: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "theme": {
      "type": "string",
      "description": "Theme preset used by the CLI and UI surfaces"
    },
    "model": {
      "type": "string",
      "description": "Primary model used for normal coding and reasoning tasks"
    },
    "small_model": {
      "type": "string",
      "description": "Lower-cost model for lightweight tasks and fast helper operations"
    },
    "default_agent": {
      "type": "string",
      "description": "Agent profile selected by default when no agent is explicitly specified"
    },
    "username": {
      "type": "string",
      "description": "Name shown in generated content where a user identity is needed"
    },
    "logLevel": {
      "type": "string",
      "enum": ["debug", "info", "warn", "error"],
      "description": "Controls log verbosity"
    },
    "server": {
      "type": "object",
      "properties": {
        "port": { "type": "number" },
        "hostname": { "type": "string" },
        "cors": { "type": "boolean" }
      }
    },
    "provider": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "apiKey": { "type": "string" },
          "baseURL": { "type": "string" },
          "models": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "mcp": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "enabled": { "type": "boolean" },
          "type": { "type": "string", "enum": ["local", "remote"] },
          "command": { "type": "string" },
          "url": { "type": "string" },
          "timeout": { "type": "number" }
        }
      }
    },
    "agent": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "model": { "type": "string" },
          "temperature": { "type": "number" },
          "steps": { "type": "number" }
        }
      }
    },
    "permission": {
      "type": "object",
      "properties": {
        "read": { "type": "string", "enum": ["ask", "allow", "deny"] },
        "edit": { "type": "string", "enum": ["ask", "allow", "deny"] },
        "bash": { "type": "string", "enum": ["ask", "allow", "deny"] }
      }
    },
    "compaction": {
      "type": "object",
      "properties": {
        "auto": { "type": "boolean" },
        "prune": { "type": "boolean" }
      }
    },
    "experimental": {
      "type": "object",
      "properties": {
        "disable_paste_summary": { "type": "boolean" },
        "batch_tool": { "type": "boolean" },
        "continue_loop_on_deny": { "type": "boolean" }
      }
    },
    "plugin": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}

interface SchemaCache {
  schema: Record<string, unknown>
  fetchedAt: string
}

async function ensureCacheDir(): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true })
  }
}

async function fetchSchemaFromRemote(): Promise<Record<string, unknown>> {
  const response = await fetch(OPENCODE_SCHEMA_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<Record<string, unknown>>
}

async function readCachedSchema(): Promise<SchemaCache | null> {
  try {
    if (!existsSync(SCHEMA_CACHE_PATH)) {
      return null
    }
    const content = await readFile(SCHEMA_CACHE_PATH, 'utf-8')
    return JSON.parse(content) as SchemaCache
  } catch {
    return null
  }
}

async function writeCachedSchema(schema: Record<string, unknown>): Promise<void> {
  await ensureCacheDir()
  const cache: SchemaCache = {
    schema,
    fetchedAt: new Date().toISOString(),
  }
  await writeFile(SCHEMA_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
}

function isCacheExpired(cache: SchemaCache): boolean {
  const fetchedAt = new Date(cache.fetchedAt).getTime()
  const now = Date.now()
  return now - fetchedAt > CACHE_MAX_AGE_MS
}

export const getOpencodeSchema = os.handler(async () => {
  console.log('getOpencodeSchema called')
  try {
    const cached = await readCachedSchema()
    console.log('Cache check:', cached ? `cached at ${cached.fetchedAt}` : 'no cache')

    if (cached && !isCacheExpired(cached)) {
      console.log('Returning cached schema')
      return { schema: cached.schema, fromCache: true }
    }

    console.log('Fetching schema from remote...')
    const schema = await fetchSchemaFromRemote()
    await writeCachedSchema(schema)
    console.log('Schema fetched and cached successfully')
    return { schema, fromCache: false }
  } catch (error) {
    console.error('Schema fetch failed:', error)
    const cached = await readCachedSchema()
    if (cached) {
      console.log('Returning cached schema after fetch error')
      return { schema: cached.schema, fromCache: true, error: String(error) }
    }
    console.log('Returning default schema after fetch error')
    return { schema: DEFAULT_SCHEMA, fromCache: false, error: String(error) }
  }
})

export const refreshOpencodeSchema = os.handler(async () => {
  const schema = await fetchSchemaFromRemote()
  await writeCachedSchema(schema)
  return { schema, fromCache: false }
})
