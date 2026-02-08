<template>
  <div class="setup-view">
    <div class="setup-container">
      <h1 class="title">{{ t('setup.title') }}</h1>
      <p class="subtitle">{{ t('setup.subtitle') }}</p>

      <div class="steps">
        <div class="install-progress">
          <div class="step-header">
            <StatusIndicator :status="webStatusForIndicator" />
            <span class="step-name">{{ t('setup.openCodeWeb') }}</span>
            <span class="step-label">{{ webLabel }}</span>
          </div>
        </div>
      </div>

      <div v-if="fatalError" class="error-banner">
        <p>{{ fatalError }}</p>
        <button class="retry-btn" @click="retry">{{ t('setup.retry') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOpencodeProcess } from '../composables/useOpencodeProcess.js'
import { clientReady } from '../rpc/client.js'
import StatusIndicator from '../components/StatusIndicator.vue'

const router = useRouter()
const { t } = useI18n()

const { status: webStatus, port, start: startWeb, stop: stopWeb } = useOpencodeProcess()

const fatalError = ref<string | null>(null)
const autoStartWeb = ref(true)

const webStatusForIndicator = computed(() => {
  return webStatus.value as 'stopped' | 'starting' | 'running' | 'error'
})

const webLabel = computed(() => {
  switch (webStatus.value) {
    case 'stopped': return t('setup.status.starting')
    case 'starting': return t('setup.status.starting')
    case 'running': return t('setup.status.runningOnPort', { port: port.value })
    case 'error': return t('setup.status.failedToStart')
    default: return ''
  }
})

async function runSetup() {
  fatalError.value = null

  try {
    try {
      const client = await clientReady
      const state = await client.setup.getSetupState()
      if (state.setupCompleted) {
        router.replace('/main')
        return
      }
      autoStartWeb.value = state.autoStartWeb !== false

      if (!autoStartWeb.value) {
        await client.setup.recordSetupSuccess({
          port: null,
          autoStartWeb: false,
          webStarted: false,
        })
        router.replace('/main')
        return
      }
    } catch {}

    const webOk = await startWeb()
    if (!webOk) {
      fatalError.value = t('setup.errors.failedToStartWeb')
      return
    }

    try {
      const client = await clientReady
      await client.setup.recordSetupSuccess({
        port: port.value,
        autoStartWeb: autoStartWeb.value,
        webStarted: true,
      })
    } catch (err) {
      console.warn('Failed to persist setup state', err)
    }

    router.replace({ path: '/main', query: { port: String(port.value) } })
  } catch (err) {
    fatalError.value = err instanceof Error ? err.message : String(err)
  }
}

async function retry() {
  await stopWeb()
  await runSetup()
}

onMounted(runSetup)
</script>

<style scoped>
.setup-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #131010;
}
.setup-container {
  width: 480px;
  padding: 40px;
}
.title {
  font-size: 24px;
  font-weight: 700;
  color: #f5efea;
  margin-bottom: 6px;
}
.subtitle {
  font-size: 14px;
  color: #8d7d73;
  margin-bottom: 32px;
}
.steps {
  display: flex;
  flex-direction: column;
}
.install-progress {
  padding: 12px 0;
  border-bottom: 1px solid #3f3431;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-name {
  font-weight: 600;
  color: #e7ddd6;
  font-size: 14px;
}
.step-label {
  color: #b8aaa1;
  font-size: 13px;
  margin-left: auto;
}
.error-banner {
  margin-top: 24px;
  padding: 12px 16px;
  background: #7f1d1d;
  border: 1px solid #991b1b;
  border-radius: 8px;
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.5;
}
.error-banner p {
  margin: 0 0 10px 0;
}
.retry-btn {
  background: #991b1b;
  color: #fca5a5;
  border: 1px solid #b91c1c;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.retry-btn:hover {
  background: #b91c1c;
}
</style>
