import { os } from '@orpc/server'
import { z } from 'zod'
import {
  startTunnel as startTunnelService,
  stopTunnel as stopTunnelService,
  getStatus,
  getPublicUrl,
  getLastError,
  getPid,
  onTunnelCrash,
} from '../../services/cloudflare-tunnel-process.js'
import {
  readWrapperSettings,
} from '../../services/wrapper-settings.js'

export const startTunnel = os.handler(async () => {
  const settings = await readWrapperSettings()

  if (!settings.tunnel.enabled) {
    throw new Error('Tunnel is not enabled in settings')
  }

  const port = 4096
  const result = await startTunnelService(settings.tunnel, port)
  return result
})

export const stopTunnel = os.handler(async () => {
  stopTunnelService()
  return { stopped: true }
})

export const getTunnelStatus = os.handler(async () => {
  return {
    status: getStatus(),
    publicUrl: getPublicUrl(),
    error: getLastError(),
    pid: getPid(),
  }
})

export const getTunnelSettings = os.handler(async () => {
  const settings = await readWrapperSettings()
  return { settings: settings.tunnel }
})

export const onTunnelCrashEvent = os.handler(async () => {
  return { supported: true }
})
