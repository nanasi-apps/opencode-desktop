import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getShellEnv } from './shell-env.js'
import { isHomebrewInstalled, resolveHomebrewCommand } from './opencode-installer.js'

const execFileAsync = promisify(execFile)

export interface ExternalTunnelInfo {
  isRunningExternally: boolean
  serviceName?: string
}

export async function isCloudflaredInstalled(): Promise<boolean> {
  try {
    const env = await getShellEnv()
    await execFileAsync('which', ['cloudflared'], { env })
    return true
  } catch {
    return false
  }
}

export async function getCloudflaredVersion(): Promise<string | null> {
  try {
    const env = await getShellEnv()
    const { stdout } = await execFileAsync('cloudflared', ['--version'], { env })
    const version = stdout.trim().split('\n')[0]
    return version || null
  } catch {
    return null
  }
}

export async function installCloudflaredViaBrew(): Promise<{ success: boolean; output: string }> {
  try {
    const env = await getShellEnv()
    const brewCommand = await resolveHomebrewCommand()
    if (!brewCommand) {
      return { success: false, output: 'Homebrew is not installed or not available in PATH.' }
    }
    const { stdout, stderr } = await execFileAsync(brewCommand, ['install', 'cloudflared'], { timeout: 180_000, env })
    const installed = await isCloudflaredInstalled()
    return { success: installed, output: stdout + stderr }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, output: message }
  }
}

export async function installCloudflared(): Promise<{ success: boolean; output: string }> {
  try {
    const hasBrew = await isHomebrewInstalled()
    if (!hasBrew) {
      return {
        success: false,
        output: 'Homebrew is required to install cloudflared. Please install Homebrew first.',
      }
    }
    return await installCloudflaredViaBrew()
  } catch {
    return {
      success: false,
      output: 'Homebrew is required to install cloudflared. Please install Homebrew first.',
    }
  }
}

export async function checkExternalCloudflaredService(): Promise<ExternalTunnelInfo> {
  try {
    const env = await getShellEnv()
    const { stdout } = await execFileAsync('launchctl', ['list'], { env })
    const lines = stdout.split('\n')
    for (const line of lines) {
      if (line.includes('cloudflared') && !line.includes('opencode')) {
        const parts = line.trim().split(/\s+/)
        const serviceName = parts[parts.length - 1]
        return {
          isRunningExternally: true,
          serviceName: serviceName
        }
      }
    }
    try {
      const { stdout: psOutput } = await execFileAsync('ps', ['aux'], { env })
      const psLines = psOutput.split('\n')
      for (const line of psLines) {
        if (line.includes('cloudflared') &&
            (line.includes('tunnel run') || line.includes('service')) &&
            !line.includes('opencode-desktop')) {
          return {
            isRunningExternally: true,
            serviceName: 'cloudflared'
          }
        }
      }
    } catch {}
    return { isRunningExternally: false }
  } catch {
    return { isRunningExternally: false }
  }
}
