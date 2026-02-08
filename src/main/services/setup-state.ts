import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { homedir } from 'node:os'

export interface SetupState {
  setupCompleted: boolean
  completedAt: string | null
  opencodeInstalled: boolean
  omoInstalled: boolean
  autoStartWeb: boolean
  webStarted: boolean
  lastPort: number | null
}

const defaultState: SetupState = {
  setupCompleted: false,
  completedAt: null,
  opencodeInstalled: false,
  omoInstalled: false,
  autoStartWeb: true,
  webStarted: false,
  lastPort: null,
}

function getStateFilePath(): string {
  return path.join(homedir(), '.config', 'opencode-wrapper', 'setup-state.json')
}

export async function readSetupState(): Promise<SetupState> {
  try {
    const raw = await readFile(getStateFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<SetupState>
    return {
      ...defaultState,
      ...parsed,
    }
  } catch {
    return { ...defaultState }
  }
}

export async function writeSetupState(next: SetupState): Promise<void> {
  const filePath = getStateFilePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(next, null, 2), 'utf-8')
}

export async function recordSetupSuccess(input: {
  port: number | null
  autoStartWeb?: boolean
  webStarted?: boolean
}): Promise<SetupState> {
  const autoStartWeb = input.autoStartWeb ?? true
  const webStarted = input.webStarted ?? autoStartWeb
  const next: SetupState = {
    setupCompleted: true,
    completedAt: new Date().toISOString(),
    opencodeInstalled: true,
    omoInstalled: true,
    autoStartWeb,
    webStarted,
    lastPort: input.port,
  }
  await writeSetupState(next)
  return next
}
