import { execFile, exec, spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { getShellEnv } from './shell-env.js'
import { resolveHomebrewCommand } from './opencode-installer.js'
import type { OmoInstallOptions } from '../../shared/types.js'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)
const OMO_CONFIG_JSON = path.join(homedir(), '.config', 'opencode', 'oh-my-opencode.json')

type ProgressReporter = (chunk: string) => void

async function runCommandWithStreaming(
  command: string,
  args: string[],
  options: {
    env: NodeJS.ProcessEnv
    timeout: number
    onProgress?: ProgressReporter
  },
): Promise<{ output: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    const append = (chunk: Buffer) => {
      const text = chunk.toString()
      output += text
      options.onProgress?.(text)
    }

    child.stdout.on('data', append)
    child.stderr.on('data', append)

    const timeoutHandle = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Command timed out after ${options.timeout}ms: ${command} ${args.join(' ')}`))
    }, options.timeout)

    child.on('error', (err) => {
      clearTimeout(timeoutHandle)
      reject(err)
    })

    child.on('close', (code) => {
      clearTimeout(timeoutHandle)
      if (code === 0) {
        resolve({ output })
        return
      }
      reject(new Error(output || `${command} exited with code ${String(code)}`))
    })
  })
}

async function isCommandAvailable(command: string): Promise<boolean> {
  const env = await getShellEnv()
  try {
    await execFileAsync('which', [command], { env })
    return true
  } catch {
    return false
  }
}

async function canUseNpx(): Promise<boolean> {
  const env = await getShellEnv()
  try {
    await execAsync('npx --version', { timeout: 10_000, env })
    return true
  } catch {
    return false
  }
}

async function ensureBunViaBrew(onProgress?: ProgressReporter): Promise<{ success: boolean; output: string }> {
  const env = await getShellEnv()
  const brewCommand = await resolveHomebrewCommand()

  if (await isCommandAvailable('bun')) {
    return { success: true, output: 'bun is already installed.' }
  }

  if (!brewCommand) {
    return {
      success: false,
      output: 'npx is unavailable and Homebrew is not installed. Install Homebrew first, then retry so Bun can be installed via brew.',
    }
  }

  try {
    const { output } = await runCommandWithStreaming(
      brewCommand,
      ['install', 'bun'],
      {
        timeout: 180_000,
        env,
        onProgress,
      },
    )

    if (!(await isCommandAvailable('bun'))) {
      return {
        success: false,
        output: `${output}\nBun installation command finished, but bun is still unavailable in PATH.`,
      }
    }

    return { success: true, output }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, output: message }
  }
}

async function resolveOmoRunner(
  packageManager: 'npm' | 'bun' | 'auto',
  onProgress?: ProgressReporter,
): Promise<{ success: boolean; runner?: 'npm' | 'bun'; output?: string }> {
  if (packageManager === 'npm') {
    return { success: true, runner: 'npm' }
  }

  if (packageManager === 'bun') {
    const bunInstall = await ensureBunViaBrew(onProgress)
    if (!bunInstall.success) {
      return { success: false, output: bunInstall.output }
    }
    return { success: true, runner: 'bun', output: bunInstall.output }
  }

  if (await canUseNpx()) {
    return { success: true, runner: 'npm' }
  }

  const bunInstall = await ensureBunViaBrew(onProgress)
  if (!bunInstall.success) {
    return { success: false, output: bunInstall.output }
  }
  return { success: true, runner: 'bun', output: bunInstall.output }
}

export async function isOmoInstalled(): Promise<boolean> {
  try {
    await access(OMO_CONFIG_JSON)
    return true
  } catch {
    return false
  }
}

export async function installOmo(onProgress?: ProgressReporter): Promise<{ success: boolean; output: string }> {
  return await installOmoWithOptions(
    {
      claude: 'no',
      openai: 'no',
      gemini: 'no',
      copilot: 'no',
      opencodeZen: 'no',
      zaiCodingPlan: 'no',
    },
    'auto',
    onProgress,
  )
}

function buildOmoInstallArgs(options: OmoInstallOptions): string {
  const args: string[] = ['install', '--no-tui']
  args.push(`--claude=${options.claude}`)
  args.push(`--gemini=${options.gemini}`)
  args.push(`--copilot=${options.copilot}`)
  args.push(`--opencode-zen=${options.opencodeZen}`)
  args.push(`--zai-coding-plan=${options.zaiCodingPlan}`)
  return args.join(' ')
}

export async function installOmoWithOptions(
  options: OmoInstallOptions,
  packageManager: 'npm' | 'bun' | 'auto' = 'auto',
  onProgress?: ProgressReporter,
): Promise<{ success: boolean; output: string }> {
  try {
    const env = await getShellEnv()
    const runner = await resolveOmoRunner(packageManager, onProgress)
    if (!runner.success || !runner.runner) {
      return { success: false, output: runner.output ?? 'Failed to resolve package manager for Oh My OpenCode install.' }
    }

    const args = buildOmoInstallArgs(options)
    const cmd = runner.runner === 'bun' ? `bunx oh-my-opencode ${args}` : `npx -y oh-my-opencode ${args}`

    const { output } = await runCommandWithStreaming(
      'bash',
      ['-lc', cmd],
      {
        timeout: 180_000,
        env,
        onProgress,
      },
    )
    return { success: true, output: (runner.output ?? '') + output }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, output: message }
  }
}
