import { spawn, type ChildProcess } from 'node:child_process'
import type { TunnelSettings } from './wrapper-settings.js'
import type { TunnelStatus } from '../../shared/types.js'

let childProcess: ChildProcess | null = null
let currentStatus: TunnelStatus = 'stopped'
let publicUrl: string | null = null
let lastError: string | null = null
let crashCallback: (() => void) | null = null

const QUICK_TUNNEL_URL_REGEX = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAYS = [2000, 5000, 10000]

export function getStatus(): TunnelStatus {
  return currentStatus
}

export function getPublicUrl(): string | null {
  return publicUrl
}

export function getLastError(): string | null {
  return lastError
}

export function getPid(): number | null {
  return childProcess?.pid ?? null
}

export function onTunnelCrash(cb: () => void): void {
  crashCallback = cb
}

function resolveCloudflaredPath(settings: TunnelSettings): string {
  if (settings.cloudflaredPath) {
    return settings.cloudflaredPath
  }
  return 'cloudflared'
}

function getTokenFromEnvOrSettings(settings: TunnelSettings): string | null {
  const envToken = process.env.CLOUDFLARE_TUNNEL_TOKEN
  if (envToken) {
    return envToken
  }
  return settings.token
}

async function tryStartTunnel(
  settings: TunnelSettings,
  localPort: number,
  attempt: number
): Promise<{ publicUrl: string }> {
  const cloudflaredPath = resolveCloudflaredPath(settings)
  const token = getTokenFromEnvOrSettings(settings)

  if (settings.mode === 'named' && !token) {
    throw new Error(
      'Cloudflare Tunnel token is required for named tunnel. Set CLOUDFLARE_TUNNEL_TOKEN environment variable or configure token in settings.'
    )
  }

  return new Promise((resolve, reject) => {
    currentStatus = 'starting'
    lastError = null
    let settled = false
    let stdoutBuffer = ''

    const args: string[] = []

    if (settings.mode === 'quick') {
      args.push('tunnel', '--url', `http://127.0.0.1:${localPort}`)
    } else {
      args.push('tunnel', 'run')
      if (token) {
        args.push('--token', token)
      }
    }

    childProcess = spawn(cloudflaredPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      stopTunnel()
      reject(new Error('Timed out waiting for Cloudflare Tunnel to start'))
    }, 30000)

    function handleOutput(data: Buffer) {
      const text = data.toString()
      stdoutBuffer += text

      if (settings.mode === 'quick') {
        const match = QUICK_TUNNEL_URL_REGEX.exec(stdoutBuffer)
        if (match && !publicUrl) {
          publicUrl = match[0]
          settled = true
          currentStatus = 'running'
          clearTimeout(timeout)
          resolve({ publicUrl })
        }
      } else {
        if (/Connected/i.test(text) || /registered conn/i.test(text)) {
          publicUrl = settings.hostname
            ? `https://${settings.hostname}`
            : 'https://<configured-hostname>'
          settled = true
          currentStatus = 'running'
          clearTimeout(timeout)
          resolve({ publicUrl })
        }
      }

      if (/error|failed|cannot|unable/i.test(text)) {
        console.log(`[cloudflared] ${text.trim()}`)
      }
    }

    childProcess.stdout?.on('data', handleOutput)
    childProcess.stderr?.on('data', handleOutput)

    childProcess.on('error', (err) => {
      if (settled) return
      settled = true
      currentStatus = 'error'
      lastError = err.message
      clearTimeout(timeout)
      reject(err)
    })

    childProcess.on('close', (code) => {
      const wasRunning = currentStatus === 'running'
      currentStatus = 'stopped'
      childProcess = null

      if (!settled) {
        settled = true
        clearTimeout(timeout)
        const errorMsg =
          code !== null
            ? `cloudflared exited with code ${code}`
            : 'cloudflared exited unexpectedly'
        lastError = errorMsg
        reject(new Error(errorMsg))
      }

      if (wasRunning && crashCallback) {
        crashCallback()
      }
    })
  })
}

export async function startTunnel(
  settings: TunnelSettings,
  localPort: number
): Promise<{ publicUrl: string }> {
  if (childProcess && currentStatus === 'running') {
    if (publicUrl) return { publicUrl }
    throw new Error('Tunnel is starting but URL not yet available')
  }

  let lastError: Error | undefined

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await tryStartTunnel(settings, localPort, attempt)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const delay = RETRY_DELAYS[attempt] ?? 10000
        console.log(`[tunnel] Retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS - 1} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError ?? new Error('Failed to start tunnel after multiple attempts')
}

export function stopTunnel(): void {
  crashCallback = null
  if (childProcess) {
    childProcess.kill('SIGTERM')
    childProcess = null
    currentStatus = 'stopped'
    publicUrl = null
    lastError = null
  }
}

export function shouldAutoStart(settings: TunnelSettings): boolean {
  return settings.enabled
}

export function checkSecurityWarning(settings: TunnelSettings, webPassword: string | null): string | null {
  if (!settings.enabled) return null
  if (!webPassword) {
    return 'Warning: Tunnel is enabled but no web password is set. Your OpenCode instance will be publicly accessible without authentication.'
  }
  return null
}
