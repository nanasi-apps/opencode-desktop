import { app } from 'electron'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function resolveDesktopVersion(): Promise<string> {
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
