const RELEASES_API_URL = 'https://api.github.com/repos/nanasi-apps/opencode-desktop/releases/latest'
const RELEASES_PAGE_URL = 'https://github.com/nanasi-apps/opencode-desktop/releases/latest'

interface ParsedVersion {
  core: number[]
  prerelease: string[]
}

function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '')
}

function parseVersion(raw: string): ParsedVersion {
  const normalized = normalizeVersion(raw)
  const [corePart, prereleasePart = ''] = normalized.split('-', 2)
  const core = corePart
    .split('.')
    .map((segment) => Number.parseInt(segment, 10))
    .map((value) => (Number.isFinite(value) ? value : 0))

  const prerelease = prereleasePart
    ? prereleasePart.split('.').filter(Boolean)
    : []

  return { core, prerelease }
}

function compareIdentifier(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a)
  const bNumeric = /^\d+$/.test(b)

  if (aNumeric && bNumeric) {
    const aNum = Number.parseInt(a, 10)
    const bNum = Number.parseInt(b, 10)
    if (aNum > bNum) return 1
    if (aNum < bNum) return -1
    return 0
  }

  if (aNumeric && !bNumeric) return -1
  if (!aNumeric && bNumeric) return 1

  if (a > b) return 1
  if (a < b) return -1
  return 0
}

function compareSemver(current: string, latest: string): number {
  const currentParsed = parseVersion(current)
  const latestParsed = parseVersion(latest)

  const maxCoreLength = Math.max(currentParsed.core.length, latestParsed.core.length)
  for (let index = 0; index < maxCoreLength; index += 1) {
    const currentPart = currentParsed.core[index] ?? 0
    const latestPart = latestParsed.core[index] ?? 0
    if (currentPart > latestPart) return 1
    if (currentPart < latestPart) return -1
  }

  const currentHasPrerelease = currentParsed.prerelease.length > 0
  const latestHasPrerelease = latestParsed.prerelease.length > 0

  if (!currentHasPrerelease && latestHasPrerelease) return 1
  if (currentHasPrerelease && !latestHasPrerelease) return -1

  const maxPrereleaseLength = Math.max(currentParsed.prerelease.length, latestParsed.prerelease.length)
  for (let index = 0; index < maxPrereleaseLength; index += 1) {
    const currentPart = currentParsed.prerelease[index]
    const latestPart = latestParsed.prerelease[index]
    if (currentPart === undefined) return -1
    if (latestPart === undefined) return 1
    const compared = compareIdentifier(currentPart, latestPart)
    if (compared !== 0) return compared
  }

  return 0
}

async function fetchLatestRelease(): Promise<{ version: string; url: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)

  try {
    const response = await fetch(RELEASES_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'opencode-desktop',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`)
    }

    const payload = await response.json() as { tag_name?: string; html_url?: string }
    const latestVersion = typeof payload.tag_name === 'string' ? payload.tag_name.trim() : ''
    if (!latestVersion) {
      throw new Error('Latest release tag is missing.')
    }

    return {
      version: normalizeVersion(latestVersion),
      url: typeof payload.html_url === 'string' && payload.html_url.trim() ? payload.html_url : RELEASES_PAGE_URL,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export interface DesktopUpdateCheckResult {
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
  releaseUrl: string
  checkedAt: string
  error: string | null
}

export async function checkDesktopUpdate(currentVersionRaw: string): Promise<DesktopUpdateCheckResult> {
  const currentVersion = normalizeVersion(currentVersionRaw)
  const checkedAt = new Date().toISOString()

  try {
    const latest = await fetchLatestRelease()
    const comparison = compareSemver(currentVersion, latest.version)

    return {
      currentVersion,
      latestVersion: latest.version,
      updateAvailable: comparison < 0,
      releaseUrl: latest.url,
      checkedAt,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: RELEASES_PAGE_URL,
      checkedAt,
      error: message,
    }
  }
}
