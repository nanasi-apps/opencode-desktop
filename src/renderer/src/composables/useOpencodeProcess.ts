import { ref } from 'vue'
import { clientReady } from '../rpc/client.js'
import type { ProcessStatus } from '../../../shared/types.js'

export function useOpencodeProcess() {
  const status = ref<ProcessStatus>('stopped')
  const port = ref<number | null>(null)
  const error = ref<string | null>(null)

  async function start(): Promise<boolean> {
    try {
      const client = await clientReady
      status.value = 'starting'
      error.value = null
      const result = await client.process.startWeb()
      port.value = result.port
      status.value = 'running'
      return true
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  async function stop(): Promise<void> {
    const client = await clientReady
    await client.process.stopWeb()
    status.value = 'stopped'
    port.value = null
  }

  async function refresh(): Promise<void> {
    const client = await clientReady
    const info = await client.process.getProcessStatus()
    status.value = info.status
    port.value = info.port
  }

  return { status, port, error, start, stop, refresh }
}
