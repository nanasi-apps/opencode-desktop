<template>
  <div class="section-body">
    <div class="field" v-for="field in permissionFields" :key="field.key">
      <label>{{ field.label || field.key }}</label>
      <div class="field-control">
        <select :value="getValue(field.key)" @change="$emit('updatePermission', field.key, ($event.target as HTMLSelectElement).value)">
          <option value="">{{ t('common.permission.default') }}</option>
          <option v-for="option in getOptions(field)" :key="`${field.key}-${option}`" :value="option">
            {{ getOptionLabel(option) }}
          </option>
        </select>
        <p class="field-help">{{ field.description || getDescription(field.key) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OmoSchemaField, PermissionsConfig } from '../../types/settings.js'

const props = defineProps<{
  permissions: PermissionsConfig
  schemaFields: OmoSchemaField[]
}>()

defineEmits<{
  updatePermission: [tool: string, value: string]
}>()

const { t } = useI18n()

const fallbackTools = ['read', 'edit', 'bash', 'glob', 'grep', 'fetch', 'mcp', 'task']

const permissionFields = computed<OmoSchemaField[]>(() => {
  if (props.schemaFields.length > 0) return props.schemaFields
  return fallbackTools.map((key) => ({
    key,
    label: key,
    type: 'enum',
    description: '',
    options: ['ask', 'allow', 'deny'],
  }))
})

const permissionDescriptions = computed<Record<string, string>>(() => ({
  read: t('permission.descriptions.read'),
  edit: t('permission.descriptions.edit'),
  bash: t('permission.descriptions.bash'),
  glob: t('permission.descriptions.glob'),
  grep: t('permission.descriptions.grep'),
  fetch: t('permission.descriptions.fetch'),
  mcp: t('permission.descriptions.mcp'),
  task: t('permission.descriptions.task'),
}))

function getValue(tool: string): string {
  return props.permissions[tool] ?? ''
}

function getDescription(tool: string): string {
  return permissionDescriptions.value[tool] ?? t('permission.descriptions.fallback')
}

function getOptions(field: OmoSchemaField): string[] {
  return Array.isArray(field.options) && field.options.length > 0
    ? field.options
    : ['ask', 'allow', 'deny']
}

function getOptionLabel(option: string): string {
  if (option === 'ask') return t('common.permission.ask')
  if (option === 'allow') return t('common.permission.allow')
  if (option === 'deny') return t('common.permission.deny')
  return option
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}

.field {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.field:last-child {
  margin-bottom: 0;
}

.field label {
  width: 160px;
  flex-shrink: 0;
  font-size: 13px;
  color: #b8aaa1;
  padding-top: 8px;
}

.field-control {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

select {
  background: #1a1514;
  border: 1px solid #4f433f;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f5efea;
  font-size: 13px;
  outline: none;
}

select:focus {
  border-color: #3b82f6;
}

.field-help {
  margin: 0;
  color: #aa9a90;
  font-size: 12px;
  line-height: 1.35;
}
</style>
