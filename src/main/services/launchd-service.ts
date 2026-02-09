import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile, access } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import type { WrapperSettings } from './wrapper-settings.js'
import { getShellEnv } from './shell-env.js'

const execFileAsync = promisify(execFile)

const LABEL = 'com.opencode.web'
const HOME_DIR = homedir()
const LAUNCH_AGENTS_DIR = path.join(HOME_DIR, 'Library', 'LaunchAgents')
const LOG_DIR = path.join(HOME_DIR, 'Library', 'Logs', 'opencode-web')
const PLIST_PATH = path.join(LAUNCH_AGENTS_DIR, `${LABEL}.plist`)
const FIXED_PORT = 4096

function getUid(): number {
  const uid = process.getuid?.()
  if (uid === undefined) {
    throw new Error('This feature requires macOS with a user session.')
  }
  return uid
}

function launchctlDomainTarget(): string {
  return `gui/${getUid()}/${LABEL}`
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function plistArray(values: string[]): string {
  const entries = values.map((value) => `    <string>${xmlEscape(value)}</string>`)
  return ['  <array>', ...entries, '  </array>'].join('\n')
}

async function resolveOpencodePath(): Promise<string> {
  if (process.env.OPENCODE_BIN) return process.env.OPENCODE_BIN

  try {
    const { stdout } = await execFileAsync('which', ['opencode'])
    const resolved = stdout.trim()
    if (!resolved) {
      throw new Error('Cannot find opencode binary. Add it to PATH or set OPENCODE_BIN.')
    }
    return resolved
  } catch {
    throw new Error('Cannot find opencode binary. Add it to PATH or set OPENCODE_BIN.')
  }
}

function buildProgramArgs(opencodePath: string, settings: WrapperSettings): string[] {
  const port = settings.web.port ?? FIXED_PORT
  const args = [opencodePath, 'web', '--port', String(port)]

  if (settings.web.hostname) {
    args.push('--hostname', settings.web.hostname)
  }
  if (settings.web.mdns || settings.web.mdnsDomain) {
    args.push('--mdns')
  }
  if (settings.web.mdnsDomain) {
    args.push('--mdns-domain', settings.web.mdnsDomain)
  }
  for (const origin of settings.web.cors) {
    args.push('--cors', origin)
  }
  args.push(...settings.web.extraArgs)

  return args
}

function buildPlistXml(programArgs: string[], settings: WrapperSettings): string {
  const stdoutPath = path.join(LOG_DIR, 'stdout.log')
  const stderrPath = path.join(LOG_DIR, 'stderr.log')
  const envEntries: string[] = ['BROWSER', 'none']

  if (settings.web.username) {
    envEntries.push('OPENCODE_SERVER_USERNAME', settings.web.username)
  }
  if (settings.web.password) {
    envEntries.push('OPENCODE_SERVER_PASSWORD', settings.web.password)
  }

  const envXml: string[] = []
  for (let i = 0; i < envEntries.length; i += 2) {
    envXml.push(`    <key>${xmlEscape(envEntries[i])}</key>`)
    envXml.push(`    <string>${xmlEscape(envEntries[i + 1])}</string>`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
${plistArray(programArgs)}
  <key>EnvironmentVariables</key>
  <dict>
${envXml.join('\n')}
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(stderrPath)}</string>
</dict>
</plist>
`
}

async function launchctl(args: string[], allowFailure = false): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync('launchctl', args)
    return { stdout, stderr, exitCode: 0 }
  } catch (err) {
    if (allowFailure) {
      const error = err as { stdout?: string; stderr?: string; code?: number }
      return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', exitCode: error.code ?? 1 }
    }
    throw err
  }
}

export type LaunchdServiceStatus = 'running' | 'stopped' | 'not_installed'

export async function getServiceStatus(): Promise<LaunchdServiceStatus> {
  try {
    await access(PLIST_PATH)
  } catch {
    return 'not_installed'
  }

  const result = await launchctl(['print', launchctlDomainTarget()], true)
  if (result.exitCode !== 0) {
    return 'stopped'
  }

  if (/\bpid\s*=\s*\d+/i.test(result.stdout)) {
    return 'running'
  }

  return 'stopped'
}

export async function installService(settings: WrapperSettings): Promise<void> {
  const opencodePath = await resolveOpencodePath()
  const programArgs = buildProgramArgs(opencodePath, settings)
  const plistXml = buildPlistXml(programArgs, settings)

  await mkdir(LAUNCH_AGENTS_DIR, { recursive: true })
  await mkdir(LOG_DIR, { recursive: true })
  await writeFile(PLIST_PATH, plistXml, 'utf-8')

  await launchctl(['bootout', `gui/${getUid()}`, PLIST_PATH], true)

  await launchctl(['bootstrap', `gui/${getUid()}`, PLIST_PATH])
  await launchctl(['enable', launchctlDomainTarget()])
  await launchctl(['kickstart', '-k', launchctlDomainTarget()])
}

export async function uninstallService(): Promise<void> {
  await launchctl(['bootout', `gui/${getUid()}`, PLIST_PATH], true)
  await rm(PLIST_PATH, { force: true })
}

export async function startService(): Promise<void> {
  const status = await getServiceStatus()
  if (status === 'not_installed') {
    throw new Error('Service is not installed. Call installService first.')
  }

  await launchctl(['kickstart', '-k', launchctlDomainTarget()])
}

export async function stopService(): Promise<void> {
  const status = await getServiceStatus()
  if (status === 'not_installed') {
    return
  }

  await launchctl(['kill', 'SIGTERM', launchctlDomainTarget()], true)
}

export async function reinstallService(settings: WrapperSettings): Promise<void> {
  await uninstallService()
  await installService(settings)
}

export async function ensureServiceRunning(settings: WrapperSettings): Promise<{ port: number }> {
  const status = await getServiceStatus()
  const port = settings.web.port ?? FIXED_PORT

  if (status === 'not_installed') {
    await installService(settings)
    return { port }
  }

  if (status === 'stopped') {
    await startService()
    return { port }
  }

  return { port }
}

export function getServicePort(settings: WrapperSettings): number {
  return settings.web.port ?? FIXED_PORT
}

export function getPlistPath(): string {
  return PLIST_PATH
}

export function getLogDir(): string {
  return LOG_DIR
}
