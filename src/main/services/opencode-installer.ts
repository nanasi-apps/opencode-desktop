import { execFile, exec, spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { promisify } from 'node:util'
import { getShellEnv } from './shell-env.js'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

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

export async function isOpencodeInstalled(): Promise<boolean> {
  try {
    const env = await getShellEnv()
    await execFileAsync('which', ['opencode'], { env })
    return true
  } catch {
    return false
  }
}

export async function isHomebrewInstalled(): Promise<boolean> {
  return (await resolveHomebrewCommand()) !== null
}

export async function resolveHomebrewCommand(): Promise<string | null> {
  const env = await getShellEnv()
  const checkVersion = async (command: string): Promise<string> => {
    await execFileAsync(command, ['--version'], { timeout: 10_000, env })
    return command
  }

  try {
    return await checkVersion('brew')
  } catch {
    const brewPaths = [
      '/opt/homebrew/bin/brew',
      '/usr/local/bin/brew',
      `${env.HOME ?? homedir()}/.linuxbrew/bin/brew`,
      '/home/linuxbrew/.linuxbrew/bin/brew',
    ].filter(Boolean)

    for (const brewPath of brewPaths) {
      try {
        return await checkVersion(brewPath)
      } catch {
        // continue
      }
    }
    return null
  }
}

export async function installHomebrew(onProgress?: ProgressReporter): Promise<{ success: boolean; output: string }> {
  if (process.platform !== 'darwin') {
    return { success: false, output: 'Homebrew .pkg installation is only supported on macOS.' }
  }

  const env = await getShellEnv()
  const pkgPath = '/tmp/homebrew-installer.pkg'

  const ensureCommandLineTools = async (): Promise<{ ok: boolean; output?: string }> => {
    try {
      await execFileAsync('xcode-select', ['-p'], { timeout: 10_000, env })
      return { ok: true }
    } catch {
      try {
        await execFileAsync('xcode-select', ['--install'], { timeout: 10_000, env })
      } catch (installErr) {
        const msg = installErr instanceof Error ? installErr.message : String(installErr)
        if (!msg.includes('already requested')) {
          return {
            ok: false,
            output: `Command Line Tools are required. Run \`xcode-select --install\` in Terminal, complete installation, then retry.\n${msg}`,
          }
        }
      }

      return {
        ok: false,
        output: 'Command Line Tools are required for Homebrew. The CLT installer has been requested. Complete installation, then retry Auto Install.',
      }
    }
  }

  const resolvePkgUrl = async (): Promise<string> => {
    const { stdout } = await execAsync('curl -fsSL https://api.github.com/repos/Homebrew/brew/releases/latest', {
      timeout: 60_000,
      env,
    })
    const matches = [...stdout.matchAll(/"browser_download_url"\s*:\s*"([^"]+\.pkg)"/g)].map((m) => m[1])
    const preferred = matches.find((url) => url.endsWith('/Homebrew.pkg'))
    const pkgUrl = preferred ?? matches[0]
    if (!pkgUrl) {
      throw new Error('Could not find Homebrew .pkg asset in latest release.')
    }
    return pkgUrl
  }

  const installPkgWithPrivileges = async () => {
    const escapedPkgPath = pkgPath.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
    const installerCmd = `installer -pkg \"${escapedPkgPath}\" -target /`
      .replaceAll('\\', '\\\\')
      .replaceAll('"', '\\"')
    return await runCommandWithStreaming('osascript', [
      '-e',
      `do shell script "${installerCmd}" with administrator privileges`,
    ], {
      timeout: 300_000,
      env,
      onProgress,
    })
  }

  try {
    const clt = await ensureCommandLineTools()
    if (!clt.ok) {
      return { success: false, output: clt.output ?? 'Command Line Tools are required for Homebrew.' }
    }

    const pkgUrl = await resolvePkgUrl()
    const { output: downloadOutput } = await runCommandWithStreaming(
      'curl',
      ['--progress-bar', '-fL', pkgUrl, '-o', pkgPath],
      {
        timeout: 180_000,
        env,
        onProgress,
      },
    )
    const { output: installOutput } = await installPkgWithPrivileges()
    const installed = await isHomebrewInstalled()
    await execAsync(`rm -f "${pkgPath}"`, { timeout: 10_000, env }).catch(() => undefined)
    return { success: installed, output: downloadOutput + installOutput }
  } catch (error) {
    await execAsync(`rm -f "${pkgPath}"`, { timeout: 10_000, env }).catch(() => undefined)
    const message = error instanceof Error ? error.message : String(error)
    const installed = await isHomebrewInstalled()
    if (installed) {
      return { success: true, output: `${message}\n\nHomebrew appears to be installed successfully despite the installer returning an error.` }
    }
    return { success: false, output: message }
  }
}

export async function installOpencodeViaBrew(onProgress?: ProgressReporter): Promise<{ success: boolean; output: string }> {
  try {
    const env = await getShellEnv()
    const brewCommand = await resolveHomebrewCommand()
    if (!brewCommand) {
      return { success: false, output: 'Homebrew is not installed or not available in PATH.' }
    }
    const { output } = await runCommandWithStreaming(
      brewCommand,
      ['install', 'opencode'],
      {
        timeout: 180_000,
        env,
        onProgress,
      },
    )
    try {
      const { stdout, stderr } = await execFileAsync('opencode', ['--version'], { timeout: 10_000, env })
      const versionOutput = [stdout, stderr].filter(Boolean).join('').trim()
      const suffix = versionOutput ? `\n\nopencode --version\n${versionOutput}` : '\n\nopencode --version completed.'
      return { success: true, output: `${output}${suffix}` }
    } catch (versionError) {
      const versionMessage = versionError instanceof Error ? versionError.message : String(versionError)
      return {
        success: false,
        output: `${output}\n\nOpenCode was installed, but opencode --version failed:\n${versionMessage}`,
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const installed = await isOpencodeInstalled()
    if (installed) {
      return { success: true, output: `${message}\n\nOpenCode appears to be installed successfully despite brew returning an error.` }
    }
    return { success: false, output: message }
  }
}

export async function installOpencodeViaScript(onProgress?: ProgressReporter): Promise<{ success: boolean; output: string }> {
  try {
    const env = await getShellEnv()
    const { output } = await runCommandWithStreaming(
      'bash',
      ['-lc', 'curl -fsSL https://opencode.ai/install | bash'],
      {
        timeout: 120_000,
        env,
        onProgress,
      },
    )
    const installed = await isOpencodeInstalled()
    return { success: installed, output }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const installed = await isOpencodeInstalled()
    if (installed) {
      return { success: true, output: `${message}\n\nOpenCode appears to be installed successfully despite the installer returning an error.` }
    }
    return { success: false, output: message }
  }
}

export async function installOpencode(onProgress?: ProgressReporter): Promise<{ success: boolean; output: string }> {
  const hasBrew = await isHomebrewInstalled()
  if (hasBrew) {
    return await installOpencodeViaBrew(onProgress)
  }
  return await installOpencodeViaScript(onProgress)
}

function parseFirstSemver(raw: string): string | null {
  const match = raw.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)
  return match ? match[0] : null
}

async function getInstalledOpencodeVersion(): Promise<string | null> {
  try {
    const env = await getShellEnv()
    const { stdout, stderr } = await execFileAsync('opencode', ['--version'], { timeout: 10_000, env })
    const output = `${stdout}\n${stderr}`
    return parseFirstSemver(output)
  } catch {
    return null
  }
}

function compareLooseSemver(current: string, latest: string): number {
  const toParts = (value: string) => value.split('.')[0] ? value.split(/[.-]/).map((x) => Number.parseInt(x, 10)).map((n) => (Number.isFinite(n) ? n : 0)) : [0]
  const a = toParts(current)
  const b = toParts(latest)
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i += 1) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av > bv) return 1
    if (av < bv) return -1
  }
  return 0
}

export interface OpencodeUpdateStatus {
  supported: boolean
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  updateAvailable: boolean
  message: string | null
}

export async function checkOpencodeUpdatesViaBrew(): Promise<OpencodeUpdateStatus> {
  const brewCommand = await resolveHomebrewCommand()
  if (!brewCommand) {
    return {
      supported: false,
      installed: await isOpencodeInstalled(),
      currentVersion: await getInstalledOpencodeVersion(),
      latestVersion: null,
      updateAvailable: false,
      message: 'Homebrew is not available.',
    }
  }

  const env = await getShellEnv()
  let installed = false
  let currentVersion: string | null = null

  try {
    const { stdout } = await execFileAsync(brewCommand, ['list', '--versions', 'opencode'], { timeout: 15_000, env })
    const text = stdout.trim()
    if (text) {
      installed = true
      const parts = text.split(/\s+/)
      const candidate = parts[parts.length - 1]
      currentVersion = parseFirstSemver(candidate) ?? candidate
    }
  } catch {
    installed = false
    currentVersion = await getInstalledOpencodeVersion()
  }

  let latestVersion: string | null = null
  let message: string | null = null

  try {
    const { stdout } = await execFileAsync(brewCommand, ['info', '--json=v2', 'opencode'], { timeout: 20_000, env })
    const payload = JSON.parse(stdout) as {
      formulae?: Array<{
        versions?: { stable?: string }
        installed?: Array<{ version?: string }>
      }>
    }
    const formula = payload.formulae?.[0]
    const latestVersionRaw = formula?.versions?.stable
    latestVersion = typeof latestVersionRaw === 'string' ? parseFirstSemver(latestVersionRaw) ?? latestVersionRaw : null
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }

  let updateAvailable = false
  if (installed) {
    try {
      const { stdout } = await execFileAsync(brewCommand, ['outdated', '--json=v2', 'opencode'], { timeout: 20_000, env })
      const payload = JSON.parse(stdout) as { formulae?: Array<{ name?: string }> }
      updateAvailable = Array.isArray(payload.formulae) && payload.formulae.some((item) => item.name === 'opencode')
    } catch {
      if (currentVersion && latestVersion) {
        updateAvailable = compareLooseSemver(currentVersion, latestVersion) < 0
      }
    }
  }

  return {
    supported: true,
    installed,
    currentVersion,
    latestVersion,
    updateAvailable,
    message,
  }
}

export async function upgradeOpencodeViaBrew(onProgress?: ProgressReporter): Promise<{ success: boolean; output: string }> {
  const brewCommand = await resolveHomebrewCommand()
  if (!brewCommand) {
    return { success: false, output: 'Homebrew is not available in PATH.' }
  }

  const env = await getShellEnv()

  try {
    const updateResult = await runCommandWithStreaming(
      brewCommand,
      ['update'],
      { env, timeout: 180_000, onProgress },
    )
    const upgradeResult = await runCommandWithStreaming(
      brewCommand,
      ['upgrade', 'opencode'],
      { env, timeout: 300_000, onProgress },
    )
    const version = await getInstalledOpencodeVersion()
    const suffix = version ? `\n\nopencode version: ${version}` : ''
    return { success: true, output: `${updateResult.output}\n${upgradeResult.output}${suffix}` }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, output: message }
  }
}
