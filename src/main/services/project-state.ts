import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export interface DurableProjectState {
  version: 1
  updatedAt: string
  entries: Record<string, string>
}

const CURRENT_VERSION = 1 as const

function getWrapperDir(): string {
  return path.join(homedir(), '.config', 'opencode-wrapper')
}

function getProjectStatePath(): string {
  return path.join(getWrapperDir(), 'project-state.json')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function sanitizeEntries(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') {
    return {}
  }

  const entries = Object.entries(input as Record<string, unknown>)
  const sanitized: Record<string, string> = {}

  for (const [key, value] of entries) {
    if (!key.trim()) continue
    if (typeof value !== 'string') continue
    sanitized[key] = value
  }

  return sanitized
}

export function getDurableProjectStatePath(): string {
  return getProjectStatePath()
}

export async function readDurableProjectState(): Promise<DurableProjectState> {
  const statePath = getProjectStatePath()
  if (!(await fileExists(statePath))) {
    return {
      version: CURRENT_VERSION,
      updatedAt: new Date(0).toISOString(),
      entries: {},
    }
  }

  try {
    const raw = await readFile(statePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<DurableProjectState>
    const updatedAtRaw = parsed.updatedAt
    const updatedAt = typeof updatedAtRaw === 'string' && updatedAtRaw.trim()
      ? updatedAtRaw
      : new Date(0).toISOString()

    return {
      version: CURRENT_VERSION,
      updatedAt,
      entries: sanitizeEntries(parsed.entries),
    }
  } catch {
    return {
      version: CURRENT_VERSION,
      updatedAt: new Date(0).toISOString(),
      entries: {},
    }
  }
}

export async function writeDurableProjectState(entries: Record<string, string>): Promise<DurableProjectState> {
  const next: DurableProjectState = {
    version: CURRENT_VERSION,
    updatedAt: new Date().toISOString(),
    entries: sanitizeEntries(entries),
  }

  await mkdir(getWrapperDir(), { recursive: true })
  await writeFile(getProjectStatePath(), JSON.stringify(next, null, 2) + '\n', 'utf-8')

  return next
}
