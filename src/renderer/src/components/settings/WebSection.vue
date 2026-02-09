<template>
  <div class="section-body">
    <p class="hint section-hint">{{ t('web.hintTop') }}</p>
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
}>()

defineEmits<{
  'update:webPort': [value: string]
  'update:webHostname': [value: string]
  'update:webMdns': [value: boolean]
  'update:webMdnsDomain': [value: string]
  'update:webCorsOrigins': [value: string]
  'update:webAuthUsername': [value: string]
  'update:webAuthPassword': [value: string]
  'update:webExtraArgs': [value: string]
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
  margin: 8px 0 0;
  color: #fca5a5;
  font-size: 12px;
}
</style>
