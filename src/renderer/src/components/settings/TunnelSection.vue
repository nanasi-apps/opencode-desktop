<template>
  <div class="section-body">
    <p class="hint section-hint">{{ t('tunnel.hint') }}</p>
    <div class="install-row">
      <span v-if="cloudflaredChecking" class="status-checking">{{ t('tunnel.cloudflared.checking') }}</span>
      <span v-else-if="cloudflaredInstalled" class="status-installed">
        {{ t('tunnel.cloudflared.installed', { version: cloudflaredVersion ? ` (${cloudflaredVersion})` : '' }) }}
      </span>
      <span v-else class="status-not-installed">{{ t('tunnel.cloudflared.notInstalled') }}</span>
      <button
        v-if="!cloudflaredInstalled && !cloudflaredChecking && !cloudflaredInstalling"
        class="install-btn"
        @click="$emit('install:cloudflared')"
      >
        {{ t('tunnel.cloudflared.install') }}
      </button>
      <span v-if="cloudflaredInstalling" class="status-checking">{{ t('tunnel.cloudflared.installing') }}</span>
    </div>
    <SettingsField
      :label="t('tunnel.enabled.label')"
      type="checkbox"
      :model-value="tunnelEnabled"
      @update:model-value="$emit('update:tunnelEnabled', Boolean($event))"
      :help="t('tunnel.enabled.help')"
    />

    <div v-if="tunnelEnabled" class="warning-box">
      <p class="warning">{{ t('tunnel.warning') }}</p>
    </div>

    <SettingsField
      v-if="tunnelEnabled"
      :label="t('tunnel.mode.label')"
      type="select"
      :model-value="tunnelMode"
      @update:model-value="$emit('update:tunnelMode', ($event as 'named' | 'quick'))"
      :options="['named', 'quick']"
      :help="t('tunnel.mode.help')"
    />

    <div v-if="tunnelEnabled && tunnelMode === 'quick'" class="quick-host-box">
      <p class="quick-host-label">{{ t('tunnel.quickHost.label') }}</p>
      <p v-if="quickTunnelUrl" class="quick-host-url">{{ quickTunnelUrl }}</p>
      <p v-else-if="tunnelRuntimeError" class="quick-host-error">{{ tunnelRuntimeError }}</p>
      <p v-else class="quick-host-help">
        {{ tunnelRuntimeStatus === 'running'
          ? t('tunnel.quickHost.waitingForHost')
          : t('tunnel.quickHost.hostWillAppear') }}
      </p>
    </div>

    <SettingsField
      v-if="tunnelEnabled && tunnelMode === 'named'"
      :label="t('tunnel.token.label')"
      type="password"
      :model-value="tunnelToken"
      @update:model-value="$emit('update:tunnelToken', String($event))"
      :help="t('tunnel.token.help')"
    />

    <SettingsField
      v-if="tunnelEnabled && tunnelMode === 'named'"
      :label="t('tunnel.hostname.label')"
      type="text"
      :model-value="tunnelHostname"
      @update:model-value="$emit('update:tunnelHostname', String($event))"
      :help="t('tunnel.hostname.help')"
    />

    <SettingsField
      v-if="tunnelEnabled"
      :label="t('tunnel.cloudflaredPath.label')"
      type="text"
      :model-value="tunnelCloudflaredPath"
      @update:model-value="$emit('update:tunnelCloudflaredPath', String($event))"
      :help="t('tunnel.cloudflaredPath.help')"
    />

  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsField from './SettingsField.vue'

const { t } = useI18n()

defineProps<{
  tunnelEnabled: boolean
  tunnelMode: 'named' | 'quick'
  tunnelToken: string
  tunnelHostname: string
  tunnelCloudflaredPath: string
  cloudflaredInstalled: boolean
  cloudflaredChecking: boolean
  cloudflaredInstalling: boolean
  cloudflaredVersion: string
  tunnelRuntimeStatus: 'stopped' | 'starting' | 'running' | 'error'
  quickTunnelUrl: string
  tunnelRuntimeError: string
}>()

defineEmits<{
  'update:tunnelEnabled': [value: boolean]
  'update:tunnelMode': [value: 'named' | 'quick']
  'update:tunnelToken': [value: string]
  'update:tunnelHostname': [value: string]
  'update:tunnelCloudflaredPath': [value: string]
  'install:cloudflared': []
}>()
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
  margin: 0;
  color: #fca5a5;
  font-size: 12px;
}

.warning-box {
  margin-bottom: 10px;
}

.install-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 12px;
}

.status-installed {
  color: #34d399;
}

.status-not-installed {
  color: #fca5a5;
}

.status-checking {
  color: #aa9a90;
}

.install-btn {
  border: 1px solid #6a5b56;
  background: #4f433f;
  color: #ddd1c8;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.quick-host-box {
  border: 1px solid #3f3431;
  border-radius: 6px;
  background: #181312;
  padding: 10px;
  margin-bottom: 10px;
}

.quick-host-label {
  margin: 0 0 6px;
  color: #b8aaa1;
  font-size: 12px;
}

.quick-host-url {
  margin: 0;
  color: #8ee7c1;
  font-size: 12px;
  word-break: break-all;
}

.quick-host-help {
  margin: 0;
  color: #aa9a90;
  font-size: 12px;
}

.quick-host-error {
  margin: 0;
  color: #fca5a5;
  font-size: 12px;
  word-break: break-word;
}
</style>
