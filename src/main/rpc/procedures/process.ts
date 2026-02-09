import { os } from '@orpc/server'
import {
  startOpencodeWeb,
  stopOpencodeWeb,
  restartOpencodeWeb,
  getStatus,
  getPort,
  getPid,
  getLaunchdStatus,
  refreshStatus,
} from '../../services/opencode-process.js'
import {
  installService,
  uninstallService,
  getServiceStatus,
  getPlistPath,
  getLogDir,
} from '../../services/launchd-service.js'
import { readWrapperSettings } from '../../services/wrapper-settings.js'

export const startWeb = os.handler(async () => {
  return await startOpencodeWeb()
})

export const stopWeb = os.handler(async () => {
  await stopOpencodeWeb()
  return { stopped: true }
})

export const restartWeb = os.handler(async () => {
  return await restartOpencodeWeb()
})

export const getProcessStatus = os.handler(async () => {
  return {
    status: getStatus(),
    port: getPort(),
    pid: getPid(),
  }
})

export const getLaunchdServiceStatus = os.handler(async () => {
  const status = await getLaunchdStatus()
  return {
    status,
    plistPath: getPlistPath(),
    logDir: getLogDir(),
  }
})

export const enableLaunchdService = os.handler(async () => {
  const settings = await readWrapperSettings()
  await installService(settings)
  return { enabled: true }
})

export const disableLaunchdService = os.handler(async () => {
  await uninstallService()
  return { disabled: true }
})

export const refreshProcessStatus = os.handler(async () => {
  const status = await refreshStatus()
  return {
    status,
    port: getPort(),
  }
})
