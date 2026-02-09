<template>
  <div class="settings-view">
    <header class="settings-header">
      <button class="back-btn" @click="goBack">{{ t('settings.back') }}</button>
      <h1>{{ t('settings.title') }}</h1>
      <div class="header-actions">
        <span v-if="saveMessage" class="save-message" :class="saveMessageType">{{ saveMessage }}</span>
        <button class="preview-btn" :disabled="saving || restarting" @click="openChangePreview">
          {{ t('settings.changePreview.button') }}
        </button>
        <button class="restart-btn" :disabled="restarting || saving" @click="restart">
          {{ restarting ? t('settings.restarting') : t('settings.restart') }}
        </button>
        <button class="save-btn" :disabled="saving || restarting" @click="save">
          {{ saving ? t('settings.saving') : t('settings.save') }}
        </button>
      </div>
    </header>

    <dialog
      v-if="showChangePreview"
      ref="changePreviewDialogRef"
      class="change-preview-dialog"
      :class="{ 'is-closing': isChangePreviewClosing }"
      @cancel.prevent="closeChangePreview"
      @click="onChangePreviewDialogClick"
    >
      <div class="change-preview-header">
        <h2>{{ t('settings.changePreview.title') }}</h2>
        <button class="change-preview-close" type="button" @click="closeChangePreview">
          {{ t('settings.changePreview.close') }}
        </button>
      </div>
      <p v-if="!hasChangePreviewDiff" class="change-preview-empty">{{ t('settings.changePreview.noChanges') }}</p>
      <div v-else class="change-preview-list">
        <section v-for="entry in changePreviewEntries" :key="entry.id" class="change-preview-section" v-show="entry.changed">
          <h3>{{ entry.label }}</h3>
          <div class="change-preview-columns">
            <div class="change-preview-column">
              <p>{{ t('settings.changePreview.current') }}</p>
              <pre>{{ entry.beforeText }}</pre>
            </div>
            <div class="change-preview-column">
              <p>{{ t('settings.changePreview.proposed') }}</p>
              <pre>{{ entry.afterText }}</pre>
            </div>
          </div>
        </section>
      </div>
    </dialog>

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
          <div class="sections-toolbar">
            <button class="section-control-btn" :disabled="areAllSectionsExpanded" @click="expandAllSections">
              {{ t('settings.expandAll') }}
            </button>
            <button class="section-control-btn" :disabled="areAllSectionsCollapsed" @click="collapseAllSections">
              {{ t('settings.collapseAll') }}
            </button>
          </div>

          <section class="section" v-for="section in sections" :key="section.id" :id="`section-${section.id}`">
            <p v-if="isFirstSectionInGroup(section.id)" class="section-group">{{ getGroupLabel(section.group) }}</p>
            <button
              type="button"
              class="section-title section-toggle"
              :aria-expanded="String(!isSectionCollapsed(section.id))"
              @click="toggleSectionCollapsed(section.id)"
            >
              <span class="section-title-text">{{ section.label }}</span>
              <span class="section-chevron" :class="{ expanded: !isSectionCollapsed(section.id) }" aria-hidden="true"></span>
            </button>

            <Transition
              name="section-collapse"
              @enter="handleSectionEnter"
              @after-enter="handleSectionAfterEnter"
              @leave="handleSectionLeave"
              @after-leave="handleSectionAfterLeave"
            >
              <div v-if="!isSectionCollapsed(section.id)" class="section-panel-shell">
                <div class="section-panel">

            <GeneralSection
              v-if="section.id === 'general'"
              :config="opencode.config"
              :available-models="availableModels"
              @update="opencode.setValue"
            />

            <PluginSection
              v-else-if="section.id === 'plugin'"
              :plugins="pluginList"
              :item-anchor-ids="pluginAnchorIdMap"
              @add="opencode.addPlugin"
              @remove="opencode.removePlugin"
              @update="opencode.updatePlugin"
            />

            <ProviderSection
              v-else-if="section.id === 'provider'"
              :providers="opencode.providers.value"
              :item-anchor-ids="sectionAnchorIdMaps.provider"
              :collapsed-state="collapsedProviders"
              @add="opencode.addProvider"
              @remove="opencode.removeProvider"
              @update-field="opencode.setProviderField"
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

            <DesktopSection
              v-else-if="section.id === 'desktop'"
              :launch-at-login="wrapper.launchAtLogin.value"
              :launchd-status="launchdStatus"
              :launchd-busy="launchdBusy"
              :update-check-busy="updateCheckBusy"
              :current-version="currentVersion"
              :latest-version="latestVersion"
              :update-available="updateAvailable"
              :update-error="updateError"
              :last-checked-at="lastCheckedAt"
              :release-url="releaseUrl"
              :opencode-update-busy="opencodeUpdateBusy"
              :opencode-upgrade-busy="opencodeUpgradeBusy"
              :opencode-installed="opencodeInstalled"
              :opencode-current-version="opencodeCurrentVersion"
              :opencode-latest-version="opencodeLatestVersion"
              :opencode-update-available="opencodeUpdateAvailable"
              :opencode-update-message="opencodeUpdateMessage"
              :opencode-last-checked-at="opencodeLastCheckedAt"
              @update:launch-at-login="wrapper.setLaunchAtLogin"
              @enable:launchd="enableLaunchd"
              @disable:launchd="disableLaunchd"
              @check:updates="checkDesktopUpdates"
              @check:opencode-updates="checkOpencodeUpdates"
              @upgrade:opencode="upgradeOpencode"
            />

            <WebSection
              v-else-if="section.id === 'web'"
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
                </div>
              </div>
            </Transition>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { clientReady } from '../rpc/client.js'
import SettingsSidebar from '../components/settings/SettingsSidebar.vue'
import GeneralSection from '../components/settings/GeneralSection.vue'
import PluginSection from '../components/settings/PluginSection.vue'
import ProviderSection from '../components/settings/ProviderSection.vue'
import McpSection from '../components/settings/McpSection.vue'
import AgentSection from '../components/settings/AgentSection.vue'
import PermissionSection from '../components/settings/PermissionSection.vue'
import ServerSection from '../components/settings/ServerSection.vue'
import CompactionSection from '../components/settings/CompactionSection.vue'
import ExperimentalSection from '../components/settings/ExperimentalSection.vue'
import DesktopSection from '../components/settings/DesktopSection.vue'
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
  children?: SidebarAnchorItem[]
}

interface ChangePreviewEntry {
  id: 'opencode' | 'wrapper' | 'omo'
  label: string
  beforeText: string
  afterText: string
  changed: boolean
}

type SectionAnchorMap = Record<string, SidebarAnchorItem[]>

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const opencode = useOpencodeConfig()
const wrapper = useWrapperConfig()
const omo = useOmoConfig()

const loading = ref(true)
const restarting = ref(false)
const saving = ref(false)
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error'>('success')
const showChangePreview = ref(false)
const changePreviewDialogRef = ref<HTMLDialogElement | null>(null)
const isChangePreviewClosing = ref(false)
const opencodeConfigPath = ref('')
const wrapperConfigPath = ref('')
const omoConfigPath = ref('')
const omoLoadWarning = ref('')
const collapsedProviders = ref<Record<string, boolean>>({})
const collapsedAgents = ref<Record<string, boolean>>({})
const collapsedOmoAgents = ref<Record<string, boolean>>({})
const collapsedSections = ref<Record<string, boolean>>({})
const cloudflaredInstalled = ref(false)
const cloudflaredChecking = ref(false)
const cloudflaredInstalling = ref(false)
const cloudflaredVersion = ref('')
const tunnelRuntimeStatus = ref<'stopped' | 'starting' | 'running' | 'error'>('stopped')
const quickTunnelUrl = ref('')
const tunnelRuntimeError = ref('')
const availableModels = ref<string[]>([])
const launchdStatus = ref<'running' | 'stopped' | 'not_installed'>('not_installed')
const launchdBusy = ref(false)
const updateCheckBusy = ref(false)
const currentVersion = ref('0.0.0')
const latestVersion = ref('')
const updateAvailable = ref(false)
const updateError = ref('')
const lastCheckedAt = ref('')
const releaseUrl = ref('https://github.com/nanasi-apps/opencode-desktop/releases/latest')
const opencodeUpdateBusy = ref(false)
const opencodeUpgradeBusy = ref(false)
const opencodeInstalled = ref(false)
const opencodeCurrentVersion = ref('')
const opencodeLatestVersion = ref('')
const opencodeUpdateAvailable = ref(false)
const opencodeUpdateMessage = ref('')
const opencodeLastCheckedAt = ref('')
let tunnelStatusTimer: number | null = null
let loadedOpencodeConfig: Record<string, unknown> = {}
let loadedWrapperSettings: Record<string, unknown> = {}
let loadedOmoConfig: Record<string, unknown> = {}
let changePreviewCloseTimer: number | null = null

const CHANGE_PREVIEW_ANIMATION_MS = 180

const builtinAgents = ['plan', 'build', 'general', 'explore', 'title', 'summary', 'compaction']

const sectionDefs = [
  { id: 'general', labelKey: 'settings.sections.general', group: 'opencode' },
  { id: 'plugin', labelKey: 'settings.sections.plugins', group: 'opencode' },
  { id: 'provider', labelKey: 'settings.sections.providers', group: 'opencode' },
  { id: 'mcp', labelKey: 'settings.sections.mcpServers', group: 'opencode' },
  { id: 'agent', labelKey: 'settings.sections.agents', group: 'opencode' },
  { id: 'permission', labelKey: 'settings.sections.permissions', group: 'opencode' },
  { id: 'server', labelKey: 'settings.sections.server', group: 'opencode' },
  { id: 'compaction', labelKey: 'settings.sections.compaction', group: 'opencode' },
  { id: 'experimental', labelKey: 'settings.sections.experimental', group: 'opencode' },
  { id: 'desktop', labelKey: 'settings.sections.desktop', group: 'wrapper' },
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
    provider: buildProviderAnchors(),
    plugin: buildSectionAnchors('plugin', opencode.plugins.value),
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

const pluginList = computed<string[]>(() => opencode.plugins.value)
const pluginAnchorIdMap = computed<Record<string, string>>(() => sectionAnchorIdMaps.value.plugin ?? {})

const areAllSectionsExpanded = computed(() => sections.value.every((section) => !isSectionCollapsed(section.id)))
const areAllSectionsCollapsed = computed(() => sections.value.every((section) => isSectionCollapsed(section.id)))

const changePreviewEntries = computed<ChangePreviewEntry[]>(() => {
  const nextOpencodeConfig = opencode.getConfigForSave()
  const nextWrapperSettings = wrapper.getSettingsForSave()
  const nextOmoConfig = omo.getConfigForSave()

  const entries: ChangePreviewEntry[] = [
    {
      id: 'opencode',
      label: t('settings.changePreview.opencodeConfig'),
      beforeText: toPreviewJson(loadedOpencodeConfig),
      afterText: toPreviewJson(nextOpencodeConfig),
      changed: hasPreviewDifference(loadedOpencodeConfig, nextOpencodeConfig),
    },
    {
      id: 'wrapper',
      label: t('settings.changePreview.wrapperConfig'),
      beforeText: toPreviewJson(loadedWrapperSettings),
      afterText: toPreviewJson(nextWrapperSettings),
      changed: hasPreviewDifference(loadedWrapperSettings, nextWrapperSettings),
    },
    {
      id: 'omo',
      label: t('settings.changePreview.omoConfig'),
      beforeText: toPreviewJson(loadedOmoConfig),
      afterText: toPreviewJson(nextOmoConfig),
      changed: hasPreviewDifference(loadedOmoConfig, nextOmoConfig),
    },
  ]

  return entries
})

const hasChangePreviewDiff = computed(() => changePreviewEntries.value.some((entry) => entry.changed))

function isSectionCollapsed(id: string): boolean {
  return collapsedSections.value[id] === true
}

function setAllSectionsCollapsed(collapsed: boolean) {
  const nextState: Record<string, boolean> = {}
  sections.value.forEach((section) => {
    nextState[section.id] = collapsed
  })
  collapsedSections.value = nextState
}

function getDefaultCollapsedSections(): Record<string, boolean> {
  const initial: Record<string, boolean> = {}
  sectionDefs.forEach((section) => {
    initial[section.id] = section.id !== 'general'
  })
  return initial
}

collapsedSections.value = getDefaultCollapsedSections()

function expandAllSections() {
  setAllSectionsCollapsed(false)
}

function collapseAllSections() {
  setAllSectionsCollapsed(true)
}

function toggleSectionCollapsed(id: string) {
  collapsedSections.value = {
    ...collapsedSections.value,
    [id]: !isSectionCollapsed(id),
  }
}

function prepareSectionPanelAnimation(el: HTMLElement) {
  el.style.overflow = 'hidden'
  el.style.willChange = 'height, opacity, transform'
  el.style.transition = 'height 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, transform 0.28s ease'
}

function cleanupSectionPanelAnimation(el: HTMLElement) {
  el.style.height = ''
  el.style.overflow = ''
  el.style.opacity = ''
  el.style.transform = ''
  el.style.transition = ''
  el.style.willChange = ''
}

function handleSectionEnter(el: Element) {
  const panel = el as HTMLElement
  prepareSectionPanelAnimation(panel)
  panel.style.height = '0px'
  panel.style.opacity = '0'
  panel.style.transform = 'translateY(-6px)'
  void panel.offsetHeight
  panel.style.height = `${panel.scrollHeight}px`
  panel.style.opacity = '1'
  panel.style.transform = 'translateY(0)'
}

function handleSectionAfterEnter(el: Element) {
  const panel = el as HTMLElement
  cleanupSectionPanelAnimation(panel)
}

function handleSectionLeave(el: Element) {
  const panel = el as HTMLElement
  prepareSectionPanelAnimation(panel)
  panel.style.height = `${panel.scrollHeight}px`
  panel.style.opacity = '1'
  panel.style.transform = 'translateY(0)'
  void panel.offsetHeight
  panel.style.height = '0px'
  panel.style.opacity = '0'
  panel.style.transform = 'translateY(-6px)'
}

function handleSectionAfterLeave(el: Element) {
  const panel = el as HTMLElement
  cleanupSectionPanelAnimation(panel)
}

function collapseOmoAgentCards() {
  const nextState = { ...collapsedOmoAgents.value }
  omoAgentNames.value.forEach((name) => {
    nextState[name] = true
  })
  collapsedOmoAgents.value = nextState
}

async function ensureSectionExpanded(sectionId: string) {
  if (!isSectionCollapsed(sectionId)) return
  collapsedSections.value = {
    ...collapsedSections.value,
    [sectionId]: false,
  }
  await nextTick()
}

async function goToSection(id: string) {
  await ensureSectionExpanded(id)
  if (id === 'omo-agents') {
    collapseOmoAgentCards()
    await nextTick()
  }
  const target = document.getElementById(`section-${id}`)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function goToAnchor(anchorId: string, sectionId: string, label?: string, parentLabel?: string) {
  await ensureSectionExpanded(sectionId)
  let layoutChanged = false
  if (label) {
    layoutChanged = expandItemInSection(sectionId, label, parentLabel)
  }

  await nextTick()
  if (layoutChanged) {
    await waitForLayoutStabilization()
  }

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

function expandItemInSection(sectionId: string, label: string, parentLabel?: string): boolean {
  if (sectionId === 'agent') {
    const nextState: Record<string, boolean> = {}
    agentNames.value.forEach((name) => {
      nextState[name] = true
    })
    nextState[label] = false
    const changed = JSON.stringify(collapsedAgents.value) !== JSON.stringify(nextState)
    collapsedAgents.value = nextState
    return changed
  }

  if (sectionId === 'provider') {
    const providerName = parentLabel ?? label
    const nextState: Record<string, boolean> = {}
    Object.keys(opencode.providers.value).forEach((name) => {
      nextState[name] = true
    })
    nextState[providerName] = false
    const changed = JSON.stringify(collapsedProviders.value) !== JSON.stringify(nextState)
    collapsedProviders.value = nextState
    return changed
  }

  if (sectionId === 'omo-agents') {
    const prevState = JSON.stringify(collapsedOmoAgents.value)
    collapseOmoAgentCards()
    const changed = prevState !== JSON.stringify(collapsedOmoAgents.value)
    return changed
  }

  if (sectionId === 'omo-categories') {
    const nextState = { ...collapsedOmoAgents.value }
    omoCategoryNames.value.forEach((name) => {
      nextState[`category:${name}`] = true
    })
    const categoryKey = `category:${label}`
    nextState[categoryKey] = false
    const changed = JSON.stringify(collapsedOmoAgents.value) !== JSON.stringify(nextState)
    collapsedOmoAgents.value = nextState
    return changed
  }

  return false
}

function normalizeAnchorLabel(value: string): string {
  return value.trim().toLowerCase()
}

async function waitForLayoutStabilization() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 320)
  })
}

function scrollTargetIntoSettingsContent(target: HTMLElement, behavior: ScrollBehavior = 'smooth') {
  const content = document.querySelector<HTMLElement>('.settings-content')
  if (!content) {
    target.scrollIntoView({ behavior, block: 'start' })
    return
  }

  const targetTop = target.getBoundingClientRect().top
  const contentTop = content.getBoundingClientRect().top
  const nextTop = content.scrollTop + (targetTop - contentTop) - 8
  content.scrollTo({ top: Math.max(0, nextTop), behavior })
}

function buildSectionAnchors(sectionId: string, names: string[]): SidebarAnchorItem[] {
  return names.map((name) => ({ id: buildAnchorId(sectionId, name), label: name }))
}

function buildProviderAnchors(): SidebarAnchorItem[] {
  const providers = opencode.providers.value
  return Object.keys(providers).map((providerName) => {
    const prov = providers[providerName]
    const modelsObj = typeof prov === 'object' && prov !== null
      ? (prov as Record<string, unknown>).models
      : undefined

    let children: SidebarAnchorItem[] = []
    if (modelsObj && typeof modelsObj === 'object' && !Array.isArray(modelsObj)) {
      const modelKeys = Object.keys(modelsObj as Record<string, unknown>)
      children = modelKeys.map((modelId) => {
        const modelData = (modelsObj as Record<string, { name?: string }>)[modelId]
        const displayName = modelData?.name ?? modelId
        return {
          id: buildAnchorId('provider-model', `${providerName}::${modelId}`),
          label: displayName,
        }
      })
    }

    return {
      id: buildAnchorId('provider', providerName),
      label: providerName,
      children,
    }
  })
}

function toAnchorIdMap(items: SidebarAnchorItem[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const item of items) {
    map[item.label] = item.id
    if (item.children) {
      for (const child of item.children) {
        map[child.label] = child.id
      }
    }
  }
  return map
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

function cloneJsonObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function toPreviewJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2)
}

function hasPreviewDifference(left: unknown, right: unknown): boolean {
  return toPreviewJson(left) !== toPreviewJson(right)
}

async function openChangePreview() {
  if (showChangePreview.value) return
  showChangePreview.value = true
  isChangePreviewClosing.value = false
  await nextTick()
  const dialog = changePreviewDialogRef.value
  if (!dialog || dialog.open) return
  dialog.showModal()
}

function closeChangePreview() {
  if (isChangePreviewClosing.value) return
  isChangePreviewClosing.value = true
  if (changePreviewCloseTimer) {
    clearTimeout(changePreviewCloseTimer)
  }
  changePreviewCloseTimer = window.setTimeout(() => {
    const dialog = changePreviewDialogRef.value
    if (dialog?.open) {
      dialog.close()
    }
    showChangePreview.value = false
    isChangePreviewClosing.value = false
    changePreviewCloseTimer = null
  }, CHANGE_PREVIEW_ANIMATION_MS)
}

function onChangePreviewDialogClick(event: MouseEvent) {
  const dialog = changePreviewDialogRef.value
  if (!dialog) return
  const rect = dialog.getBoundingClientRect()
  const isInside = event.clientX >= rect.left
    && event.clientX <= rect.right
    && event.clientY >= rect.top
    && event.clientY <= rect.bottom
  if (!isInside) {
    closeChangePreview()
  }
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((value, index) => areValuesEqual(value, b[index]))
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aEntries = Object.entries(a)
    const bEntries = Object.entries(b)

    if (aEntries.length !== bEntries.length) return false

    return aEntries.every(([key, value]) => {
      if (!(key in b)) return false
      return areValuesEqual(value, (b as Record<string, unknown>)[key])
    })
  }

  return false
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

async function refreshLaunchdStatus() {
  try {
    const client = await clientReady
    const result = await client.process.getLaunchdServiceStatus()
    launchdStatus.value = result.status
  } catch {
    launchdStatus.value = 'not_installed'
  }
}

async function enableLaunchd() {
  launchdBusy.value = true
  try {
    const client = await clientReady
    await client.process.enableLaunchdService()
    await refreshLaunchdStatus()
  } catch (err) {
    saveMessage.value = err instanceof Error ? err.message : 'Failed to enable launchd service'
    saveMessageType.value = 'error'
  } finally {
    launchdBusy.value = false
  }
}

async function disableLaunchd() {
  launchdBusy.value = true
  try {
    const client = await clientReady
    await client.process.disableLaunchdService()
    await refreshLaunchdStatus()
  } catch (err) {
    saveMessage.value = err instanceof Error ? err.message : 'Failed to disable launchd service'
    saveMessageType.value = 'error'
  } finally {
    launchdBusy.value = false
  }
}

async function checkDesktopUpdates() {
  updateCheckBusy.value = true
  updateError.value = ''
  try {
    const client = await clientReady
    const result = await client.update.checkForUpdates()
    currentVersion.value = result.currentVersion
    latestVersion.value = result.latestVersion ?? ''
    updateAvailable.value = result.updateAvailable
    releaseUrl.value = result.releaseUrl
    lastCheckedAt.value = new Date(result.checkedAt).toLocaleString()
    updateError.value = result.error ?? ''
  } catch (err) {
    updateError.value = err instanceof Error ? err.message : String(err)
    lastCheckedAt.value = new Date().toLocaleString()
  } finally {
    updateCheckBusy.value = false
  }
}

async function checkOpencodeUpdates() {
  opencodeUpdateBusy.value = true
  opencodeUpdateMessage.value = ''
  try {
    const client = await clientReady
    const result = await client.update.checkOpencodeUpdates()
    opencodeInstalled.value = result.installed
    opencodeCurrentVersion.value = result.currentVersion ?? ''
    opencodeLatestVersion.value = result.latestVersion ?? ''
    opencodeUpdateAvailable.value = result.updateAvailable
    opencodeUpdateMessage.value = result.message ?? ''
  } catch (err) {
    opencodeUpdateMessage.value = err instanceof Error ? err.message : String(err)
  } finally {
    opencodeLastCheckedAt.value = new Date().toLocaleString()
    opencodeUpdateBusy.value = false
  }
}

async function upgradeOpencode() {
  opencodeUpgradeBusy.value = true
  opencodeUpdateMessage.value = ''
  try {
    const client = await clientReady
    const result = await client.update.upgradeOpencode()
    if (!result.success) {
      throw new Error(result.output || 'Failed to upgrade OpenCode')
    }
    await checkOpencodeUpdates()
    saveMessage.value = t('desktop.opencodeUpdate.upgradeCompleted')
    saveMessageType.value = 'success'
  } catch (err) {
    opencodeUpdateMessage.value = err instanceof Error ? err.message : String(err)
    saveMessage.value = t('desktop.opencodeUpdate.upgradeFailed')
    saveMessageType.value = 'error'
  } finally {
    opencodeUpgradeBusy.value = false
  }
}

async function restart() {
  if (restarting.value || saving.value) return
  restarting.value = true
  saveMessage.value = ''

  try {
    const client = await clientReady
    await client.process.restartWeb()
    saveMessage.value = t('settings.messages.restarted')
    saveMessageType.value = 'success'
  } catch (err) {
    saveMessage.value = err instanceof Error ? err.message : 'Restart failed'
    saveMessageType.value = 'error'
  } finally {
    restarting.value = false
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
  }
}

async function save() {
  saving.value = true
  saveMessage.value = ''

  try {
    const client = await clientReady
    const nextOpencodeConfig = opencode.getConfigForSave()
    const nextWrapperSettings = wrapper.getSettingsForSave()
    const nextOmoConfig = omo.getConfigForSave()
    const hasMcpChange = !areValuesEqual(loadedOpencodeConfig.mcp, nextOpencodeConfig.mcp)

    if (hasMcpChange) {
      const processStatus = await client.process.getProcessStatus()
      if (processStatus.status === 'running') {
        saveMessage.value = t('settings.messages.restartingOpencode')
        saveMessageType.value = 'success'
      }
    }

    await client.config.writeConfig({ config: nextOpencodeConfig })
    await client.omoConfig.writeConfig({ config: nextOmoConfig })

    let webSaveWarning = ''
    let tunnelSaveWarning = ''
    try {
      await client.wrapper.writeSettings({ settings: nextWrapperSettings })

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
    loadedOpencodeConfig = cloneJsonObject(nextOpencodeConfig)
    loadedWrapperSettings = cloneJsonObject(nextWrapperSettings)
    loadedOmoConfig = cloneJsonObject(nextOmoConfig)
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
  await refreshLaunchdStatus()
  await checkDesktopUpdates()
  await checkOpencodeUpdates()
  startTunnelStatusPolling()
  let loadedConfig: Record<string, unknown> = {}

  try {
    const client = await clientReady
    const result = await client.config.readConfig()
    loadedConfig = result.config
    loadedOpencodeConfig = cloneJsonObject(result.config)
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
    loadedWrapperSettings = cloneJsonObject(wrapper.getSettingsForSave())
  }

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
    loadedOmoConfig = cloneJsonObject(omo.getConfigForSave())
    await omo.loadSchema()
    loading.value = false
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
  if (changePreviewCloseTimer) {
    clearTimeout(changePreviewCloseTimer)
    changePreviewCloseTimer = null
  }
  if (changePreviewDialogRef.value?.open) {
    changePreviewDialogRef.value.close()
  }
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

.preview-btn {
  background: #332b28;
  color: #ddd1c8;
  border: 1px solid #6a5b56;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.preview-btn:hover {
  background: #4a3f3b;
}

.preview-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.change-preview-dialog {
  width: min(1120px, 100%);
  max-height: calc(100vh - 72px);
  background: #1a1413;
  border: 1px solid #4f433f;
  border-radius: 10px;
  padding: 0;
  margin: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.change-preview-dialog[open] {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.change-preview-dialog.is-closing {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.change-preview-dialog::backdrop {
  background: rgba(11, 9, 9, 0.74);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.change-preview-dialog[open]::backdrop {
  opacity: 1;
}

.change-preview-dialog.is-closing::backdrop {
  opacity: 0;
}

.change-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #3f3431;
}

.change-preview-header h2 {
  margin: 0;
  font-size: 15px;
  color: #f5efea;
}

.change-preview-close {
  border: 1px solid #6a5b56;
  background: #2f2725;
  color: #ddd1c8;
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 12px;
  cursor: pointer;
}

.change-preview-list {
  overflow: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.change-preview-empty {
  margin: 0;
  padding: 18px 16px;
  color: #b8aaa1;
}

.change-preview-section {
  border: 1px solid #3f3431;
  border-radius: 8px;
  overflow: hidden;
}

.change-preview-section h3 {
  margin: 0;
  padding: 10px 12px;
  border-bottom: 1px solid #3f3431;
  background: #221b19;
  font-size: 13px;
  color: #f0e7df;
}

.change-preview-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.change-preview-column {
  min-width: 0;
  border-right: 1px solid #3f3431;
}

.change-preview-column:last-child {
  border-right: none;
}

.change-preview-column p {
  margin: 0;
  padding: 8px 10px;
  font-size: 11px;
  color: #aa9a90;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #3f3431;
}

.change-preview-column pre {
  margin: 0;
  padding: 10px 12px;
  min-height: 120px;
  max-height: 280px;
  overflow: auto;
  color: #ddd1c8;
  background: #151110;
  font-size: 12px;
  line-height: 1.45;
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

.restart-btn {
  background: #f59e0b;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.restart-btn:hover {
  background: #d97706;
}

.restart-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.sections-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 10px;
}

.section-control-btn {
  background: #332b28;
  color: #ddd1c8;
  border: 1px solid #4f433f;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.section-control-btn:hover {
  background: #3b322f;
  border-color: #6a5b56;
}

.section-control-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.section-toggle {
  width: 100%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #e7ddd6;
  cursor: pointer;
  text-align: left;
}

.section-toggle:hover {
  background: #3a2f2c;
}

.section-title-text {
  min-width: 0;
}

.section-chevron {
  width: 8px;
  height: 8px;
  border-right: 2px solid #b8aaa1;
  border-bottom: 2px solid #b8aaa1;
  transform: rotate(45deg);
  transition: transform 0.18s ease;
  margin-left: 8px;
  flex-shrink: 0;
}

.section-chevron.expanded {
  transform: rotate(225deg);
}

.section-panel-shell {
  height: auto;
}

.section-panel {
  overflow: hidden;
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

  .sections-toolbar {
    justify-content: stretch;
  }

  .section-control-btn {
    flex: 1;
  }

  .change-preview-dialog {
    width: calc(100% - 20px);
    max-height: calc(100vh - 20px);
  }

  .change-preview-columns {
    grid-template-columns: 1fr;
  }

  .change-preview-column {
    border-right: none;
    border-bottom: 1px solid #3f3431;
  }

  .change-preview-column:last-child {
    border-bottom: none;
  }
}
</style>
