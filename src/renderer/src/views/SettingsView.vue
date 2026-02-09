<template>
  <div class="settings-view">
    <header class="settings-header">
      <button class="back-btn" @click="goBack">{{ t('settings.back') }}</button>
      <h1>{{ t('settings.title') }}</h1>
      <div class="header-actions">
        <span v-if="saveMessage" class="save-message" :class="saveMessageType">{{ saveMessage }}</span>
        <button class="save-btn" :disabled="saving" @click="save">
          {{ saving ? t('settings.saving') : t('settings.save') }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading">{{ t('settings.loadingConfiguration') }}</div>

    <div v-else class="settings-body">
      <div class="settings-layout">
        <SettingsSidebar
          :opencode-config-path="opencodeConfigPath"
          :wrapper-config-path="wrapperConfigPath"
          :omo-config-path="omoConfigPath"
          :sections="sections"
          :section-anchors="sectionAnchors"
          @go-to-section="goToSection"
          @go-to-anchor="goToAnchor"
        />

        <div class="settings-content">
          <section class="section" v-for="section in sections" :key="section.id" :id="`section-${section.id}`">
            <p v-if="isFirstSectionInGroup(section.id)" class="section-group">{{ getGroupLabel(section.group) }}</p>
            <h2 class="section-title">{{ section.label }}</h2>

            <GeneralSection
              v-if="section.id === 'general'"
              :config="opencode.config"
              :available-models="availableModels"
              @update="opencode.setValue"
            />

            <ProviderSection
              v-else-if="section.id === 'provider'"
              :providers="opencode.providers.value"
              :item-anchor-ids="sectionAnchorIdMaps.provider"
              :collapsed-state="collapsedProviders"
              @add="opencode.addProvider"
              @remove="opencode.removeProvider"
              @update-field="opencode.setProviderField"
              @update-models="(name, models) => opencode.setProviderField(name, 'models', models)"
              @update-collapsed="(state) => collapsedProviders = state"
            />

            <McpSection
              v-else-if="section.id === 'mcp'"
              :mcp-servers="opencode.mcpServers.value"
              :item-anchor-ids="sectionAnchorIdMaps.mcp"
              @add="opencode.addMcp"
              @remove="opencode.removeMcp"
              @update-field="opencode.setMcpField"
            />

            <AgentSection
              v-else-if="section.id === 'agent'"
              :agents="opencode.agents.value"
              :agent-names="agentNames"
              :item-anchor-ids="sectionAnchorIdMaps.agent"
              :builtin-agents="builtinAgents"
              :available-models="availableModels"
              :collapsed-state="collapsedAgents"
              @add="opencode.addAgent"
              @remove="opencode.removeAgent"
              @update-field="opencode.setAgentField"
              @update-collapsed="(state) => collapsedAgents = state"
            />

            <PermissionSection
              v-else-if="section.id === 'permission'"
              :permissions="opencode.permissions.value"
              @update-permission="opencode.setPermission"
            />

            <ServerSection
              v-else-if="section.id === 'server'"
              :server="opencode.server.value"
              @update-nested="(key, value) => opencode.setNestedValue('server', key, value)"
            />

            <CompactionSection
              v-else-if="section.id === 'compaction'"
              :compaction="opencode.compaction.value"
              @update-nested="(key, value) => opencode.setNestedValue('compaction', key, value)"
            />

            <ExperimentalSection
              v-else-if="section.id === 'experimental'"
              :experimental="opencode.experimental.value"
              @update-nested="(key, value) => opencode.setNestedValue('experimental', key, value)"
            />

            <WebSection
              v-else-if="section.id === 'web'"
              :launch-at-login="wrapper.launchAtLogin.value"
              :web-port="String(wrapper.web.value.port ?? '')"
              :web-hostname="wrapper.web.value.hostname"
              :web-mdns="wrapper.web.value.mdns"
              :web-mdns-domain="wrapper.web.value.mdnsDomain ?? ''"
              :web-cors-origins="wrapper.getWebCorsOriginsString()"
              :web-auth-username="wrapper.web.value.username ?? ''"
              :web-auth-password="wrapper.web.value.password ?? ''"
              :web-extra-args="wrapper.getWebExtraArgsString()"
              :is-network-exposed-without-auth="wrapper.isNetworkExposedWithoutAuth.value"
              :hostname-locked="wrapper.isHostnameLockedByTunnel.value"
              @update:launch-at-login="wrapper.setLaunchAtLogin"
              @update:web-port="wrapper.setWebPort"
              @update:web-hostname="wrapper.setWebHostname"
              @update:web-mdns="wrapper.setWebMdns"
              @update:web-mdns-domain="wrapper.setWebMdnsDomain"
              @update:web-cors-origins="wrapper.setWebCorsOrigins"
              @update:web-auth-username="wrapper.setWebAuthUsername"
              @update:web-auth-password="wrapper.setWebAuthPassword"
              @update:web-extra-args="wrapper.setWebExtraArgs"
            />

            <TunnelSection
              v-else-if="section.id === 'tunnel'"
              :tunnel-enabled="wrapper.tunnel.value.enabled"
              :tunnel-mode="wrapper.tunnel.value.mode"
              :tunnel-token="wrapper.tunnel.value.token ?? ''"
              :tunnel-hostname="wrapper.tunnel.value.hostname ?? ''"
              :tunnel-cloudflared-path="wrapper.tunnel.value.cloudflaredPath ?? ''"
              :cloudflared-installed="cloudflaredInstalled"
              :cloudflared-checking="cloudflaredChecking"
              :cloudflared-installing="cloudflaredInstalling"
              :cloudflared-version="cloudflaredVersion"
              :tunnel-runtime-status="tunnelRuntimeStatus"
              :quick-tunnel-url="quickTunnelUrl"
              :tunnel-runtime-error="tunnelRuntimeError"
              @update:tunnel-enabled="wrapper.setTunnelEnabled"
              @update:tunnel-mode="wrapper.setTunnelMode"
              @update:tunnel-token="wrapper.setTunnelToken"
              @update:tunnel-hostname="wrapper.setTunnelHostname"
              @update:tunnel-cloudflared-path="wrapper.setTunnelCloudflaredPath"
              @install:cloudflared="installCloudflared"
            />

            <OmoSection
              v-else-if="isOmoSection(section.id)"
              :section-id="section.id"
              :omo="omo"
              :load-warning="omoLoadWarning"
              :available-models="availableModels"
              :item-anchor-ids="sectionAnchorIdMaps[section.id]"
              :collapsed-state="collapsedOmoAgents"
              @update-collapsed="(state) => collapsedOmoAgents = state"
            />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { clientReady } from '../rpc/client.js'
import SettingsSidebar from '../components/settings/SettingsSidebar.vue'
import GeneralSection from '../components/settings/GeneralSection.vue'
import ProviderSection from '../components/settings/ProviderSection.vue'
import McpSection from '../components/settings/McpSection.vue'
import AgentSection from '../components/settings/AgentSection.vue'
import PermissionSection from '../components/settings/PermissionSection.vue'
import ServerSection from '../components/settings/ServerSection.vue'
import CompactionSection from '../components/settings/CompactionSection.vue'
import ExperimentalSection from '../components/settings/ExperimentalSection.vue'
import WebSection from '../components/settings/WebSection.vue'
import TunnelSection from '../components/settings/TunnelSection.vue'
import OmoSection from '../components/settings/OmoSection.vue'
import { useOpencodeConfig } from '../composables/useOpencodeConfig.js'
import { useWrapperConfig } from '../composables/useWrapperConfig.js'
import { useOmoConfig } from '../composables/useOmoConfig.js'
import type { SettingsGroup, SettingsSection } from '../types/settings.js'

interface SidebarAnchorItem {
  id: string
  label: string
}

type SectionAnchorMap = Record<string, SidebarAnchorItem[]>

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const opencode = useOpencodeConfig()
const wrapper = useWrapperConfig()
const omo = useOmoConfig()

const loading = ref(true)
const saving = ref(false)
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error'>('success')
const opencodeConfigPath = ref('')
const wrapperConfigPath = ref('')
const omoConfigPath = ref('')
const omoLoadWarning = ref('')
const collapsedProviders = ref<Record<string, boolean>>({})
const collapsedAgents = ref<Record<string, boolean>>({})
const collapsedOmoAgents = ref<Record<string, boolean>>({})
const cloudflaredInstalled = ref(false)
const cloudflaredChecking = ref(false)
const cloudflaredInstalling = ref(false)
const cloudflaredVersion = ref('')
const tunnelRuntimeStatus = ref<'stopped' | 'starting' | 'running' | 'error'>('stopped')
const quickTunnelUrl = ref('')
const tunnelRuntimeError = ref('')
const availableModels = ref<string[]>([])
let tunnelStatusTimer: number | null = null

const builtinAgents = ['plan', 'build', 'general', 'explore', 'title', 'summary', 'compaction']

const sectionDefs = [
  { id: 'general', labelKey: 'settings.sections.general', group: 'opencode' },
  { id: 'provider', labelKey: 'settings.sections.providers', group: 'opencode' },
  { id: 'mcp', labelKey: 'settings.sections.mcpServers', group: 'opencode' },
  { id: 'agent', labelKey: 'settings.sections.agents', group: 'opencode' },
  { id: 'permission', labelKey: 'settings.sections.permissions', group: 'opencode' },
  { id: 'server', labelKey: 'settings.sections.server', group: 'opencode' },
  { id: 'compaction', labelKey: 'settings.sections.compaction', group: 'opencode' },
  { id: 'experimental', labelKey: 'settings.sections.experimental', group: 'opencode' },
  { id: 'web', labelKey: 'settings.sections.web', group: 'wrapper' },
  { id: 'tunnel', labelKey: 'settings.sections.cloudflareTunnel', group: 'wrapper' },
  { id: 'omo-categories', labelKey: 'settings.sections.categories', group: 'omo' },
  { id: 'omo-claude-code', labelKey: 'settings.sections.claudeCode', group: 'omo' },
  { id: 'omo-sisyphus-agent', labelKey: 'settings.sections.sisyphusAgent', group: 'omo' },
  { id: 'omo-comment-checker', labelKey: 'settings.sections.commentChecker', group: 'omo' },
  { id: 'omo-experimental', labelKey: 'settings.sections.experimental', group: 'omo' },
  { id: 'omo-auto-update', labelKey: 'settings.sections.autoUpdate', group: 'omo' },
  { id: 'omo-skills', labelKey: 'settings.sections.skills', group: 'omo' },
  { id: 'omo-ralph-loop', labelKey: 'settings.sections.ralphLoop', group: 'omo' },
  { id: 'omo-background-task', labelKey: 'settings.sections.backgroundTask', group: 'omo' },
  { id: 'omo-notification', labelKey: 'settings.sections.notification', group: 'omo' },
  { id: 'omo-git-master', labelKey: 'settings.sections.gitMaster', group: 'omo' },
  { id: 'omo-disabled', labelKey: 'settings.sections.disabled', group: 'omo' },
  { id: 'omo-agents', labelKey: 'settings.sections.agents', group: 'omo' },
] as const

const sections = computed<SettingsSection[]>(() => {
  return sectionDefs.map((section) => ({
    id: section.id,
    label: t(section.labelKey),
    group: section.group,
  }))
})

const agentNames = computed(() => {
  const names = new Set([...builtinAgents, ...Object.keys(opencode.agents.value)])
  return [...names]
})

const omoAgentNames = computed(() => {
  const value = omo.agentNames
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.value)) return value.value
  return [] as string[]
})

const omoCategoryNames = computed(() => {
  const value = omo.categoryNames
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.value)) return value.value
  return [] as string[]
})

const sectionAnchors = computed<SectionAnchorMap>(() => {
  return {
    provider: buildSectionAnchors('provider', Object.keys(opencode.providers.value)),
    mcp: buildSectionAnchors('mcp', Object.keys(opencode.mcpServers.value)),
    agent: buildSectionAnchors('agent', agentNames.value),
    'omo-categories': buildSectionAnchors('omo-categories', omoCategoryNames.value),
    'omo-agents': buildSectionAnchors('omo-agents', omoAgentNames.value),
  }
})

const sectionAnchorIdMaps = computed<Record<string, Record<string, string>>>(() => {
  const maps: Record<string, Record<string, string>> = {}
  Object.entries(sectionAnchors.value).forEach(([sectionId, items]) => {
    maps[sectionId] = toAnchorIdMap(items)
  })
  return maps
})

function goToSection(id: string) {
  const target = document.getElementById(`section-${id}`)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToAnchor(anchorId: string, sectionId: string, label?: string) {
  const target = document.getElementById(anchorId)
  if (target) {
    scrollTargetIntoSettingsContent(target)
    return
  }

  if (label) {
    const fallbackTarget = document.getElementById(buildAnchorId(sectionId, label))
    if (fallbackTarget) {
      scrollTargetIntoSettingsContent(fallbackTarget)
      return
    }

    const sectionRoot = document.getElementById(`section-${sectionId}`)
    const normalizedLabel = normalizeAnchorLabel(label)
    const labelTarget = Array.from(sectionRoot?.querySelectorAll<HTMLElement>('[data-anchor-label]') ?? [])
      .find((element) => normalizeAnchorLabel(element.dataset.anchorLabel ?? '') === normalizedLabel)
    if (labelTarget) {
      scrollTargetIntoSettingsContent(labelTarget)
      return
    }

    const textMatch = Array.from(sectionRoot?.querySelectorAll<HTMLElement>('strong, .field-label') ?? [])
      .find((element) => normalizeAnchorLabel(element.textContent ?? '') === normalizedLabel)
    if (textMatch) {
      scrollTargetIntoSettingsContent(textMatch.closest('.card, .omo-field, .field') as HTMLElement ?? textMatch)
      return
    }
  }

  goToSection(sectionId)
}

function normalizeAnchorLabel(value: string): string {
  return value.trim().toLowerCase()
}

function scrollTargetIntoSettingsContent(target: HTMLElement) {
  const content = document.querySelector<HTMLElement>('.settings-content')
  if (!content) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  const targetTop = target.getBoundingClientRect().top
  const contentTop = content.getBoundingClientRect().top
  const nextTop = content.scrollTop + (targetTop - contentTop) - 8
  content.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' })
}

function buildSectionAnchors(sectionId: string, names: string[]): SidebarAnchorItem[] {
  return names.map((name) => ({ id: buildAnchorId(sectionId, name), label: name }))
}

function toAnchorIdMap(items: SidebarAnchorItem[]): Record<string, string> {
  return items.reduce<Record<string, string>>((map, item) => {
    map[item.label] = item.id
    return map
  }, {})
}

function buildAnchorId(sectionId: string, name: string): string {
  const trimmed = name.trim()
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const stableKey = encodeURIComponent(trimmed).replace(/%/g, '_')
  return `anchor-${sectionId}-${normalized || 'item'}-${stableKey || 'empty'}`
}

function getGroupLabel(group: SettingsGroup): string {
  if (group === 'opencode') return t('settings.groups.opencodeSettings')
  if (group === 'wrapper') return t('settings.groups.wrapperSettings')
  return t('settings.groups.ohMyOpenCodeSettings')
}

function isFirstSectionInGroup(id: string): boolean {
  const index = sections.value.findIndex((section) => section.id === id)
  if (index <= 0) return true
  return sections.value[index - 1].group !== sections.value[index].group
}

function isOmoSection(id: string): boolean {
  return id === 'omo-categories'
    || id === 'omo-claude-code'
    || id === 'omo-sisyphus-agent'
    || id === 'omo-comment-checker'
    || id === 'omo-experimental'
    || id === 'omo-auto-update'
    || id === 'omo-skills'
    || id === 'omo-ralph-loop'
    || id === 'omo-background-task'
    || id === 'omo-notification'
    || id === 'omo-git-master'
    || id === 'omo-disabled'
    || id === 'omo-agents'
    || id === 'omo-custom'
}

function goBack() {
  const port = route.query.port
  if (port) {
    router.push({ path: '/main', query: { port: String(port) } })
  } else {
    router.back()
  }
}

async function checkCloudflaredInstall() {
  cloudflaredChecking.value = true
  try {
    const client = await clientReady
    const result = await client.installer.checkCloudflared()
    cloudflaredInstalled.value = result.installed
    cloudflaredVersion.value = result.version ?? ''
  } catch {
    cloudflaredInstalled.value = false
    cloudflaredVersion.value = ''
  } finally {
    cloudflaredChecking.value = false
  }
}

async function installCloudflared() {
  cloudflaredInstalling.value = true
  saveMessage.value = ''
  try {
    const client = await clientReady
    const result = await client.installer.installCloudflared()
    if (!result.success) {
      throw new Error(result.output || t('settings.messages.failedToInstallCloudflared'))
    }
    await checkCloudflaredInstall()
    saveMessage.value = t('settings.messages.cloudflaredInstalled')
    saveMessageType.value = 'success'
  } catch (err) {
    saveMessage.value = err instanceof Error ? err.message : t('settings.messages.failedToInstallCloudflared')
    saveMessageType.value = 'error'
  } finally {
    cloudflaredInstalling.value = false
  }
}

async function refreshTunnelRuntimeStatus() {
  try {
    const client = await clientReady
    const result = await client.tunnel.getTunnelStatus()
    tunnelRuntimeStatus.value = result.status
    quickTunnelUrl.value = result.publicUrl ?? ''
    tunnelRuntimeError.value = result.error ?? ''
  } catch {
    tunnelRuntimeStatus.value = 'stopped'
    quickTunnelUrl.value = ''
    tunnelRuntimeError.value = ''
  }
}

function startTunnelStatusPolling() {
  if (tunnelStatusTimer) return
  void refreshTunnelRuntimeStatus()
  tunnelStatusTimer = window.setInterval(() => {
    void refreshTunnelRuntimeStatus()
  }, 5000)
}

function stopTunnelStatusPolling() {
  if (!tunnelStatusTimer) return
  clearInterval(tunnelStatusTimer)
  tunnelStatusTimer = null
}

async function save() {
  saving.value = true
  saveMessage.value = ''

  try {
    const client = await clientReady
    await client.config.writeConfig({ config: opencode.getConfigForSave() })
    await client.omoConfig.writeConfig({ config: omo.getConfigForSave() })

    let webSaveWarning = ''
    let tunnelSaveWarning = ''
    try {
      await client.wrapper.writeSettings({ settings: wrapper.getSettingsForSave() })

      if (wrapper.tunnel.value.enabled) {
        try {
          await client.tunnel.stopTunnel()
        } catch {
        }
        try {
          await client.tunnel.startTunnel()
        } catch (err) {
          tunnelSaveWarning = err instanceof Error ? err.message : t('settings.messages.tunnelStartFailed')
        }
      } else {
        try {
          await client.tunnel.stopTunnel()
        } catch {
        }
      }

      await refreshTunnelRuntimeStatus()
    } catch (err) {
      webSaveWarning = err instanceof Error ? err.message : t('settings.messages.webSettingsSaveFailed')
    }

    if (webSaveWarning && tunnelSaveWarning) {
      saveMessage.value = t('settings.messages.savedWithWebAndTunnel', { web: webSaveWarning, tunnel: tunnelSaveWarning })
    } else if (webSaveWarning) {
      saveMessage.value = t('settings.messages.savedWithWeb', { web: webSaveWarning })
    } else if (tunnelSaveWarning) {
      saveMessage.value = t('settings.messages.savedWithTunnel', { tunnel: tunnelSaveWarning })
    } else {
      saveMessage.value = t('settings.messages.saved')
    }
    saveMessageType.value = 'success'
  } catch (err) {
    saveMessage.value = err instanceof Error ? err.message : t('settings.messages.saveFailed')
    saveMessageType.value = 'error'
  } finally {
    saving.value = false
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
  }
}

async function loadAvailableModels() {
  try {
    const client = await clientReady
    const result = await client.config.getAvailableModels()
    availableModels.value = result.models
  } catch {
    availableModels.value = []
  }
}

onMounted(async () => {
  await loadAvailableModels()
  await checkCloudflaredInstall()
  startTunnelStatusPolling()
  let loadedConfig: Record<string, unknown> = {}

  try {
    const client = await clientReady
    const result = await client.config.readConfig()
    loadedConfig = result.config
    opencodeConfigPath.value = result.path
    opencode.loadConfig(result.config)
  } catch {
    opencodeConfigPath.value = t('settings.messages.failedToLoadConfig')
  }

  const server = (loadedConfig.server ?? {}) as Record<string, unknown>

  try {
    const client = await clientReady
    const [wrapperResult, wrapperPathResult] = await Promise.all([
      client.wrapper.readSettings(),
      client.wrapper.getSettingsPath(),
    ])

    wrapperConfigPath.value = wrapperPathResult.path
    wrapper.loadSettings(wrapperResult.settings)

    if (wrapperResult.settings.web.port === null && typeof server.port === 'number') {
      wrapper.setWebPort(String(server.port))
    }

    if (wrapperResult.settings.web.hostname === '127.0.0.1' && typeof server.hostname === 'string') {
      wrapper.setWebHostname(server.hostname)
    }

    if (!wrapperResult.settings.web.mdns && server.mdns === true) {
      wrapper.setWebMdns(true)
    }

    if (!wrapperResult.settings.web.mdnsDomain && typeof server.mdnsDomain === 'string') {
      wrapper.setWebMdnsDomain(server.mdnsDomain)
    }

    const serverCors = Array.isArray(server.cors)
      ? server.cors.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : []

    if (wrapperResult.settings.web.cors.length === 0 && serverCors.length > 0) {
      wrapper.setWebCorsOrigins(serverCors.join('\n'))
    }
  } catch {
    wrapperConfigPath.value = t('settings.messages.failedToLoadWrapperSettings')
    wrapper.loadFromServerConfig(server)
  } finally {
    try {
      const client = await clientReady
      const omoResult = await client.omoConfig.readConfig()
      omoConfigPath.value = omoResult.path
      omo.loadConfig(omoResult.config)
      omoLoadWarning.value = typeof omoResult.parseError === 'string' ? omoResult.parseError : ''
    } catch {
      omoConfigPath.value = t('settings.messages.failedToLoadOmoConfig')
      omoLoadWarning.value = ''
    } finally {
      await omo.loadSchema()
      loading.value = false
    }
  }

  Object.keys(opencode.providers.value).forEach((key) => {
    collapsedProviders.value[key] = true
  })

  Object.keys(opencode.agents.value).forEach((key) => {
    collapsedAgents.value[key] = true
  })

  Object.keys(omo.config.agents ?? {}).forEach((key) => {
    collapsedOmoAgents.value[key] = true
  })
})

onUnmounted(() => {
  stopTunnelStatusPolling()
})
</script>

<style scoped>
.settings-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #131010;
  color: #f5efea;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #3f3431;
  flex-shrink: 0;
}

.settings-header h1 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  background: #4f433f;
  color: #ddd1c8;
  border: 1px solid #6a5b56;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.back-btn:hover {
  background: #6a5b56;
}

.save-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover {
  background: #2563eb;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-message {
  font-size: 13px;
}

.save-message.success {
  color: #34d399;
}

.save-message.error {
  color: #f87171;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #b8aaa1;
}

.settings-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 20px 24px 40px;
}

.settings-layout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.settings-content {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

.section {
  margin-bottom: 14px;
  border: 1px solid #3f3431;
  border-radius: 8px;
  overflow: hidden;
}

.section-title {
  padding: 12px 16px;
  background: #2d2422;
  font-weight: 600;
  font-size: 14px;
  margin: 0;
}

.section-group {
  margin: 0;
  padding: 8px 16px;
  background: #151110;
  border-bottom: 1px solid #3f3431;
  color: #aa9a90;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

@media (max-width: 960px) {
  .settings-body {
    overflow-y: auto;
  }

  .settings-layout {
    height: auto;
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .settings-content {
    min-height: auto;
    overflow-y: visible;
  }
}
</style>
