import { createConnection } from 'node:net'
import type { ProcessStatus } from '../../shared/types.js'
import { readWrapperSettings } from './wrapper-settings.js'
import {
  startTunnel as startTunnelService,
  stopTunnel as stopTunnelService,
  shouldAutoStart,
  checkSecurityWarning,
} from './cloudflare-tunnel-process.js'
import {
  ensureServiceRunning,
  getServiceStatus,
  getServicePort,
  stopService,
  type LaunchdServiceStatus,
} from './launchd-service.js'

let currentStatus: ProcessStatus = 'stopped'
let detectedPort: number | null = null

async function canConnectToLocalPort(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })

    const done = (ok: boolean) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(ok)
    }

    socket.setTimeout(500)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function waitForLocalPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await canConnectToLocalPort(port)) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return false
}

export function getStatus(): ProcessStatus {
  return currentStatus
}

export function getPort(): number | null {
  return detectedPort
}

export function getPid(): number | null {
  return null
}

export function onProcessCrash(_cb: () => void): void {
}

export async function startOpencodeWeb(): Promise<{ port: number }> {
  if (currentStatus === 'running' && detectedPort) {
    return { port: detectedPort }
  }

  const settings = await readWrapperSettings()
  const port = getServicePort(settings)

  const existingServerIsReachable = await canConnectToLocalPort(port)
  if (existingServerIsReachable) {
    detectedPort = port
    currentStatus = 'running'
    await maybeStartTunnel(port)
    return { port }
  }

  currentStatus = 'starting'
  detectedPort = null

  try {
    await ensureServiceRunning(settings)

    const ready = await waitForLocalPort(port, 30_000)
    if (!ready) {
      currentStatus = 'error'
      throw new Error('Timed out waiting for opencode web to start')
    }

    detectedPort = port
    currentStatus = 'running'
    await maybeStartTunnel(port)
    return { port }
  } catch (err) {
    currentStatus = 'error'
    throw err
  }
}

async function maybeStartTunnel(port: number): Promise<void> {
  const settings = await readWrapperSettings()
  if (shouldAutoStart(settings.tunnel)) {
    const securityWarning = checkSecurityWarning(settings.tunnel, settings.web.password)
    if (securityWarning) {
      console.log(`[tunnel] ${securityWarning}`)
    }
    void startTunnelService(settings.tunnel, port).catch((err) => {
      console.log(`[tunnel] Failed to auto-start: ${err instanceof Error ? err.message : String(err)}`)
    })
  }
}

export async function stopOpencodeWeb(): Promise<void> {
  stopTunnelService()
  await stopService()
  detectedPort = null
  currentStatus = 'stopped'
}

export async function restartOpencodeWeb(): Promise<{ port: number }> {
  await stopOpencodeWeb()
  return await startOpencodeWeb()
}

export async function getLaunchdStatus(): Promise<LaunchdServiceStatus> {
  return await getServiceStatus()
}

export async function refreshStatus(): Promise<ProcessStatus> {
  const settings = await readWrapperSettings()
  const port = getServicePort(settings)

  const launchdStatus = await getServiceStatus()
  if (launchdStatus !== 'running') {
    currentStatus = 'stopped'
    detectedPort = null
    return currentStatus
  }

  const reachable = await canConnectToLocalPort(port)
  if (reachable) {
    currentStatus = 'running'
    detectedPort = port
  } else {
    currentStatus = 'starting'
    detectedPort = null
  }

  return currentStatus
}
