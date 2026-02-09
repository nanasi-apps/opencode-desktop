<template>
  <div class="section-body">
    <p class="hint section-hint">{{ t('web.hintTop') }}</p>
    <SettingsField
      :label="t('web.launchAtLogin.label')"
      type="checkbox"
      :model-value="launchAtLogin"
      @update:model-value="$emit('update:launchAtLogin', Boolean($event))"
      :help="t('web.launchAtLogin.help')"
    />
    <div class="launchd-field">
      <div class="launchd-header">
        <span class="field-label">{{ t('web.backgroundService.label') }}</span>
        <span class="launchd-status" :class="launchdStatusClass">{{ launchdStatusText }}</span>
      </div>
      <p class="field-help">{{ t('web.backgroundService.help') }}</p>
      <div class="launchd-actions">
        <button
          v-if="launchdStatus !== 'running'"
          class="launchd-btn enable"
          :disabled="launchdBusy"
          @click="$emit('enable:launchd')"
        >
          {{ launchdBusy ? t('web.backgroundService.enabling') : t('web.backgroundService.enable') }}
        </button>
        <button
          v-else
          class="launchd-btn disable"
          :disabled="launchdBusy"
          @click="$emit('disable:launchd')"
        >
          {{ launchdBusy ? t('web.backgroundService.disabling') : t('web.backgroundService.disable') }}
        </button>
      </div>
    </div>
    <SettingsField
      :label="t('web.port.label')"
      type="number"
      :model-value="webPort"
      @update:model-value="$emit('update:webPort', String($event))"
      :help="t('web.port.help')"
    />
    <SettingsField
      :label="t('web.hostname.label')"
      type="text"
      :model-value="webHostname"
      :disabled="hostnameLocked"
      @update:model-value="$emit('update:webHostname', String($event))"
      :help="hostnameLocked
        ? t('web.hostname.lockedHelp')
        : t('web.hostname.help')"
    />
    <SettingsField
      :label="t('web.mdnsDiscovery.label')"
      type="checkbox"
      :model-value="webMdns"
      @update:model-value="$emit('update:webMdns', Boolean($event))"
      :help="t('web.mdnsDiscovery.help')"
    />
    <SettingsField
      :label="t('web.mdnsDomain.label')"
      type="text"
      :model-value="webMdnsDomain"
      @update:model-value="$emit('update:webMdnsDomain', String($event))"
      :help="t('web.mdnsDomain.help')"
    />
    <SettingsField
      :label="t('web.corsOrigins.label')"
      type="textarea"
      :model-value="webCorsOrigins"
      @update:model-value="$emit('update:webCorsOrigins', String($event))"
      :rows="4"
      :help="t('web.corsOrigins.help')"
    />
    <SettingsField
      :label="t('web.authUsername.label')"
      type="text"
      :model-value="webAuthUsername"
      @update:model-value="$emit('update:webAuthUsername', String($event))"
      :help="t('web.authUsername.help')"
    />
    <SettingsField
      :label="t('web.authPassword.label')"
      type="password"
      :model-value="webAuthPassword"
      @update:model-value="$emit('update:webAuthPassword', String($event))"
      :help="t('web.authPassword.help')"
    />
    <SettingsField
      :label="t('web.extraArgs.label')"
      type="textarea"
      :model-value="webExtraArgs"
      @update:model-value="$emit('update:webExtraArgs', String($event))"
      :rows="4"
      :help="t('web.extraArgs.help')"
    />
    <p class="hint">{{ t('web.hintBottom') }}</p>
    <p v-if="isNetworkExposedWithoutAuth" class="warning">{{ t('web.warningInsecureHostname') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsField from './SettingsField.vue'

const { t } = useI18n()

const props = defineProps<{
  launchAtLogin: boolean
  webPort: string
  webHostname: string
  webMdns: boolean
  webMdnsDomain: string
  webCorsOrigins: string
  webAuthUsername: string
  webAuthPassword: string
  webExtraArgs: string
  isNetworkExposedWithoutAuth: boolean
  hostnameLocked: boolean
  launchdStatus: 'running' | 'stopped' | 'not_installed'
  launchdBusy: boolean
}>()

defineEmits<{
  'update:launchAtLogin': [value: boolean]
  'update:webPort': [value: string]
  'update:webHostname': [value: string]
  'update:webMdns': [value: boolean]
  'update:webMdnsDomain': [value: string]
  'update:webCorsOrigins': [value: string]
  'update:webAuthUsername': [value: string]
  'update:webAuthPassword': [value: string]
  'update:webExtraArgs': [value: string]
  'enable:launchd': []
  'disable:launchd': []
}>()

const launchdStatusClass = computed(() => {
  if (props.launchdStatus === 'running') return 'status-running'
  if (props.launchdStatus === 'stopped') return 'status-stopped'
  return 'status-not-installed'
})

const launchdStatusText = computed(() => {
  if (props.launchdStatus === 'running') return t('web.backgroundService.statusRunning')
  if (props.launchdStatus === 'stopped') return t('web.backgroundService.statusStopped')
  return t('web.backgroundService.statusNotInstalled')
})
</script>

<style scoped>
.section-body {
  padding: 16px;
}

.hint {
  margin: 2px 0 0;
  color: #aa9a90;
  font-size: 12px;
}

.section-hint {
  margin-top: 0;
  margin-bottom: 10px;
}

.warning {
  margin: 8px 0 0;
  color: #fca5a5;
  font-size: 12px;
}

.launchd-field {
  margin-bottom: 16px;
  padding: 12px;
  background: #1f1a18;
  border: 1px solid #3f3431;
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
  color: #ddd1c8;
}

.launchd-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-running {
  background: #166534;
  color: #86efac;
}

.status-stopped {
  background: #713f12;
  color: #fcd34d;
}

.status-not-installed {
  background: #3f3431;
  color: #aa9a90;
}

.field-help {
  margin: 0 0 10px;
  font-size: 12px;
  color: #aa9a90;
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
  background: #3b82f6;
  color: #fff;
  border: none;
}

.launchd-btn.enable:hover:not(:disabled) {
  background: #2563eb;
}

.launchd-btn.disable {
  background: #4f433f;
  color: #ddd1c8;
  border: 1px solid #6a5b56;
}

.launchd-btn.disable:hover:not(:disabled) {
  background: #6a5b56;
}

.launchd-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
