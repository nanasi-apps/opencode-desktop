<template>
  <div class="section-body">
    <SettingsField
      v-for="field in experimentalFields"
      :key="field.key"
      :label="field.label"
      type="checkbox"
      :model-value="experimental[field.key] === true"
      @update:model-value="$emit('updateNested', field.key, $event)"
      :help="field.description"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsField from './SettingsField.vue'
import type { ExperimentalConfig, ExperimentalField } from '../../types/settings.js'

defineProps<{
  experimental: ExperimentalConfig
}>()

defineEmits<{
  updateNested: [key: string, value: unknown]
}>()

const { t } = useI18n()

const experimentalFields = computed<ExperimentalField[]>(() => [
  { key: 'disable_paste_summary', label: t('experimental.disablePasteSummary.label'), description: t('experimental.disablePasteSummary.help') },
  { key: 'batch_tool', label: t('experimental.batchTool.label'), description: t('experimental.batchTool.help') },
  { key: 'continue_loop_on_deny', label: t('experimental.continueLoopOnDeny.label'), description: t('experimental.continueLoopOnDeny.help') },
])
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
