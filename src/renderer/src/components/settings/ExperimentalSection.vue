<template>
  <div class="section-body">
    <OmoField
      v-for="field in schemaFields"
      :key="field.key"
      :field="field"
      :model-value="getValue(field.key)"
      @update:model-value="emit('updateNested', field.key, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import OmoField from '../OmoField.vue'
import type { ExperimentalConfig, OmoSchemaField } from '../../types/settings.js'

const props = defineProps<{
  experimental: ExperimentalConfig
  schemaFields: OmoSchemaField[]
}>()

const emit = defineEmits<{
  updateNested: [key: string, value: unknown]
}>()

function getValue(key: string): unknown {
  return (props.experimental as Record<string, unknown>)[key]
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
