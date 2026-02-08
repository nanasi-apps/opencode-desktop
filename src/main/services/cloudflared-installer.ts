import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getShellEnv } from './shell-env.js'
import { isHomebrewInstalled, resolveHomebrewCommand } from './opencode-installer.js'

const execFileAsync = promisify(execFile)

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
