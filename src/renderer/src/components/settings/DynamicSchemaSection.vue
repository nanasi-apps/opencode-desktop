<template>
  <div class="section-body">
    <template v-if="isLoading">
      <div class="loading">{{ t('common.loading') }}</div>
    </template>

    <template v-else-if="schemaError">
      <div class="error">{{ schemaError }}</div>
    </template>

    <template v-else>
      <SchemaField
        v-for="field in fields"
        :key="field.key"
        :field="field"
        :model-value="getFieldValue(field.key)"
        @update:model-value="updateFieldValue(field.key, $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SchemaField from '../SchemaField.vue'
import type { SchemaField as SchemaFieldType } from '../../composables/useSchemaParser.js'

const { t } = useI18n()

const props = defineProps<{
  fields: SchemaFieldType[]
  values: Record<string, unknown>
  isLoading?: boolean
  schemaError?: string
}>()

const emit = defineEmits<{
  update: [key: string, value: unknown]
}>()

function getFieldValue(key: string): unknown {
  return props.values[key]
}

function updateFieldValue(key: string, value: unknown) {
  emit('update', key, value)
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}

.loading,
.error {
  padding: 16px;
  text-align: center;
  color: #aa9a90;
}

.error {
  color: #ef4444;
  margin-bottom: 16px;
}
</style>
