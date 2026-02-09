<template>
  <div class="section-body">
    <p class="hint section-hint">{{ t('desktop.hintTop') }}</p>
    <SettingsField
      :label="t('desktop.launchAtLogin.label')"
      type="checkbox"
      :model-value="launchAtLogin"
      @update:model-value="$emit('update:launchAtLogin', Boolean($event))"
      :help="t('desktop.launchAtLogin.help')"
    />
    <div class="launchd-field">
      <div class="launchd-header">
        <span class="field-label">{{ t('desktop.backgroundService.label') }}</span>
        <span class="launchd-status" :class="launchdStatusClass">{{ launchdStatusText }}</span>
      </div>
      <p class="field-help">{{ t('desktop.backgroundService.help') }}</p>
      <div class="launchd-actions">
        <button
          v-if="launchdStatus !== 'running'"
          class="launchd-btn enable"
          :disabled="launchdBusy"
          @click="$emit('enable:launchd')"
        >
          {{ launchdBusy ? t('desktop.backgroundService.enabling') : t('desktop.backgroundService.enable') }}
        </button>
        <button
          v-else
          class="launchd-btn disable"
          :disabled="launchdBusy"
          @click="$emit('disable:launchd')"
        >
          {{ launchdBusy ? t('desktop.backgroundService.disabling') : t('desktop.backgroundService.disable') }}
        </button>
      </div>
    </div>

    <div class="update-field">
      <div class="update-header">
        <span class="field-label">{{ t('desktop.updateCheck.label') }}</span>
        <span class="update-version">v{{ currentVersion }}</span>
      </div>
      <p class="field-help">{{ t('desktop.updateCheck.help') }}</p>
      <p class="update-status" :class="updateStatusClass">{{ updateStatusText }}</p>
      <div class="update-actions">
        <button class="launchd-btn enable" :disabled="updateCheckBusy" @click="$emit('check:updates')">
          {{ updateCheckBusy ? t('desktop.updateCheck.checking') : t('desktop.updateCheck.checkNow') }}
        </button>
        <a
          v-if="updateAvailable && releaseUrl"
          class="release-link"
          :href="releaseUrl"
          target="_blank"
          rel="noreferrer"
        >
          {{ t('desktop.updateCheck.openReleasePage') }}
        </a>
      </div>
    </div>

    <div class="update-field">
      <div class="update-header">
        <span class="field-label">{{ t('desktop.opencodeUpdate.label') }}</span>
        <span class="update-version">{{ opencodeVersionLabel }}</span>
      </div>
      <p class="field-help">{{ t('desktop.opencodeUpdate.help') }}</p>
      <p class="update-status" :class="opencodeStatusClass">{{ opencodeStatusText }}</p>
      <div class="update-actions">
        <button class="launchd-btn enable" :disabled="opencodeUpdateBusy" @click="$emit('check:opencode-updates')">
          {{ opencodeUpdateBusy ? t('desktop.opencodeUpdate.checking') : t('desktop.opencodeUpdate.checkNow') }}
        </button>
        <button
          v-if="opencodeUpdateAvailable"
          class="launchd-btn enable"
          :disabled="opencodeUpgradeBusy"
          @click="$emit('upgrade:opencode')"
        >
          {{ opencodeUpgradeBusy ? t('desktop.opencodeUpdate.upgrading') : t('desktop.opencodeUpdate.upgradeNow') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsField from './SettingsField.vue'

const { t } = useI18n()

const props = defineProps<{
  launchAtLogin: boolean
  launchdStatus: 'running' | 'stopped' | 'not_installed'
  launchdBusy: boolean
  updateCheckBusy: boolean
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  updateError: string
  lastCheckedAt: string
  releaseUrl: string
  opencodeUpdateBusy: boolean
  opencodeUpgradeBusy: boolean
  opencodeInstalled: boolean
  opencodeCurrentVersion: string
  opencodeLatestVersion: string
  opencodeUpdateAvailable: boolean
  opencodeUpdateMessage: string
  opencodeLastCheckedAt: string
}>()

defineEmits<{
  'update:launchAtLogin': [value: boolean]
  'enable:launchd': []
  'disable:launchd': []
  'check:updates': []
  'check:opencode-updates': []
  'upgrade:opencode': []
}>()

const launchdStatusClass = computed(() => {
  if (props.launchdStatus === 'running') return 'status-running'
  if (props.launchdStatus === 'stopped') return 'status-stopped'
  return 'status-not-installed'
})

const launchdStatusText = computed(() => {
  if (props.launchdStatus === 'running') return t('desktop.backgroundService.statusRunning')
  if (props.launchdStatus === 'stopped') return t('desktop.backgroundService.statusStopped')
  return t('desktop.backgroundService.statusNotInstalled')
})

const updateStatusClass = computed(() => {
  if (props.updateError) return 'status-error'
  if (props.updateAvailable) return 'status-running'
  if (props.lastCheckedAt) return 'status-not-installed'
  return 'status-stopped'
})

const updateStatusText = computed(() => {
  if (props.updateError) {
    return t('desktop.updateCheck.error', { message: props.updateError })
  }

  if (!props.lastCheckedAt) {
    return t('desktop.updateCheck.notCheckedYet')
  }

  if (props.updateAvailable && props.latestVersion) {
    return t('desktop.updateCheck.updateAvailable', {
      current: props.currentVersion,
      latest: props.latestVersion,
      checkedAt: props.lastCheckedAt,
    })
  }

  return t('desktop.updateCheck.upToDate', {
    current: props.currentVersion,
    checkedAt: props.lastCheckedAt,
  })
})

const opencodeVersionLabel = computed(() => {
  if (!props.opencodeInstalled) return t('desktop.opencodeUpdate.notInstalled')
  if (props.opencodeCurrentVersion) return `v${props.opencodeCurrentVersion}`
  return t('desktop.opencodeUpdate.unknownVersion')
})

const opencodeStatusClass = computed(() => {
  if (props.opencodeUpdateMessage) return 'status-error'
  if (props.opencodeUpdateAvailable) return 'status-running'
  if (props.opencodeLastCheckedAt) return 'status-not-installed'
  return 'status-stopped'
})

const opencodeStatusText = computed(() => {
  if (!props.opencodeInstalled) {
    return t('desktop.opencodeUpdate.notInstalledMessage')
  }
  if (props.opencodeUpdateMessage) {
    return t('desktop.opencodeUpdate.error', { message: props.opencodeUpdateMessage })
  }
  if (!props.opencodeLastCheckedAt) {
    return t('desktop.opencodeUpdate.notCheckedYet')
  }
  if (props.opencodeUpdateAvailable && props.opencodeCurrentVersion && props.opencodeLatestVersion) {
    return t('desktop.opencodeUpdate.updateAvailable', {
      current: props.opencodeCurrentVersion,
      latest: props.opencodeLatestVersion,
      checkedAt: props.opencodeLastCheckedAt,
    })
  }
  return t('desktop.opencodeUpdate.upToDate', {
    current: props.opencodeCurrentVersion || t('desktop.opencodeUpdate.unknownVersion'),
    checkedAt: props.opencodeLastCheckedAt,
  })
})
</script>

<style scoped>
.section-body {
  --surface-soft: #1f1a18;
  --surface-border: #3f3431;
  --text-primary: #ddd1c8;
  --text-muted: #aa9a90;
  --text-subtle: #b8aaa1;
  --accent: #bb8b52;
  --accent-hover: #cf9c61;
  --accent-text: #1a120d;
  --neutral-btn: #3a302c;
  --neutral-btn-border: #5a4a44;
  --state-ok-bg: #2a3a31;
  --state-ok-text: #b9dfc7;
  --state-warn-bg: #4a3722;
  --state-warn-text: #f1cf9a;
  --state-idle-bg: #3b312e;
  --state-idle-text: #c3b4ab;
  --state-error-text: #efb4ae;
  padding: 16px;
}

.hint {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.section-hint {
  margin-top: 0;
  margin-bottom: 10px;
}

.launchd-field {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--surface-soft);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.launchd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.launchd-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.field-help {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.launchd-actions {
  display: flex;
  gap: 8px;
}

.launchd-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.launchd-btn.enable {
  background: var(--accent);
  color: var(--accent-text);
  border: none;
}

.launchd-btn.enable:hover:not(:disabled) {
  background: var(--accent-hover);
}

.launchd-btn.disable {
  background: var(--neutral-btn);
  color: var(--text-primary);
  border: 1px solid var(--neutral-btn-border);
}

.launchd-btn.disable:hover:not(:disabled) {
  background: #4a3d39;
}

.launchd-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.update-field {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--surface-soft);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.update-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.update-version {
  font-size: 12px;
  color: var(--text-subtle);
}

.update-status {
  margin: 0 0 10px;
  font-size: 12px;
}

.status-error {
  color: var(--state-error-text);
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.release-link {
  color: #d8b785;
  font-size: 12px;
  text-decoration: none;
}

.release-link:hover {
  color: #e7c79a;
  text-decoration: underline;
}
</style>
