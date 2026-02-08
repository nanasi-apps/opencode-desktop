import { os } from '@orpc/server'
import {
  startOpencodeWeb,
  stopOpencodeWeb,
  getStatus,
  getPort,
  getPid,
} from '../../services/opencode-process.js'

export const startWeb = os.handler(async () => {
  return await startOpencodeWeb()
})

export const stopWeb = os.handler(async () => {
  stopOpencodeWeb()
  return { stopped: true }
})

export const getProcessStatus = os.handler(async () => {
  return {
    status: getStatus(),
    port: getPort(),
    pid: getPid(),
  }
})
