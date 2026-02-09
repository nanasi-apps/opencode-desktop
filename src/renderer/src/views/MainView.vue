<template>
  <div class="main-view">
    <div v-if="loadError" class="error-overlay">
      <div class="error-content">
        <h2>{{ t('main.connectionLost') }}</h2>
        <p>{{ loadError }}</p>
        <div class="error-actions">
          <button class="btn" @click="reloadWebview">{{ t('main.reload') }}</button>
          <button class="btn btn-secondary" @click="backToSetup">{{ t('main.restartSetup') }}</button>
        </div>
      </div>
    </div>
    <div class="tunnel-indicator" v-if="tunnelStatus !== 'stopped' || tunnelError">
      <span v-if="tunnelStatus === 'starting'" class="tunnel-status tunnel-starting" :title="t('main.tunnel.starting')">
        <IconRefresh :size="16" class="spin" />
      </span>
      <span v-else-if="tunnelStatus === 'running' && tunnelPublicUrl" class="tunnel-status tunnel-running" :title="t('main.tunnel.active', { url: tunnelPublicUrl })" @click="copyTunnelUrl">
        <IconWorld :size="16" />
      </span>
      <span v-else-if="tunnelStatus === 'error' || tunnelError" class="tunnel-status tunnel-error" :title="t('main.tunnel.error', { error: tunnelError || t('main.tunnel.unknownError') })">
        <IconAlertTriangle :size="16" />
      </span>
    </div>
    <button class="settings-btn" @click="openSettings" :title="t('main.settings')">
      <IconSettings :size="16" />
    </button>
    <div v-if="manualStartRequired && !webUrl && !loadError" class="manual-start-overlay">
      <div class="manual-start-content">
        <h2>{{ t('main.manualStart.title') }}</h2>
        <p>{{ t('main.manualStart.subtitle') }}</p>
        <button class="btn" @click="startWebManually">{{ t('main.manualStart.startButton') }}</button>
      </div>
    </div>
    <webview
      v-if="webUrl"
      ref="webviewRef"
      class="opencode-webview"
      :src="webUrl"
      allowpopups
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { IconRefresh, IconWorld, IconAlertTriangle, IconSettings } from '@tabler/icons-vue'
import { clientReady } from '../rpc/client.js'
import type { TunnelStatus } from '../../../../shared/types.js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const webviewRef = ref<any>(null)
const loadError = ref<string | null>(null)
const webPort = ref<number | null>(null)
const autoStartWeb = ref(true)
const manualStartRequired = ref(false)
const tunnelStatus = ref<TunnelStatus>('stopped')
const tunnelPublicUrl = ref<string | null>(null)
const tunnelError = ref<string | null>(null)
let listenersAttached = false
let tunnelRefreshInterval: number | null = null

const webUrl = computed(() => {
  if (!webPort.value) return null
  return `http://localhost:${webPort.value}`
})

function getRoutePort(): number | null {
  const raw = route.query.port
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) return null
  return parsed
}

async function syncAutoStartPreference(): Promise<void> {
  try {
    const client = await clientReady
    const state = await client.setup.getSetupState()
    autoStartWeb.value = state.autoStartWeb !== false
  } catch {
    autoStartWeb.value = true
  }
}

async function ensureWebPort(forceStart = false): Promise<void> {
  const routePort = getRoutePort()
  if (routePort) {
    webPort.value = routePort
    manualStartRequired.value = false
    return
  }

  const client = await clientReady
  const status = await client.process.getProcessStatus()
  if (status.status === 'running' && status.port) {
    webPort.value = status.port
    manualStartRequired.value = false
    await router.replace({ path: '/main', query: { port: String(status.port) } })
    return
  }

  if (!forceStart && !autoStartWeb.value) {
    manualStartRequired.value = true
    return
  }

  const started = await client.process.startWeb()
  webPort.value = started.port
  manualStartRequired.value = false
  await router.replace({ path: '/main', query: { port: String(started.port) } })
}

const onDidFailLoad = (event: any) => {
  if (event.errorCode === -3) return
  loadError.value = t('main.errors.failedToLoadWeb', { error: event.errorDescription })
}

const onCrashed = () => {
  loadError.value = t('main.errors.webProcessCrashed')
}

const onProcessCrashed = () => {
  loadError.value = t('main.errors.webProcessExitedUnexpectedly')
}

const onTunnelCrashed = () => {
  tunnelStatus.value = 'stopped'
  tunnelPublicUrl.value = null
  tunnelError.value = t('main.errors.tunnelProcessExitedUnexpectedly')
}

async function refreshTunnelStatus(): Promise<void> {
  try {
    const client = await clientReady
    const info = await client.tunnel.getTunnelStatus()
    tunnelStatus.value = info.status
    tunnelPublicUrl.value = info.publicUrl
    tunnelError.value = info.error
  } catch {
  }
}

function copyTunnelUrl() {
  if (tunnelPublicUrl.value) {
    navigator.clipboard.writeText(tunnelPublicUrl.value)
  }
}

function startTunnelRefresh() {
  if (tunnelRefreshInterval) return
  void refreshTunnelStatus()
  tunnelRefreshInterval = window.setInterval(() => {
    void refreshTunnelStatus()
  }, 5000)
}

function stopTunnelRefresh() {
  if (tunnelRefreshInterval) {
    clearInterval(tunnelRefreshInterval)
    tunnelRefreshInterval = null
  }
}

function attachListenersIfNeeded() {
  if (listenersAttached) return
  const webview = webviewRef.value
  if (!webview) return
  webview.addEventListener('did-fail-load', onDidFailLoad)
  webview.addEventListener('crashed', onCrashed)
  window.addEventListener('opencode-web-crashed', onProcessCrashed)
  window.addEventListener('cloudflare-tunnel-crashed', onTunnelCrashed)
  listenersAttached = true
}

function reloadWebview() {
  loadError.value = null
  if (webviewRef.value) {
    webviewRef.value.reload()
    return
  }
  void ensureWebPort(true)
}

function startWebManually() {
  loadError.value = null
  void ensureWebPort(true)
}

function backToSetup() {
  router.replace('/setup')
}

function openSettings() {
  const port = webPort.value ?? getRoutePort()
  router.push({ path: '/settings', query: port ? { port: String(port) } : {} })
}

watch(webUrl, async (url) => {
  if (!url) return
  await nextTick()
  attachListenersIfNeeded()
}, { immediate: true })

onMounted(async () => {
  try {
    await syncAutoStartPreference()
    await ensureWebPort()
    startTunnelRefresh()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err)
  }
})

onUnmounted(() => {
  const webview = webviewRef.value
  if (webview) {
    webview.removeEventListener('did-fail-load', onDidFailLoad)
    webview.removeEventListener('crashed', onCrashed)
  }
  window.removeEventListener('opencode-web-crashed', onProcessCrashed)
  window.removeEventListener('cloudflare-tunnel-crashed', onTunnelCrashed)
  stopTunnelRefresh()
})
</script>

<style scoped>
.main-view {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  background: #131010;
}
.opencode-webview {
  flex: 1;
  border: none;
}
.settings-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 20;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(36, 29, 28, 0.88);
  color: #b8aaa1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-app-region: no-drag;
}
.settings-btn:hover {
  background: rgba(53, 43, 41, 0.95);
  color: #f5efea;
}
.error-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(19, 16, 16, 0.94);
}
.manual-start-overlay {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(19, 16, 16, 0.92);
}
.manual-start-content {
  text-align: center;
  max-width: 420px;
  padding: 20px;
}
.manual-start-content h2 {
  font-size: 20px;
  font-weight: 700;
  color: #f5efea;
  margin-bottom: 8px;
}
.manual-start-content p {
  font-size: 14px;
  color: #b8aaa1;
  margin-bottom: 20px;
}
.error-content {
  text-align: center;
  max-width: 400px;
}
.error-content h2 {
  font-size: 20px;
  font-weight: 700;
  color: #f5efea;
  margin-bottom: 8px;
}
.error-content p {
  font-size: 14px;
  color: #b8aaa1;
  margin-bottom: 20px;
}
.error-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: #3b82f6;
  color: #fff;
  transition: background 0.15s;
}
.btn:hover {
  background: #2563eb;
}
.btn-secondary {
  background: #4f433f;
  color: #ddd1c8;
}
.btn-secondary:hover {
  background: #6a5b56;
}
.tunnel-indicator {
  position: absolute;
  bottom: 12px;
  right: 52px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tunnel-status {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.15s, background 0.15s;
}
.tunnel-status:hover {
  transform: scale(1.05);
}
.tunnel-starting {
  background: rgba(59, 130, 246, 0.2);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.tunnel-running {
  background: rgba(34, 197, 94, 0.2);
}
.tunnel-error {
  background: rgba(239, 68, 68, 0.2);
}
</style>
