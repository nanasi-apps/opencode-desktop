<template>
  <div class="section-body">
    <div v-for="(srv, name) in mcpServers" :key="name" :id="getItemAnchorId(name as string)">
      <SettingsCard
        :title="name"
        removable
        @remove="$emit('remove', name as string)"
      >
        <SettingsField
          :label="t('mcp.enabled.label')"
          type="checkbox"
          :model-value="(srv as McpServerConfig)?.enabled !== false"
          @update:model-value="$emit('updateField', name as string, 'enabled', $event)"
          :help="t('mcp.enabled.help')"
        />
        <SettingsField
          :label="t('mcp.type.label')"
          type="select"
          :model-value="(srv as McpServerConfig)?.type ?? 'local'"
          @update:model-value="$emit('updateField', name as string, 'type', $event)"
          :options="['local', 'remote']"
          :help="t('mcp.type.help')"
        />
        <SettingsField
          v-if="(srv as McpServerConfig)?.type !== 'remote'"
          :label="t('mcp.command.label')"
          type="textarea"
          :rows="3"
          :model-value="getCommandValue(srv as McpServerConfig)"
          @update:model-value="updateCommandValue(name as string, $event)"
          :help="t('mcp.command.help')"
        />
        <SettingsField
          v-if="(srv as McpServerConfig)?.type !== 'remote'"
          :label="t('mcp.environment.label')"
          type="textarea"
          :rows="4"
          :model-value="getKeyValueText(srv as McpServerConfig, 'environment')"
          @update:model-value="updateKeyValueText(name as string, 'environment', $event)"
          :help="t('mcp.environment.help')"
        />
        <SettingsField
          v-else
          :label="t('mcp.url.label')"
          type="text"
          :model-value="(srv as McpServerConfig)?.url ?? ''"
          @update:model-value="$emit('updateField', name as string, 'url', $event)"
          placeholder="https://..."
          :help="t('mcp.url.help')"
        />
        <div v-if="(srv as McpServerConfig)?.type === 'remote'" class="field headers-field">
          <label>{{ t('mcp.headers.label') }}</label>
          <div class="field-control">
            <div
              v-for="(row, rowIndex) in getHeaderRows(name as string, srv as McpServerConfig)"
              :key="row.id"
              class="header-row"
            >
              <input
                type="text"
                :value="row.key"
                :placeholder="t('mcp.headers.keyPlaceholder')"
                @input="updateHeaderRow(name as string, rowIndex, 'key', ($event.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                :value="row.value"
                :placeholder="t('mcp.headers.valuePlaceholder')"
                @input="updateHeaderRow(name as string, rowIndex, 'value', ($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="header-row-remove"
                :aria-label="t('mcp.headers.removeRow')"
                @click="removeHeaderRow(name as string, rowIndex)"
              >
                <IconX :size="14" stroke-width="2" />
              </button>
            </div>

            <button type="button" class="header-add-btn" @click="addHeaderRow(name as string)">
              <IconPlus :size="14" stroke-width="2" />
              {{ t('mcp.headers.addRow') }}
            </button>

            <p class="field-help">{{ t('mcp.headers.help') }}</p>
          </div>
        </div>
        <SettingsField
          :label="t('mcp.timeout.label')"
          type="number"
          :model-value="getTimeoutValue(srv as McpServerConfig)"
          @update:model-value="updateTimeoutValue(name as string, $event)"
          :help="t('mcp.timeout.help')"
          :min="100"
          :step="100"
        />
      </SettingsCard>
    </div>

    <AddItemInput
      v-model="newMcpName"
      :placeholder="t('mcp.add.placeholder')"
      :button-text="t('mcp.add.button')"
      @add="addMcp"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconPlus, IconX } from '@tabler/icons-vue'
import SettingsCard from './SettingsCard.vue'
import SettingsField from './SettingsField.vue'
import AddItemInput from './AddItemInput.vue'
import type { McpServersConfig, McpServerConfig } from '../../types/settings.js'

interface HeaderRow {
  id: string
  key: string
  value: string
}

const { t } = useI18n()

const props = defineProps<{
  mcpServers: McpServersConfig
  itemAnchorIds?: Record<string, string>
}>()

const emit = defineEmits<{
  add: [name: string]
  remove: [name: string]
  updateField: [name: string, key: string, value: unknown]
}>()

const newMcpName = ref('')
const headerRowsByServer = ref<Record<string, HeaderRow[]>>({})

function addMcp() {
  const name = newMcpName.value.trim()
  if (!name) return
  emit('add', name)
  newMcpName.value = ''
}

function getItemAnchorId(name: string): string | undefined {
  return props.itemAnchorIds?.[name]
}

function parseNonEmptyLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseKeyValueLines(value: string): Record<string, string> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((map, line) => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex <= 0) return map
      const key = line.slice(0, separatorIndex).trim()
      if (!key) return map
      const rawValue = line.slice(separatorIndex + 1)
      map[key] = rawValue
      return map
    }, {})
}

function createHeaderRow(key = '', value = ''): HeaderRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    key,
    value
  }
}

function getHeaderRows(name: string, server: McpServerConfig): HeaderRow[] {
  const existing = headerRowsByServer.value[name]
  if (existing) return existing

  const headers = server.headers
  const rows =
    headers && typeof headers === 'object' && !Array.isArray(headers)
      ? Object.entries(headers)
          .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
          .map(([key, value]) => createHeaderRow(key, String(value)))
      : []

  headerRowsByServer.value[name] = rows.length > 0 ? rows : [createHeaderRow()]
  return headerRowsByServer.value[name]
}

function syncHeaderRows(name: string) {
  const rows = headerRowsByServer.value[name] ?? []
  const parsed = rows.reduce<Record<string, string>>((map, row) => {
    const key = row.key.trim()
    if (!key) return map
    map[key] = row.value
    return map
  }, {})
  emit('updateField', name, 'headers', Object.keys(parsed).length > 0 ? parsed : undefined)
}

function updateHeaderRow(name: string, rowIndex: number, field: 'key' | 'value', value: string) {
  const rows = headerRowsByServer.value[name]
  if (!rows || !rows[rowIndex]) return
  rows[rowIndex][field] = value
  syncHeaderRows(name)
}

function addHeaderRow(name: string) {
  const rows = headerRowsByServer.value[name] ?? []
  rows.push(createHeaderRow())
  headerRowsByServer.value[name] = rows
}

function removeHeaderRow(name: string, rowIndex: number) {
  const rows = headerRowsByServer.value[name]
  if (!rows) return
  rows.splice(rowIndex, 1)
  if (rows.length === 0) rows.push(createHeaderRow())
  syncHeaderRows(name)
}

function getCommandValue(server: McpServerConfig): string {
  const command = server.command
  if (Array.isArray(command)) {
    return command.join('\n')
  }
  if (typeof command === 'string') {
    return command
  }
  return ''
}

function updateCommandValue(name: string, value: unknown) {
  const next = typeof value === 'string' ? parseNonEmptyLines(value) : []
  emit('updateField', name, 'command', next.length > 0 ? next : undefined)
}

function getKeyValueText(server: McpServerConfig, field: 'environment' | 'headers'): string {
  const source = server[field]
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return ''
  }
  return Object.entries(source)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n')
}

function updateKeyValueText(name: string, field: 'environment' | 'headers', value: unknown) {
  const parsed = typeof value === 'string' ? parseKeyValueLines(value) : {}
  emit('updateField', name, field, Object.keys(parsed).length > 0 ? parsed : undefined)
}

function getTimeoutValue(server: McpServerConfig): number | string {
  return typeof server.timeout === 'number' ? server.timeout : ''
}

function updateTimeoutValue(name: string, value: unknown) {
  if (typeof value !== 'string') {
    emit('updateField', name, 'timeout', undefined)
    return
  }
  const trimmed = value.trim()
  if (!trimmed) {
    emit('updateField', name, 'timeout', undefined)
    return
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    emit('updateField', name, 'timeout', undefined)
    return
  }
  emit('updateField', name, 'timeout', Math.floor(parsed))
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

.header-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
}

.header-row input {
  background: #1a1514;
  border: 1px solid #4f433f;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f5efea;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.header-row input:focus {
  border-color: #3b82f6;
}

.header-row-remove,
.header-add-btn {
  background: none;
  border: 1px dashed #4f433f;
  border-radius: 6px;
  color: #8d7d73;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.header-row-remove:hover,
.header-add-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.header-add-btn {
  width: fit-content;
}

.field-help {
  margin: 0;
  color: #aa9a90;
  font-size: 12px;
  line-height: 1.35;
}

@media (max-width: 768px) {
  .header-row {
    grid-template-columns: 1fr;
  }

  .header-row-remove {
    justify-self: flex-start;
  }
}
</style>
