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
import { startWeb, stopWeb, restartWeb, getProcessStatus, getLaunchdServiceStatus, enableLaunchdService, disableLaunchdService, refreshProcessStatus } from './procedures/process.js'
import { getOverallStatus } from './procedures/status.js'
import { readConfig, writeConfig, getConfigPath, getAvailableModels } from './procedures/config.js'
import { readOmoConfig, writeOmoConfig, getOmoConfigPath } from './procedures/omo-config.js'
import { getSetupState, recordSetupSuccess } from './procedures/setup.js'
import { readSettings, writeSettings, getSettingsPath as getWrapperSettingsPath } from './procedures/wrapper.js'
import { startTunnel, stopTunnel, getTunnelStatus, getTunnelSettings, onTunnelCrashEvent } from './procedures/tunnel.js'
import { checkForUpdates, checkOpencodeUpdates, upgradeOpencode } from './procedures/update.js'
import { readProjectState, writeProjectState, getProjectStatePath } from './procedures/project-state.js'

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
    restartWeb,
    getProcessStatus,
    getLaunchdServiceStatus,
    enableLaunchdService,
    disableLaunchdService,
    refreshProcessStatus,
  }),
  status: os.router({
    getOverallStatus,
  }),
  config: os.router({
    readConfig,
    writeConfig,
    getConfigPath,
    getAvailableModels,
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
  update: os.router({
    checkForUpdates,
    checkOpencodeUpdates,
    upgradeOpencode,
  }),
  projectState: os.router({
    readProjectState,
    writeProjectState,
    getProjectStatePath,
  }),
})

export type AppRouter = typeof router
