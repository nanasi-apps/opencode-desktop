import { createRouter, createWebHashHistory } from 'vue-router'
import BootstrapView from '../views/BootstrapView.vue'
import InstallView from '../views/InstallView.vue'
import SetupView from '../views/SetupView.vue'
import MainView from '../views/MainView.vue'
import SettingsView from '../views/SettingsView.vue'
import { clientReady } from '../rpc/client.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: BootstrapView },
    { path: '/install', component: InstallView },
    { path: '/setup', component: SetupView },
    { path: '/main', component: MainView },
    { path: '/settings', component: SettingsView },
  ],
})

router.beforeEach(async (to) => {
  if (to.path === '/install') {
    try {
      const client = await clientReady
      const state = await client.setup.getSetupState()
      if (state.setupCompleted) {
        return { path: '/main' }
      }

      const [opencode, omo] = await Promise.all([
        client.installer.checkOpencode(),
        client.installer.checkOmo(),
      ])

      if (opencode.installed && omo.installed) {
        return { path: '/setup' }
      }
    } catch {
      return true
    }
    return true
  }

  if (to.path === '/setup') {
    try {
      const client = await clientReady
      const state = await client.setup.getSetupState()
      if (state.setupCompleted) {
        return { path: '/main' }
      }
    } catch {
      return true
    }
    return true
  }

  return true
})

export default router
