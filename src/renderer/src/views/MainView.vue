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
      <span
        v-else-if="tunnelStatus === 'error' || tunnelError"
        class="tunnel-status tunnel-error"
        :title="t('main.tunnel.error', { error: tunnelError || t('main.tunnel.unknownError') })"
        @click="openTunnelErrorDialog"
      >
        <IconAlertTriangle :size="16" />
      </span>
    </div>
    <dialog
      v-if="showTunnelErrorDialog"
      ref="tunnelErrorDialogRef"
      class="tunnel-error-dialog"
      @cancel.prevent="closeTunnelErrorDialog"
      @click="onTunnelErrorDialogClick"
    >
      <div class="tunnel-error-dialog-content">
        <h2>{{ t('main.tunnel.errorDialog.title') }}</h2>
        <p>{{ t('main.tunnel.errorDialog.description') }}</p>
        <pre>{{ tunnelErrorDialogMessage }}</pre>
        <div class="tunnel-error-dialog-actions">
          <button class="btn btn-secondary" type="button" @click="closeTunnelErrorDialog">
            {{ t('main.tunnel.errorDialog.close') }}
          </button>
          <button class="btn" type="button" @click="openSettingsFromTunnelErrorDialog">
            {{ t('main.tunnel.errorDialog.openSettings') }}
          </button>
        </div>
      </div>
    </dialog>
    <button class="settings-btn" @click="openSettings" :title="t('main.settings')">
      <IconSettings :size="16" />
      <span
        v-if="opencodeUpdateAvailable"
        class="settings-update-dot"
        :title="t('main.opencodeUpdateAvailable')"
        aria-hidden="true"
      ></span>
    </button>
    <div v-if="showDebugPortBadge && currentDisplayedPort" class="debug-port-badge">
      {{ t('main.debug.currentPort', { port: currentDisplayedPort }) }}
    </div>
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
const showTunnelErrorDialog = ref(false)
const tunnelErrorDialogRef = ref<HTMLDialogElement | null>(null)
let listenersAttached = false
let tunnelRefreshInterval: number | null = null
let opencodeUpdateInterval: number | null = null
let projectStateBackupInterval: number | null = null
let didAttemptProjectRestore = false
const opencodeUpdateAvailable = ref(false)
const NATIVE_NOTIFICATION_CONSOLE_PREFIX = '__OPENCODE_NATIVE_NOTIFICATION__:'

const webUrl = computed(() => {
  if (!webPort.value) return null
  return `http://localhost:${webPort.value}`
})

const showDebugPortBadge = computed(() => {
  const debugQuery = route.query.debug
  const debugValue = Array.isArray(debugQuery) ? debugQuery[0] : debugQuery
  return import.meta.env.DEV || debugValue === '1' || debugValue === 'true'
})

const currentDisplayedPort = computed(() => {
  return webPort.value ?? getRoutePort()
})

const tunnelErrorDialogMessage = computed(() => {
  return tunnelError.value || t('main.tunnel.unknownError')
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

const onConsoleMessage = (event: any) => {
  if (!event || typeof event.message !== 'string') return
  if (!event.message.startsWith(NATIVE_NOTIFICATION_CONSOLE_PREFIX)) return

  const payloadJson = event.message.slice(NATIVE_NOTIFICATION_CONSOLE_PREFIX.length)
  try {
    const payload = JSON.parse(payloadJson)
    window.dispatchEvent(new CustomEvent('opencode-native-notification', { detail: payload }))
  } catch {
  }
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

async function refreshOpencodeUpdateStatus(): Promise<void> {
  try {
    const client = await clientReady
    const result = await client.update.checkOpencodeUpdates()
    opencodeUpdateAvailable.value = result.updateAvailable
  } catch {
    opencodeUpdateAvailable.value = false
  }
}

async function extractLocalStorageEntriesFromWebview(): Promise<Record<string, string>> {
  const webview = webviewRef.value
  if (!webview) return {}

  try {
    const result = await webview.executeJavaScript(`(() => {
      const out = {}
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i)
        if (!key) continue
        const value = localStorage.getItem(key)
        if (typeof value === 'string') {
          out[key] = value
        }
      }
      return out
    })()`, true)

    if (!result || typeof result !== 'object') return {}
    const entries: Record<string, string> = {}
    for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
      if (!key.trim()) continue
      if (typeof value !== 'string') continue
      entries[key] = value
    }
    return entries
  } catch {
    return {}
  }
}

async function backupProjectState(): Promise<void> {
  try {
    const entries = await extractLocalStorageEntriesFromWebview()
    if (Object.keys(entries).length === 0) return
    const client = await clientReady
    await client.projectState.writeProjectState({ entries })
  } catch {
  }
}

async function hasLocalStorageEntriesInWebview(): Promise<boolean> {
  const webview = webviewRef.value
  if (!webview) return false

  try {
    const hasEntries = await webview.executeJavaScript(`(() => {
      return localStorage.length > 0
    })()`, true)
    return hasEntries === true
  } catch {
    return false
  }
}

async function restoreProjectStateIfNeeded(): Promise<boolean> {
  if (didAttemptProjectRestore) return false
  didAttemptProjectRestore = true

  const webview = webviewRef.value
  if (!webview) return false

  try {
    const client = await clientReady
    const result = await client.projectState.readProjectState()
    const entries = result.state.entries
    if (!entries || Object.keys(entries).length === 0) return false

    const alreadyPresent = await hasLocalStorageEntriesInWebview()
    const payload = JSON.stringify(entries)

    if (!alreadyPresent) {
      const restored = await webview.executeJavaScript(`(() => {
        const entries = ${payload}
        for (const [key, value] of Object.entries(entries)) {
          if (typeof key !== 'string' || !key) continue
          if (typeof value !== 'string') continue
          localStorage.setItem(key, value)
        }
        return true
      })()`, true)

      return restored === true
    }

    const merged = await webview.executeJavaScript(`(() => {
      const entries = ${payload}
      let added = 0
      for (const [key, value] of Object.entries(entries)) {
        if (typeof key !== 'string' || !key) continue
        if (typeof value !== 'string') continue
        if (localStorage.getItem(key) !== null) continue
        localStorage.setItem(key, value)
        added += 1
      }
      return added > 0
    })()`, true)

    return merged === true
  } catch {
    return false
  }
}

function copyTunnelUrl() {
  if (tunnelPublicUrl.value) {
    navigator.clipboard.writeText(tunnelPublicUrl.value)
  }
}

async function openTunnelErrorDialog() {
  if (tunnelStatus.value !== 'error' && !tunnelError.value) return
  showTunnelErrorDialog.value = true
  await nextTick()
  const dialog = tunnelErrorDialogRef.value
  if (!dialog || dialog.open) return
  dialog.showModal()
}

function closeTunnelErrorDialog() {
  showTunnelErrorDialog.value = false
  const dialog = tunnelErrorDialogRef.value
  if (dialog?.open) {
    dialog.close()
  }
}

function onTunnelErrorDialogClick(event: MouseEvent) {
  const dialog = tunnelErrorDialogRef.value
  if (!dialog) return
  const rect = dialog.getBoundingClientRect()
  const target = event.target as Element | null
  if (!target || target !== dialog) return
  const clickedInside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  if (!clickedInside) {
    closeTunnelErrorDialog()
  }
}

function openSettingsFromTunnelErrorDialog() {
  closeTunnelErrorDialog()
  openSettings()
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

function startOpencodeUpdateRefresh() {
  if (opencodeUpdateInterval) return
  void refreshOpencodeUpdateStatus()
  opencodeUpdateInterval = window.setInterval(() => {
    void refreshOpencodeUpdateStatus()
  }, 60_000)
}

function startProjectStateBackup(): void {
  if (projectStateBackupInterval) return
  void backupProjectState()
  projectStateBackupInterval = window.setInterval(() => {
    void backupProjectState()
  }, 15_000)
}

function stopProjectStateBackup(): void {
  if (projectStateBackupInterval) {
    clearInterval(projectStateBackupInterval)
    projectStateBackupInterval = null
  }
}

const onDomReady = () => {
  void (async () => {
    const webview = webviewRef.value
    if (webview) {
      await webview.executeJavaScript(`(() => {
        const PREFIX = '${NATIVE_NOTIFICATION_CONSOLE_PREFIX}'
        const global = window
        if (global.__opencodeNativeNotificationPatched === true) return
        global.__opencodeNativeNotificationPatched = true

        class NativeNotification {
          static permission = 'granted'

          static requestPermission() {
            return Promise.resolve('granted')
          }

          constructor(title, options = {}) {
            const payload = {
              title: typeof title === 'string' ? title : '',
              body: typeof options.body === 'string' ? options.body : '',
              subtitle: typeof options.tag === 'string' ? options.tag : '',
              silent: options.silent === true,
            }

            try {
              console.log(PREFIX + JSON.stringify(payload))
            } catch {
            }
          }

          close() {
          }

          addEventListener() {
          }

          removeEventListener() {
          }

          dispatchEvent() {
            return true
          }
        }

        Object.defineProperty(global, 'Notification', {
          configurable: true,
          writable: true,
          value: NativeNotification,
        })
      })()`, true)
    }

    const restored = await restoreProjectStateIfNeeded()
    startProjectStateBackup()
    if (restored && webviewRef.value) {
      webviewRef.value.reload()
    }
  })()
}

function stopOpencodeUpdateRefresh() {
  if (opencodeUpdateInterval) {
    clearInterval(opencodeUpdateInterval)
    opencodeUpdateInterval = null
  }
}

function attachListenersIfNeeded() {
  if (listenersAttached) return
  const webview = webviewRef.value
  if (!webview) return
  webview.addEventListener('did-fail-load', onDidFailLoad)
  webview.addEventListener('crashed', onCrashed)
  webview.addEventListener('dom-ready', onDomReady)
  webview.addEventListener('console-message', onConsoleMessage)
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
    startOpencodeUpdateRefresh()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err)
  }
})

onUnmounted(() => {
  const webview = webviewRef.value
  if (webview) {
    void backupProjectState()
    webview.removeEventListener('did-fail-load', onDidFailLoad)
    webview.removeEventListener('crashed', onCrashed)
    webview.removeEventListener('dom-ready', onDomReady)
    webview.removeEventListener('console-message', onConsoleMessage)
  }
  window.removeEventListener('opencode-web-crashed', onProcessCrashed)
  window.removeEventListener('cloudflare-tunnel-crashed', onTunnelCrashed)
  stopTunnelRefresh()
  stopOpencodeUpdateRefresh()
  stopProjectStateBackup()
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

.settings-update-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 1px rgba(19, 16, 16, 0.85);
}
.settings-btn:hover {
  background: rgba(53, 43, 41, 0.95);
  color: #f5efea;
}

.debug-port-badge {
  position: absolute;
  right: 12px;
  bottom: 50px;
  z-index: 20;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #d8cbc2;
  background: rgba(36, 29, 28, 0.92);
  border: 1px solid rgba(140, 122, 110, 0.35);
  -webkit-app-region: no-drag;
  pointer-events: none;
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

.tunnel-error-dialog {
  width: min(520px, calc(100vw - 32px));
  border: 1px solid rgba(138, 123, 114, 0.4);
  border-radius: 12px;
  background: #1f1817;
  color: #f5efea;
  padding: 0;
}

.tunnel-error-dialog::backdrop {
  background: rgba(10, 8, 8, 0.6);
}

.tunnel-error-dialog-content {
  padding: 18px;
}

.tunnel-error-dialog-content h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.tunnel-error-dialog-content p {
  margin: 10px 0 12px;
  font-size: 13px;
  color: #c7b7ad;
}

.tunnel-error-dialog-content pre {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(138, 123, 114, 0.35);
  background: rgba(0, 0, 0, 0.28);
  color: #f8f2ee;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.tunnel-error-dialog-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
