<template>
  <div class="section-body">
    <SettingsField
      :label="t('server.port.label')"
      type="number"
      :model-value="getNumber('port')"
      @update:model-value="$emit('updateNested', 'port', parseInteger($event))"
      :help="t('server.port.help')"
    />
    <SettingsField
      :label="t('server.hostname.label')"
      type="text"
      :model-value="getString('hostname')"
      @update:model-value="$emit('updateNested', 'hostname', normalizeText($event))"
      :help="t('server.hostname.help')"
    />
    <SettingsField
      :label="t('server.cors.label')"
      type="checkbox"
      :model-value="server.cors === true"
      @update:model-value="$emit('updateNested', 'cors', $event)"
      :help="t('server.cors.help')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsField from './SettingsField.vue'
import type { ServerConfig } from '../../types/settings.js'

const { t } = useI18n()

const props = defineProps<{
  server: ServerConfig
}>()

defineEmits<{
  updateNested: [key: string, value: unknown]
}>()

function getNumber(key: keyof ServerConfig): number | string {
  const value = props.server[key]
  return typeof value === 'number' ? value : ''
}

function getString(key: keyof ServerConfig): string {
  const value = props.server[key]
  return typeof value === 'string' ? value : ''
}

function parseInteger(value: string | number | boolean): number | undefined {
  const parsed = parseInt(String(value), 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

function normalizeText(value: string | number | boolean): string | undefined {
  const text = String(value).trim()
  return text || undefined
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
