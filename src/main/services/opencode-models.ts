import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getShellEnv } from './shell-env.js'

const execFileAsync = promisify(execFile)

function parseModelLines(output: string): string[] {
  const seen = new Set<string>()
  const models: string[] = []

  for (const line of output.split('\n')) {
    const model = line.trim()
    if (!model || seen.has(model)) continue
    seen.add(model)
    models.push(model)
  }

  return models
}

export async function listOpencodeModels(): Promise<string[]> {
  const env = await getShellEnv()

  try {
    const { stdout } = await execFileAsync('opencode', ['models'], {
      env,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    })
    return parseModelLines(stdout)
  } catch {
    return []
  }
}
