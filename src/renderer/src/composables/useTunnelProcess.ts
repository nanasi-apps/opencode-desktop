import { ref } from 'vue'
import { clientReady } from '../rpc/client.js'
import type { TunnelStatus } from '../../../../shared/types.js'

export function useTunnelProcess() {
  const status = ref<TunnelStatus>('stopped')
  const publicUrl = ref<string | null>(null)
  const error = ref<string | null>(null)
  const pid = ref<number | null>(null)

  async function refresh(): Promise<void> {
    try {
      const client = await clientReady
      const info = await client.tunnel.getTunnelStatus()
      status.value = info.status
      publicUrl.value = info.publicUrl
      error.value = info.error
      pid.value = info.pid
    } catch {
      status.value = 'stopped'
      publicUrl.value = null
      error.value = null
      pid.value = null
    }
  }

  async function start(): Promise<boolean> {
    try {
      const client = await clientReady
      error.value = null
      const result = await client.tunnel.startTunnel()
      publicUrl.value = result.publicUrl
      status.value = 'running'
      return true
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  async function stop(): Promise<void> {
    try {
      const client = await clientReady
      await client.tunnel.stopTunnel()
      status.value = 'stopped'
      publicUrl.value = null
      pid.value = null
    } catch {
    }
  }

  return {
    status,
    publicUrl,
    error,
    pid,
    start,
    stop,
    refresh,
  }
}
