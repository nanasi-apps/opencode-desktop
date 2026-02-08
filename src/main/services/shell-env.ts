import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { homedir } from 'node:os'

const execAsync = promisify(exec)

let cachedEnv: NodeJS.ProcessEnv | null = null

/**
 * Get a shell-like environment from a login shell.
 * Electron apps launched from Dock/Finder don't inherit shell startup env vars
 * (PATH, XDG_CONFIG_HOME, custom OPENCODE_* vars, etc.), so we resolve all env
 * vars from the user's login shell.
 */
export async function getShellEnv(): Promise<NodeJS.ProcessEnv> {
  if (cachedEnv) return cachedEnv

  try {
    const { stdout } = await execAsync('/bin/zsh -ilc "env"', {
      timeout: 5_000,
      env: { HOME: homedir() },
    })

    const env: NodeJS.ProcessEnv = { ...process.env }
    for (const line of stdout.split('\n')) {
      const idx = line.indexOf('=')
      if (idx > 0) {
        const key = line.slice(0, idx)
        const value = line.slice(idx + 1)
        env[key] = value
      }
    }

    cachedEnv = env
    return env
  } catch {
    
    const commonPaths = [
      `${homedir()}/.local/bin`,
      `${homedir()}/go/bin`,
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
    ]
    cachedEnv = {
      ...process.env,
      PATH: [...commonPaths, process.env.PATH].filter(Boolean).join(':'),
    }
    return cachedEnv
  }
}
