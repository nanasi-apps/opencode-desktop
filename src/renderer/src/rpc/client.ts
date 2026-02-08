import { RPCLink } from '@orpc/client/message-port'
import { createORPCClient } from '@orpc/client'
import type { RouterClient } from '@orpc/server'
import type { AppRouter } from '../../../main/rpc/router.js'

type Client = RouterClient<AppRouter>

let resolveClient: (client: Client) => void
export const clientReady: Promise<Client> = new Promise((resolve) => {
  resolveClient = resolve
})

export let client: Client

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data !== 'orpc-port') return
  const [port] = event.ports
  if (!port) return

  const link = new RPCLink({ port })
  port.start()

  client = createORPCClient<Client>(link)
  resolveClient(client)

  window.addEventListener('beforeunload', () => {
    port.close()
  })
})
