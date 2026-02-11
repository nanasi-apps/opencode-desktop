import { os } from '@orpc/server'
import { checkDesktopUpdate } from '../../services/update-check.js'
import { checkOpencodeUpdatesViaBrew, upgradeOpencodeViaBrew } from '../../services/opencode-installer.js'
import { appendInstallProgress, getInstallProgress, resetInstallProgress } from '../../services/install-progress.js'
import { resolveDesktopVersion } from '../../services/desktop-version.js'

export const checkForUpdates = os.handler(async () => {
  return await checkDesktopUpdate(await resolveDesktopVersion())
})

export const checkOpencodeUpdates = os.handler(async () => {
  return await checkOpencodeUpdatesViaBrew()
})

export const upgradeOpencode = os.handler(async () => {
  resetInstallProgress('opencode')
  const result = await upgradeOpencodeViaBrew((chunk) => {
    appendInstallProgress('opencode', chunk)
  })
  return {
    ...result,
    progress: getInstallProgress('opencode'),
  }
})
