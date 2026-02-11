import { Notification, shell } from 'electron'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { checkDesktopUpdate } from './update-check.js'
import { resolveDesktopVersion } from './desktop-version.js'
import { checkOpencodeUpdatesViaBrew } from './opencode-installer.js'

interface UpdateNotificationState {
  version: 1
  updatedAt: string
  desktopLatestNotified: string | null
  opencodeLatestNotified: string | null
}

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const INITIAL_DELAY_MS = 30_000
const CURRENT_STATE_VERSION = 1 as const

let intervalTimer: NodeJS.Timeout | null = null
let inProgress = false

function getWrapperDir(): string {
  return path.join(homedir(), '.config', 'opencode-wrapper')
}

function getStatePath(): string {
  return path.join(getWrapperDir(), 'update-notifier-state.json')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function normalizeState(raw: Partial<UpdateNotificationState> | null | undefined): UpdateNotificationState {
  const desktopLatestNotified = typeof raw?.desktopLatestNotified === 'string' && raw.desktopLatestNotified.trim()
    ? raw.desktopLatestNotified.trim()
    : null
  const opencodeLatestNotified = typeof raw?.opencodeLatestNotified === 'string' && raw.opencodeLatestNotified.trim()
    ? raw.opencodeLatestNotified.trim()
    : null

  return {
    version: CURRENT_STATE_VERSION,
    updatedAt: typeof raw?.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt : new Date(0).toISOString(),
    desktopLatestNotified,
    opencodeLatestNotified,
  }
}

async function readState(): Promise<UpdateNotificationState> {
  const statePath = getStatePath()
  if (!(await fileExists(statePath))) {
    return normalizeState(null)
  }

  try {
    const raw = await readFile(statePath, 'utf-8')
    return normalizeState(JSON.parse(raw) as Partial<UpdateNotificationState>)
  } catch {
    return normalizeState(null)
  }
}

async function writeState(state: UpdateNotificationState): Promise<void> {
  await mkdir(getWrapperDir(), { recursive: true })
  const next: UpdateNotificationState = {
    ...state,
    updatedAt: new Date().toISOString(),
    version: CURRENT_STATE_VERSION,
  }
  await writeFile(getStatePath(), JSON.stringify(next, null, 2) + '\n', 'utf-8')
}

function showNotification(title: string, body: string, onClick?: () => void): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title,
    body,
    silent: false,
  })
  if (onClick) {
    notification.on('click', onClick)
  }
  notification.show()
}

async function notifyDesktopIfNeeded(state: UpdateNotificationState): Promise<boolean> {
  const version = await resolveDesktopVersion()
  const result = await checkDesktopUpdate(version)
  if (!result.updateAvailable || !result.latestVersion) {
    return false
  }
  if (state.desktopLatestNotified === result.latestVersion) {
    return false
  }

  showNotification(
    'OpenCode Desktop',
    `A new desktop update is available (v${result.latestVersion}).`,
    () => {
      void shell.openExternal(result.releaseUrl)
    },
  )
  state.desktopLatestNotified = result.latestVersion
  return true
}

async function notifyOpencodeIfNeeded(state: UpdateNotificationState): Promise<boolean> {
  const result = await checkOpencodeUpdatesViaBrew()
  if (!result.updateAvailable || !result.latestVersion) {
    return false
  }
  if (state.opencodeLatestNotified === result.latestVersion) {
    return false
  }

  const body = result.currentVersion
    ? `A new OpenCode update is available (v${result.currentVersion} -> v${result.latestVersion}).`
    : `A new OpenCode update is available (latest: v${result.latestVersion}).`

  showNotification('OpenCode', body)
  state.opencodeLatestNotified = result.latestVersion
  return true
}

async function checkAndNotifyOnce(): Promise<void> {
  if (inProgress) return
  inProgress = true

  try {
    const state = await readState()
    const desktopNotified = await notifyDesktopIfNeeded(state).catch(() => false)
    const opencodeNotified = await notifyOpencodeIfNeeded(state).catch(() => false)
    if (desktopNotified || opencodeNotified) {
      await writeState(state)
    }
  } finally {
    inProgress = false
  }
}

export function startUpdateNotifier(): void {
  if (intervalTimer) return
  setTimeout(() => {
    void checkAndNotifyOnce()
  }, INITIAL_DELAY_MS)
  intervalTimer = setInterval(() => {
    void checkAndNotifyOnce()
  }, CHECK_INTERVAL_MS)
}
