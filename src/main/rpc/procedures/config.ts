import { os } from '@orpc/server'
import { z } from 'zod'
import {
  readConfig as readConfigService,
  writeConfig as writeConfigService,
  getConfigPath as getConfigPathService,
} from '../../services/config-manager.js'
import {
  getStatus as getWebProcessStatus,
  startOpencodeWeb,
  stopOpencodeWeb,
} from '../../services/opencode-process.js'

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((value, index) => areValuesEqual(value, b[index]))
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aEntries = Object.entries(a)
    const bEntries = Object.entries(b)

    if (aEntries.length !== bEntries.length) return false

    return aEntries.every(([key, value]) => {
      if (!(key in b)) return false
      return areValuesEqual(value, (b as Record<string, unknown>)[key])
    })
  }

  return false
}

export const readConfig = os.handler(async () => {
  const [config, configPath] = await Promise.all([
    readConfigService(),
    getConfigPathService(),
  ])
  return { config, path: configPath }
})

export const writeConfig = os
  .input(z.object({ config: z.record(z.string(), z.unknown()) }))
  .handler(async ({ input }) => {
    const previousConfig = await readConfigService()
    await writeConfigService(input.config)

    const previousMcp = previousConfig.mcp
    const nextMcp = input.config.mcp
    const hasMcpChange = !areValuesEqual(previousMcp, nextMcp)
    const isWebRunning = getWebProcessStatus() === 'running'

    if (hasMcpChange && isWebRunning) {
      stopOpencodeWeb()
      await startOpencodeWeb()
    }

    return { success: true }
  })

export const getConfigPath = os.handler(async () => {
  return { path: await getConfigPathService() }
})
