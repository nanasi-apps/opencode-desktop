import { os } from '@orpc/server'
import {
  checkOpencode,
  installOpencodeProc,
  checkHomebrew,
  installHomebrewProc,
  installOpencodeViaBrewProc,
  checkOmo,
  installOmoProc,
  installOmoWithOptionsProc,
  getInstallProgressProc,
  checkCloudflared,
  installCloudflaredProc,
} from './procedures/installer.js'
import { startWeb, stopWeb, getProcessStatus } from './procedures/process.js'
import { getOverallStatus } from './procedures/status.js'
import { readConfig, writeConfig, getConfigPath } from './procedures/config.js'
import { readOmoConfig, writeOmoConfig, getOmoConfigPath } from './procedures/omo-config.js'
import { getSetupState, recordSetupSuccess } from './procedures/setup.js'
import { readSettings, writeSettings, getSettingsPath as getWrapperSettingsPath } from './procedures/wrapper.js'
import { startTunnel, stopTunnel, getTunnelStatus, getTunnelSettings, onTunnelCrashEvent } from './procedures/tunnel.js'

export const router = os.router({
  installer: os.router({
    checkOpencode,
    installOpencode: installOpencodeProc,
    checkHomebrew,
    installHomebrew: installHomebrewProc,
    installOpencodeViaBrew: installOpencodeViaBrewProc,
    checkOmo,
    installOmo: installOmoProc,
    installOmoWithOptions: installOmoWithOptionsProc,
    getInstallProgress: getInstallProgressProc,
    checkCloudflared,
    installCloudflared: installCloudflaredProc,
  }),
  process: os.router({
    startWeb,
    stopWeb,
    getProcessStatus,
  }),
  status: os.router({
    getOverallStatus,
  }),
  config: os.router({
    readConfig,
    writeConfig,
    getConfigPath,
  }),
  omoConfig: os.router({
    readConfig: readOmoConfig,
    writeConfig: writeOmoConfig,
    getConfigPath: getOmoConfigPath,
  }),
  setup: os.router({
    getSetupState,
    recordSetupSuccess,
  }),
  wrapper: os.router({
    readSettings,
    writeSettings,
    getSettingsPath: getWrapperSettingsPath,
  }),
  tunnel: os.router({
    startTunnel,
    stopTunnel,
    getTunnelStatus,
    getTunnelSettings,
    onTunnelCrashEvent,
  }),
})

export type AppRouter = typeof router
