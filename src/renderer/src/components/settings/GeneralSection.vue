<template>
  <div class="section-body">
    <SettingsField
      v-for="field in generalFields"
      :key="field.key"
      :label="field.label"
      :type="field.type || 'text'"
      :model-value="getValue(field.key)"
      @update:model-value="setValue(field.key, $event as string)"
      :placeholder="field.placeholder"
      :help="field.description"
      :options="field.options"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsField from './SettingsField.vue'
import type { OpencodeConfig, GeneralField } from '../../types/settings.js'

const props = defineProps<{
  config: OpencodeConfig
}>()

const emit = defineEmits<{
  update: [key: string, value: string]
}>()

const { t } = useI18n()

const generalFields = computed<GeneralField[]>(() => [
  { key: 'theme', label: t('general.theme.label'), placeholder: t('general.theme.placeholder'), description: t('general.theme.description') },
  { key: 'model', label: t('general.defaultModel.label'), placeholder: t('general.defaultModel.placeholder'), description: t('general.defaultModel.description') },
  { key: 'small_model', label: t('general.smallModel.label'), placeholder: t('general.smallModel.placeholder'), description: t('general.smallModel.description') },
  { key: 'default_agent', label: t('general.defaultAgent.label'), placeholder: t('general.defaultAgent.placeholder'), description: t('general.defaultAgent.description') },
  { key: 'username', label: t('general.username.label'), placeholder: t('general.username.placeholder'), description: t('general.username.description') },
  { key: 'logLevel', label: t('general.logLevel.label'), type: 'select', options: ['', 'error', 'warn', 'info', 'debug'], description: t('general.logLevel.description') },
])

function getValue(key: string): string {
  const value = props.config[key]
  return typeof value === 'string' ? value : ''
}

function setValue(key: string, value: string) {
  emit('update', key, value)
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
