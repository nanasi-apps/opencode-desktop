import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const CONFIG_DIR = path.join(homedir(), '.config', 'opencode')
const CONFIG_JSONC = path.join(CONFIG_DIR, 'oh-my-opencode.jsonc')
const CONFIG_JSON = path.join(CONFIG_DIR, 'oh-my-opencode.json')

function stripJsoncComments(text: string): string {
  let result = ''
  let i = 0
  let inString = false
  let escape = false

  while (i < text.length) {
    const ch = text[i]

    if (inString) {
      result += ch
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      i++
      continue
    }

    if (ch === '"') {
      inString = true
      result += ch
      i++
      continue
    }

    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }

    if (ch === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }

    result += ch
    i++
  }

  return result
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

interface OmoConfigReadResult {
  config: Record<string, unknown>
  path: string
  parseError: string | null
}

async function parseConfigFile(configPath: string): Promise<Record<string, unknown>> {
  const raw = await readFile(configPath, 'utf-8')
  const stripped = stripJsoncComments(raw)
  return JSON.parse(stripped)
}

export async function getOmoConfigPath(): Promise<string> {
  if (await fileExists(CONFIG_JSONC)) return CONFIG_JSONC
  if (await fileExists(CONFIG_JSON)) return CONFIG_JSON
  return CONFIG_JSON
}

export async function readOmoConfig(): Promise<OmoConfigReadResult> {
  const hasJsonc = await fileExists(CONFIG_JSONC)
  const hasJson = await fileExists(CONFIG_JSON)

  if (hasJsonc) {
    try {
      const config = await parseConfigFile(CONFIG_JSONC)
      return { config, path: CONFIG_JSONC, parseError: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const parseError = `Failed to parse ${CONFIG_JSONC}: ${message}`
      console.warn(`[omo-config] ${parseError}`)

      if (hasJson) {
        try {
          const config = await parseConfigFile(CONFIG_JSON)
          const fallbackNotice = `${parseError}. Falling back to ${CONFIG_JSON}.`
          console.warn(`[omo-config] ${fallbackNotice}`)
          return { config, path: CONFIG_JSON, parseError: fallbackNotice }
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          const combinedError = `${parseError}. Failed to parse ${CONFIG_JSON}: ${fallbackMessage}`
          console.warn(`[omo-config] ${combinedError}`)
          return { config: {}, path: CONFIG_JSONC, parseError: combinedError }
        }
      }

      return { config: {}, path: CONFIG_JSONC, parseError }
    }
  }

  if (hasJson) {
    try {
      const config = await parseConfigFile(CONFIG_JSON)
      return { config, path: CONFIG_JSON, parseError: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const parseError = `Failed to parse ${CONFIG_JSON}: ${message}`
      console.warn(`[omo-config] ${parseError}`)
      return { config: {}, path: CONFIG_JSON, parseError }
    }
  }

  return { config: {}, path: CONFIG_JSON, parseError: null }
}

export async function writeOmoConfig(config: Record<string, unknown>): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true })
  const json = JSON.stringify(config, null, 2) + '\n'
  await writeFile(CONFIG_JSON, json, 'utf-8')
}
