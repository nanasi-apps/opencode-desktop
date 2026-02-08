#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const LABEL = 'com.opencode.web.autostart'
const HOME_DIR = os.homedir()
const UID = process.getuid?.()

if (UID === undefined) {
  throw new Error('This script must run on macOS with a user session.')
}

const LAUNCH_AGENTS_DIR = path.join(HOME_DIR, 'Library', 'LaunchAgents')
const LOG_DIR = path.join(HOME_DIR, 'Library', 'Logs', 'opencode-web')
const PLIST_PATH = path.join(LAUNCH_AGENTS_DIR, `${LABEL}.plist`)

function parseArgs(argv) {
  const options = {
    port: 4096,
    hostname: '127.0.0.1',
    mdns: false,
    mdnsDomain: '',
    cors: [],
    username: '',
    password: '',
    extraArgs: [],
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--port') {
      const value = Number(argv[++i])
      if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error('Invalid --port value. Use 1-65535.')
      }
      options.port = value
    } else if (arg === '--hostname') {
      options.hostname = argv[++i] ?? ''
    } else if (arg === '--mdns') {
      options.mdns = true
    } else if (arg === '--mdns-domain') {
      options.mdnsDomain = argv[++i] ?? ''
    } else if (arg === '--cors') {
      options.cors.push(argv[++i] ?? '')
    } else if (arg === '--username') {
      options.username = argv[++i] ?? ''
    } else if (arg === '--password') {
      options.password = argv[++i] ?? ''
    } else if (arg === '--extra-arg') {
      options.extraArgs.push(argv[++i] ?? '')
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  options.cors = options.cors.filter(Boolean)
  options.extraArgs = options.extraArgs.filter(Boolean)
  return options
}

function shellCommand(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: 'utf-8' })
  if (result.status !== 0 && !allowFailure) {
    const stderr = result.stderr?.trim() || `Command failed: ${command} ${args.join(' ')}`
    throw new Error(stderr)
  }
  return result
}

function resolveOpencodePath() {
  if (process.env.OPENCODE_BIN) return process.env.OPENCODE_BIN

  const result = shellCommand('which', ['opencode'], { allowFailure: true })
  const resolved = result.stdout?.trim()
  if (!resolved) {
    throw new Error('Cannot find opencode binary. Add it to PATH or set OPENCODE_BIN.')
  }
  return resolved
}

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function plistArray(values) {
  const entries = values.map((value) => `    <string>${xmlEscape(value)}</string>`)
  return ['  <array>', ...entries, '  </array>'].join('\n')
}

function buildProgramArgs(opencodePath, options) {
  const args = [opencodePath, 'web', '--port', String(options.port)]

  if (options.hostname) {
    args.push('--hostname', options.hostname)
  }
  if (options.mdns || options.mdnsDomain) {
    args.push('--mdns')
  }
  if (options.mdnsDomain) {
    args.push('--mdns-domain', options.mdnsDomain)
  }
  for (const origin of options.cors) {
    args.push('--cors', origin)
  }
  args.push(...options.extraArgs)

  return args
}

function buildPlistXml(programArgs, options) {
  const stdoutPath = path.join(LOG_DIR, 'stdout.log')
  const stderrPath = path.join(LOG_DIR, 'stderr.log')
  const envEntries = ['BROWSER', 'none']

  if (options.username) {
    envEntries.push('OPENCODE_SERVER_USERNAME', options.username)
  }
  if (options.password) {
    envEntries.push('OPENCODE_SERVER_PASSWORD', options.password)
  }

  const envXml = []
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

function launchctlDomainTarget() {
  return `gui/${UID}/${LABEL}`
}

async function install(options) {
  const opencodePath = resolveOpencodePath()
  const programArgs = buildProgramArgs(opencodePath, options)
  const plistXml = buildPlistXml(programArgs, options)

  await mkdir(LAUNCH_AGENTS_DIR, { recursive: true })
  await mkdir(LOG_DIR, { recursive: true })
  await writeFile(PLIST_PATH, plistXml, 'utf-8')

  shellCommand('launchctl', ['bootout', `gui/${UID}`, PLIST_PATH], { allowFailure: true })
  shellCommand('launchctl', ['bootstrap', `gui/${UID}`, PLIST_PATH])
  shellCommand('launchctl', ['enable', launchctlDomainTarget()])
  shellCommand('launchctl', ['kickstart', '-k', launchctlDomainTarget()])

  console.log(`Installed LaunchAgent: ${PLIST_PATH}`)
  console.log(`Auto-restarted service: ${launchctlDomainTarget()}`)
}

function restart() {
  shellCommand('launchctl', ['kickstart', '-k', launchctlDomainTarget()])
  console.log(`Restarted: ${launchctlDomainTarget()}`)
}

function status() {
  const result = shellCommand('launchctl', ['print', launchctlDomainTarget()], { allowFailure: true })
  if (result.status !== 0) {
    console.log('OpenCode Web autostart is not loaded.')
    return
  }
  console.log(result.stdout.trim())
}

async function uninstall() {
  shellCommand('launchctl', ['bootout', `gui/${UID}`, PLIST_PATH], { allowFailure: true })
  await rm(PLIST_PATH, { force: true })
  console.log(`Removed LaunchAgent: ${PLIST_PATH}`)
}

function printUsage() {
  console.log(`Usage:
  node scripts/opencode-web-autostart.js install [options]
  node scripts/opencode-web-autostart.js restart
  node scripts/opencode-web-autostart.js status
  node scripts/opencode-web-autostart.js uninstall

Install options:
  --port <number>           Default: 4096
  --hostname <value>        Default: 127.0.0.1
  --mdns
  --mdns-domain <value>
  --cors <origin>           Repeatable
  --username <value>
  --password <value>
  --extra-arg <value>       Repeatable

Environment:
  OPENCODE_BIN=<path>       Override opencode binary path
`)
}

async function main() {
  const [command, ...argv] = process.argv.slice(2)

  try {
    switch (command) {
      case 'install':
        await install(parseArgs(argv))
        break
      case 'restart':
        restart()
        break
      case 'status':
        status()
        break
      case 'uninstall':
        await uninstall()
        break
      default:
        printUsage()
        process.exitCode = command ? 1 : 0
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

await main()
