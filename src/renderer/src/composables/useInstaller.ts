import { ref } from 'vue'
import { clientReady } from '../rpc/client.js'
import type { InstallStatus } from '../../../shared/types.js'

export function useInstaller() {
  const opencodeStatus = ref<InstallStatus>('idle')
  const omoStatus = ref<InstallStatus>('idle')
  const opencodeOutput = ref('')
  const omoOutput = ref('')

  async function checkAndInstallOpencode(): Promise<boolean> {
    const client = await clientReady
    opencodeStatus.value = 'checking'
    const { installed } = await client.installer.checkOpencode()

    if (installed) {
      opencodeStatus.value = 'installed'
      return true
    }

    opencodeStatus.value = 'installing'
    const result = await client.installer.installOpencode()
    opencodeOutput.value = result.output

    if (result.success) {
      opencodeStatus.value = 'installed'
      return true
    }

    opencodeStatus.value = 'error'
    return false
  }

  async function checkAndInstallOmo(): Promise<boolean> {
    const client = await clientReady
    omoStatus.value = 'checking'
    const { installed } = await client.installer.checkOmo()

    if (installed) {
      omoStatus.value = 'installed'
      return true
    }

    omoStatus.value = 'installing'
    const result = await client.installer.installOmo()
    omoOutput.value = result.output

    if (result.success) {
      omoStatus.value = 'installed'
      return true
    }

    omoStatus.value = 'error'
    return false
  }

  function reset() {
    opencodeStatus.value = 'idle'
    omoStatus.value = 'idle'
    opencodeOutput.value = ''
    omoOutput.value = ''
  }

  function applyCachedInstalledState() {
    opencodeStatus.value = 'installed'
    omoStatus.value = 'installed'
    opencodeOutput.value = ''
    omoOutput.value = ''
  }

  return {
    opencodeStatus,
    omoStatus,
    opencodeOutput,
    omoOutput,
    checkAndInstallOpencode,
    checkAndInstallOmo,
    applyCachedInstalledState,
    reset,
  }
}
