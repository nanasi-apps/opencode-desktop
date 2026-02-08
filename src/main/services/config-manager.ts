import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const CONFIG_DIR = path.join(homedir(), '.config', 'opencode')
const CONFIG_JSONC = path.join(CONFIG_DIR, 'opencode.jsonc')
const CONFIG_JSON = path.join(CONFIG_DIR, 'opencode.json')

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

export async function getConfigPath(): Promise<string> {
  if (await fileExists(CONFIG_JSONC)) return CONFIG_JSONC
  if (await fileExists(CONFIG_JSON)) return CONFIG_JSON
  return CONFIG_JSON
}

export async function readConfig(): Promise<Record<string, unknown>> {
  const configPath = await getConfigPath()

  try {
    const raw = await readFile(configPath, 'utf-8')
    const stripped = stripJsoncComments(raw)
    return JSON.parse(stripped)
  } catch {
    return {}
  }
}

export async function writeConfig(config: Record<string, unknown>): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true })
  const json = JSON.stringify(config, null, 2) + '\n'
  await writeFile(CONFIG_JSON, json, 'utf-8')
}
