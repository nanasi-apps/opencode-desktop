import { spawn, type ChildProcess } from 'node:child_process'
import { createConnection, createServer } from 'node:net'
import { chmod, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { ProcessStatus } from '../../shared/types.js'
import { getShellEnv } from './shell-env.js'
import { readWrapperSettings } from './wrapper-settings.js'
import {
  startTunnel as startTunnelService,
  stopTunnel as stopTunnelService,
  shouldAutoStart,
  checkSecurityWarning,
} from './cloudflare-tunnel-process.js'

let childProcess: ChildProcess | null = null
let detectedPort: number | null = null
let currentStatus: ProcessStatus = 'stopped'
let crashCallback: (() => void) | null = null
let openShimDir: string | null = null

const PORT_REGEX = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/
const FIXED_PORT = 4096

async function isPortAvailable(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '127.0.0.1')
  })
}

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

async function ensureOpenShimDir(): Promise<string> {
  if (openShimDir) return openShimDir
  const dir = await mkdtemp(path.join(tmpdir(), 'opencode-wrapper-'))
  const shimPath = path.join(dir, 'open')
  await writeFile(shimPath, '#!/bin/sh\nexit 0\n', 'utf-8')
  await chmod(shimPath, 0o755)
  openShimDir = dir
  return dir
}

export function getStatus(): ProcessStatus {
  return currentStatus
}

export function getPort(): number | null {
  return detectedPort
}

export function getPid(): number | null {
  return childProcess?.pid ?? null
}

export function onProcessCrash(cb: () => void): void {
  crashCallback = cb
}

export async function startOpencodeWeb(): Promise<{ port: number }> {
  if (currentStatus === 'running' && detectedPort) {
    return { port: detectedPort }
  }

  if (childProcess && currentStatus === 'running') {
    if (detectedPort) return { port: detectedPort }
    throw new Error('Process is running but port not yet detected')
  }

  const env = await getShellEnv()
  const wrapperSettings = await readWrapperSettings()
  const requestedPort = FIXED_PORT
  const existingServerIsReachable = await canConnectToLocalPort(FIXED_PORT)
  if (existingServerIsReachable) {
    detectedPort = FIXED_PORT
    currentStatus = 'running'
    return { port: FIXED_PORT }
  }
  const isFixedPortAvailable = await isPortAvailable(FIXED_PORT)
  if (!isFixedPortAvailable) {
    throw new Error('4096ポートが占有されており、既存のOpenCode Webにも接続できません')
  }
  const shimDir = await ensureOpenShimDir()
  const spawnEnv = {
    ...env,
    BROWSER: 'none',
    ...(wrapperSettings.web.username ? { OPENCODE_SERVER_USERNAME: wrapperSettings.web.username } : {}),
    ...(wrapperSettings.web.password ? { OPENCODE_SERVER_PASSWORD: wrapperSettings.web.password } : {}),
    PATH: [shimDir, env.PATH].filter(Boolean).join(':'),
  }

  return new Promise((resolve, reject) => {
    currentStatus = 'starting'
    detectedPort = null
    let settled = false

    const args = ['web', '--port', String(requestedPort)]

    if (wrapperSettings.web.hostname) {
      args.push('--hostname', wrapperSettings.web.hostname)
    }

    if (wrapperSettings.web.mdns || wrapperSettings.web.mdnsDomain) {
      args.push('--mdns')
    }

    if (wrapperSettings.web.mdnsDomain) {
      args.push('--mdns-domain', wrapperSettings.web.mdnsDomain)
    }

    for (const origin of wrapperSettings.web.cors) {
      args.push('--cors', origin)
    }

    args.push(...wrapperSettings.web.extraArgs)
    childProcess = spawn('opencode', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: spawnEnv,
    })

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      currentStatus = 'error'
      reject(new Error('Timed out waiting for opencode web to start'))
    }, 30_000)

    async function resolveWhenReady(port: number): Promise<void> {
      if (settled) return
      const ready = await waitForLocalPort(port, 5_000)
      if (!ready || settled) return
      settled = true
      detectedPort = port
      currentStatus = 'running'
      clearTimeout(timeout)

      const wrapperSettings = await readWrapperSettings()
      if (shouldAutoStart(wrapperSettings.tunnel)) {
        const securityWarning = checkSecurityWarning(wrapperSettings.tunnel, wrapperSettings.web.password)
        if (securityWarning) {
          console.log(`[tunnel] ${securityWarning}`)
        }
        void startTunnelService(wrapperSettings.tunnel, port).catch((err) => {
          console.log(`[tunnel] Failed to auto-start: ${err instanceof Error ? err.message : String(err)}`)
        })
      }

      resolve({ port })
    }

    function handleOutput(data: Buffer) {
      const text = data.toString()
      const match = PORT_REGEX.exec(text)
      if (match && !detectedPort) {
        const parsedPort = parseInt(match[1], 10)
        void resolveWhenReady(parsedPort)
      } else if (!match && !detectedPort && /listening|ready|server/i.test(text)) {
        void resolveWhenReady(requestedPort)
      }
    }

    childProcess.stdout?.on('data', handleOutput)
    childProcess.stderr?.on('data', handleOutput)

    childProcess.on('error', (err) => {
      if (settled) return
      settled = true
      currentStatus = 'error'
      clearTimeout(timeout)
      reject(err)
    })

    childProcess.on('close', (code) => {
      const wasRunning = currentStatus === 'running'
      currentStatus = 'stopped'
      childProcess = null
      detectedPort = null
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new Error(`opencode web exited before startup completed${code !== null ? ` (code ${code})` : ''}`))
      }
      if (wasRunning && crashCallback) {
        crashCallback()
      }
    })
  })
}

export function stopOpencodeWeb(): void {
  crashCallback = null
  if (childProcess) {
    childProcess.kill('SIGTERM')
    childProcess = null
    detectedPort = null
    currentStatus = 'stopped'
  }
  stopTunnelService()
}
