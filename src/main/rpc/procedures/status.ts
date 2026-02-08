import { os } from '@orpc/server'
import { isOpencodeInstalled } from '../../services/opencode-installer.js'
import { isOmoInstalled } from '../../services/omo-installer.js'
import { getStatus, getPort } from '../../services/opencode-process.js'
import type { OverallStatus } from '../../../shared/types.js'

export const getOverallStatus = os.handler(async (): Promise<OverallStatus> => {
  const [opencodeInstalled, omoInstalled] = await Promise.all([
    isOpencodeInstalled(),
    isOmoInstalled(),
  ])

  return {
    opencodeInstalled,
    omoInstalled,
    webProcessStatus: getStatus(),
    webPort: getPort(),
  }
})
