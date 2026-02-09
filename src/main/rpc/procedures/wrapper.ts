import { os } from '@orpc/server'
import { z } from 'zod'
import {
  readWrapperSettings as readWrapperSettingsService,
  writeWrapperSettings as writeWrapperSettingsService,
  getWrapperSettingsPath,
  applyLoginItemSettings,
} from '../../services/wrapper-settings.js'
import { getServiceStatus, reinstallService } from '../../services/launchd-service.js'

const tunnelSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['named', 'quick']),
  token: z.string().min(1).nullable(),
  hostname: z.string().min(1).nullable(),
  cloudflaredPath: z.string().min(1).nullable(),
  autoStartWithWeb: z.boolean(),
})

const wrapperSettingsSchema = z.object({
  launchAtLogin: z.boolean(),
  web: z.object({
    port: z.number().int().min(1).max(65535).nullable(),
    hostname: z.string().min(1),
    mdns: z.boolean(),
    mdnsDomain: z.string().min(1).nullable(),
    cors: z.array(z.string()),
    username: z.string().min(1).nullable(),
    password: z.string().min(1).nullable(),
    extraArgs: z.array(z.string()),
  }),
  tunnel: tunnelSettingsSchema,
})

export const readSettings = os.handler(async () => {
  return { settings: await readWrapperSettingsService() }
})

export const writeSettings = os
  .input(z.object({ settings: wrapperSettingsSchema }))
  .handler(async ({ input }) => {
    const settings = await writeWrapperSettingsService(input.settings)
    applyLoginItemSettings(settings.launchAtLogin)

    const serviceStatus = await getServiceStatus()
    if (serviceStatus !== 'not_installed') {
      await reinstallService(settings)
    }

    return { settings }
  })

export const getSettingsPath = os.handler(async () => {
  return { path: getWrapperSettingsPath() }
})
