<template>
  <div class="bootstrap-view">
    <div class="bootstrap-container">
      <h1 class="title">{{ t('bootstrap.title') }}</h1>
      <p class="subtitle">{{ t('bootstrap.subtitle') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { clientReady } from '../rpc/client.js'

const router = useRouter()
const { t } = useI18n()

async function resolveInitialRoute() {
  try {
    const client = await clientReady
    const state = await client.setup.getSetupState()

    if (state.setupCompleted) {
      router.replace('/main')
      return
    }

    const [opencode, omo] = await Promise.all([
      client.installer.checkOpencode(),
      client.installer.checkOmo(),
    ])

    if (opencode.installed && omo.installed) {
      router.replace('/setup')
      return
    }
  } catch {
    // Fallback to install flow when checks fail.
  }

  router.replace('/install')
}

onMounted(() => {
  void resolveInitialRoute()
})
</script>

<style scoped>
.bootstrap-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #131010;
}

.bootstrap-container {
  text-align: center;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #f5efea;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #8d7d73;
}
</style>
