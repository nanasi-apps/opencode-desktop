import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { app } from 'electron'

export interface TunnelSettings {
  enabled: boolean
  mode: 'named' | 'quick'
  token: string | null
  hostname: string | null
  cloudflaredPath: string | null
  autoStartWithWeb: boolean
}

export interface WrapperSettings {
  launchAtLogin: boolean
  web: {
    port: number | null
    hostname: string
    mdns: boolean
    mdnsDomain: string | null
    cors: string[]
    username: string | null
    password: string | null
    extraArgs: string[]
  }
  tunnel: TunnelSettings
}

const DEFAULT_SETTINGS: WrapperSettings = {
  launchAtLogin: false,
  web: {
    port: null,
    hostname: '127.0.0.1',
    mdns: false,
    mdnsDomain: null,
    cors: [],
    username: null,
    password: null,
    extraArgs: [],
  },
  tunnel: {
    enabled: false,
    mode: 'named',
    token: null,
    hostname: null,
    cloudflaredPath: null,
    autoStartWithWeb: true,
  },
}

function getWrapperDir(): string {
  return path.join(homedir(), '.config', 'opencode-wrapper')
}

function getSettingsPath(): string {
  return path.join(getWrapperDir(), 'settings.json')
}

export function getWrapperSettingsPath(): string {
  return getSettingsPath()
}

export function applyLoginItemSettings(enabled: boolean): void {
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    return
  }

  app.setLoginItemSettings({ openAtLogin: enabled })
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function sanitizeSettings(input: Partial<WrapperSettings> | null | undefined): WrapperSettings {
  const launchAtLogin = input?.launchAtLogin === true
  const legacyPort = (input as { webStartup?: { preferredPort?: number } } | undefined)?.webStartup?.preferredPort
  const port = input?.web?.port ?? legacyPort
  const hostnameRaw = input?.web?.hostname
  const mdns = input?.web?.mdns === true
  const mdnsDomainRaw = input?.web?.mdnsDomain
  const cors = input?.web?.cors
  const usernameRaw = input?.web?.username
  const passwordRaw = input?.web?.password
  const legacyExtraArgs = (input as { webStartup?: { extraArgs?: string[] } } | undefined)?.webStartup?.extraArgs
  const extraArgs = input?.web?.extraArgs ?? legacyExtraArgs
  const isValidPort = Number.isInteger(port) && (port as number) >= 1 && (port as number) <= 65535
  const hostname = typeof hostnameRaw === 'string' && hostnameRaw.trim() ? hostnameRaw.trim() : '127.0.0.1'
  const mdnsDomain = typeof mdnsDomainRaw === 'string' && mdnsDomainRaw.trim() ? mdnsDomainRaw.trim() : null
  const username = typeof usernameRaw === 'string' && usernameRaw.trim() ? usernameRaw.trim() : null
  const password = typeof passwordRaw === 'string' && passwordRaw.trim() ? passwordRaw : null

  const tunnelEnabled = input?.tunnel?.enabled === true
  const tunnelMode = input?.tunnel?.mode === 'quick' ? 'quick' : 'named'
  const tunnelToken = typeof input?.tunnel?.token === 'string' && input.tunnel.token.trim() ? input.tunnel.token.trim() : null
  const tunnelHostname = typeof input?.tunnel?.hostname === 'string' && input.tunnel.hostname.trim() ? input.tunnel.hostname.trim() : null
  const tunnelCloudflaredPath = typeof input?.tunnel?.cloudflaredPath === 'string' && input.tunnel.cloudflaredPath.trim() ? input.tunnel.cloudflaredPath.trim() : null
  const tunnelAutoStart = true

  return {
    launchAtLogin,
    web: {
      port: isValidPort ? (port as number) : null,
      hostname,
      mdns,
      mdnsDomain,
      cors: Array.isArray(cors)
        ? cors.filter((origin): origin is string => typeof origin === 'string').map((origin) => origin.trim()).filter(Boolean)
        : [],
      username,
      password,
      extraArgs: Array.isArray(extraArgs)
        ? extraArgs.filter((arg): arg is string => typeof arg === 'string').map((arg) => arg.trim()).filter(Boolean)
        : [],
    },
    tunnel: {
      enabled: tunnelEnabled,
      mode: tunnelMode,
      token: tunnelToken,
      hostname: tunnelHostname,
      cloudflaredPath: tunnelCloudflaredPath,
      autoStartWithWeb: tunnelAutoStart,
    },
  }
}

export async function readWrapperSettings(): Promise<WrapperSettings> {
  const settingsPath = getSettingsPath()
  if (!(await fileExists(settingsPath))) {
    return {
      ...DEFAULT_SETTINGS,
      web: { ...DEFAULT_SETTINGS.web },
      tunnel: { ...DEFAULT_SETTINGS.tunnel },
    }
  }

  try {
    const raw = await readFile(settingsPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WrapperSettings>
    return sanitizeSettings(parsed)
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      web: { ...DEFAULT_SETTINGS.web },
      tunnel: { ...DEFAULT_SETTINGS.tunnel },
    }
  }
}

export async function writeWrapperSettings(input: Partial<WrapperSettings>): Promise<WrapperSettings> {
  const next = sanitizeSettings(input)
  await mkdir(getWrapperDir(), { recursive: true })
  await writeFile(getSettingsPath(), JSON.stringify(next, null, 2) + '\n', 'utf-8')
  return next
}
