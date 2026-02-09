import { os } from '@orpc/server'
import { z } from 'zod'
import {
  readOmoConfig as readOmoConfigService,
  writeOmoConfig as writeOmoConfigService,
  getOmoConfigPath as getOmoConfigPathService,
} from '../../services/omo-config-manager.js'

export const readOmoConfig = os.handler(async () => {
  const result = await readOmoConfigService()
  return {
    config: result.config,
    path: result.path,
    parseError: result.parseError,
  }
})

export const writeOmoConfig = os
  .input(z.object({ config: z.record(z.string(), z.unknown()) }))
  .handler(async ({ input }) => {
    await writeOmoConfigService(input.config)
    return { success: true }
  })

export const getOmoConfigPath = os.handler(async () => {
  return { path: await getOmoConfigPathService() }
})
