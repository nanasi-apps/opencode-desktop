<template>
  <div class="section-body">
    <SettingsField
      :label="t('compaction.auto.label')"
      type="checkbox"
      :model-value="compaction.auto === true"
      @update:model-value="$emit('updateNested', 'auto', $event)"
      :help="t('compaction.auto.help')"
    />
    <SettingsField
      :label="t('compaction.prune.label')"
      type="checkbox"
      :model-value="compaction.prune === true"
      @update:model-value="$emit('updateNested', 'prune', $event)"
      :help="t('compaction.prune.help')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsField from './SettingsField.vue'
import type { CompactionConfig } from '../../types/settings.js'

const { t } = useI18n()

defineProps<{
  compaction: CompactionConfig
}>()

defineEmits<{
  updateNested: [key: string, value: unknown]
}>()
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
