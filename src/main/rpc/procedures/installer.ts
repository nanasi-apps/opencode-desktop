import { os } from '@orpc/server'
import { z } from 'zod'
import {
  isOpencodeInstalled,
  installOpencode,
  isHomebrewInstalled,
  installHomebrew,
  installOpencodeViaBrew,
} from '../../services/opencode-installer.js'
import { isOmoInstalled, installOmo, installOmoWithOptions } from '../../services/omo-installer.js'
import {
  isCloudflaredInstalled,
  getCloudflaredVersion,
  installCloudflared,
} from '../../services/cloudflared-installer.js'
import {
  appendInstallProgress,
  getInstallProgress,
  resetInstallProgress,
  type InstallProgressTarget,
} from '../../services/install-progress.js'
import type { OmoInstallOptions } from '../../../shared/types.js'

export const checkOpencode = os.handler(async () => {
  return { installed: await isOpencodeInstalled() }
})

export const installOpencodeProc = os.handler(async () => {
  resetInstallProgress('opencode')
  return await installOpencode((chunk) => {
    appendInstallProgress('opencode', chunk)
  })
})

export const checkHomebrew = os.handler(async () => {
  return { installed: await isHomebrewInstalled() }
})

export const installHomebrewProc = os.handler(async () => {
  resetInstallProgress('homebrew')
  return await installHomebrew((chunk) => {
    appendInstallProgress('homebrew', chunk)
  })
})

export const installOpencodeViaBrewProc = os.handler(async () => {
  resetInstallProgress('opencode')
  return await installOpencodeViaBrew((chunk) => {
    appendInstallProgress('opencode', chunk)
  })
})

export const checkOmo = os.handler(async () => {
  return { installed: await isOmoInstalled() }
})

export const installOmoProc = os.handler(async () => {
  resetInstallProgress('omo')
  return await installOmo((chunk) => {
    appendInstallProgress('omo', chunk)
  })
})

const installProgressTargetSchema = z.enum(['homebrew', 'opencode', 'omo'])

export const getInstallProgressProc = os
  .input(z.object({
    target: installProgressTargetSchema,
  }))
  .handler(({ input }) => {
    return getInstallProgress(input.target as InstallProgressTarget)
  })

const omoInstallOptionsSchema = z.object({
  claude: z.enum(['no', 'yes', 'max20']),
  openai: z.enum(['yes', 'no']),
  gemini: z.enum(['yes', 'no']),
  copilot: z.enum(['yes', 'no']),
  opencodeZen: z.enum(['yes', 'no']),
  zaiCodingPlan: z.enum(['yes', 'no']),
})

export const installOmoWithOptionsProc = os
  .input(z.object({
    options: omoInstallOptionsSchema,
    packageManager: z.enum(['npm', 'bun', 'auto']).default('auto'),
  }))
  .handler(async ({ input }) => {
    resetInstallProgress('omo')
    return await installOmoWithOptions(
      input.options as OmoInstallOptions,
      input.packageManager,
      (chunk) => {
        appendInstallProgress('omo', chunk)
      },
    )
  })

export const checkCloudflared = os.handler(async () => {
  const installed = await isCloudflaredInstalled()
  const version = installed ? await getCloudflaredVersion() : null
  return { installed, version }
})

export const installCloudflaredProc = os.handler(async () => {
  return await installCloudflared()
})
