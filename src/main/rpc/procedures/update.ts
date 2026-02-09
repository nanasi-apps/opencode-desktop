import { app } from 'electron'
import { os } from '@orpc/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { checkDesktopUpdate } from '../../services/update-check.js'
import { checkOpencodeUpdatesViaBrew, upgradeOpencodeViaBrew } from '../../services/opencode-installer.js'
import { appendInstallProgress, getInstallProgress, resetInstallProgress } from '../../services/install-progress.js'

async function resolveDesktopVersion(): Promise<string> {
  const version = app.getVersion().trim()
  const electronVersion = process.versions.electron?.trim() ?? ''
  if (version && version !== '0.0.0' && version !== electronVersion) {
    return version
  }

  const candidatePaths = [
    path.join(process.cwd(), 'package.json'),
    path.join(app.getAppPath(), 'package.json'),
    path.join(app.getAppPath(), '..', 'package.json'),
  ]

  for (const packageJsonPath of candidatePaths) {
    try {
      const raw = await readFile(packageJsonPath, 'utf8')
      const parsed = JSON.parse(raw) as { name?: string; version?: string }
      const name = typeof parsed.name === 'string' ? parsed.name : ''
      const parsedVersion = typeof parsed.version === 'string' ? parsed.version.trim() : ''
      if (!parsedVersion) continue
      if (name === 'opencode-desktop' || name === 'opencode-wrapper') {
        return parsedVersion
      }
    } catch {
    }
  }

  return version || '0.0.0'
}

export const checkForUpdates = os.handler(async () => {
  return await checkDesktopUpdate(await resolveDesktopVersion())
})

export const checkOpencodeUpdates = os.handler(async () => {
  return await checkOpencodeUpdatesViaBrew()
})

export const upgradeOpencode = os.handler(async () => {
  resetInstallProgress('opencode')
  const result = await upgradeOpencodeViaBrew((chunk) => {
    appendInstallProgress('opencode', chunk)
  })
  return {
    ...result,
    progress: getInstallProgress('opencode'),
  }
})
