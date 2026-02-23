<template>
  <div class="section-body">
    <OmoField
      v-for="field in schemaFields"
      :key="field.key"
      :field="field"
      :available-models="availableModels"
      :model-value="getValue(field.key)"
      @update:model-value="emit('update', field.key, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import OmoField from '../OmoField.vue'
import type { OpencodeConfig, OmoSchemaField } from '../../types/settings.js'

const props = defineProps<{
  config: OpencodeConfig
  availableModels: string[]
  schemaFields: OmoSchemaField[]
}>()

const emit = defineEmits<{
  update: [key: string, value: unknown]
}>()

function getValue(key: string): unknown {
  return (props.config as Record<string, unknown>)[key]
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
