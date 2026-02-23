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
        <div v-if="(srv as McpServerConfig)?.type !== 'remote'" class="field command-field">
          <label>{{ t('mcp.command.label') }}</label>
          <div class="field-control">
            <div
              v-for="(row, rowIndex) in getCommandRows(name as string, srv as McpServerConfig)"
              :key="row.id"
              class="command-row"
            >
              <input
                type="text"
                :value="row.value"
                :placeholder="t('mcp.command.argPlaceholder', { index: rowIndex })"
                @input="updateCommandRow(name as string, rowIndex, ($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="command-row-remove"
                :aria-label="t('mcp.command.removeArg')"
                @click="removeCommandRow(name as string, rowIndex)"
              >
                <IconX :size="14" stroke-width="2" />
              </button>
            </div>

            <button type="button" class="command-add-btn" @click="addCommandRow(name as string)">
              <IconPlus :size="14" stroke-width="2" />
              {{ t('mcp.command.addArg') }}
            </button>
            <p class="field-help">{{ t('mcp.command.help') }}</p>
          </div>
        </div>
        <div v-if="(srv as McpServerConfig)?.type !== 'remote'" class="field environment-field">
          <label>{{ t('mcp.environment.label') }}</label>
          <div class="field-control">
            <div
              v-for="(row, rowIndex) in getEnvironmentRows(name as string, srv as McpServerConfig)"
              :key="row.id"
              class="header-row"
            >
              <input
                type="text"
                :value="row.key"
                :placeholder="t('mcp.environment.keyPlaceholder')"
                @input="updateEnvironmentRow(name as string, rowIndex, 'key', ($event.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                :value="row.value"
                :placeholder="t('mcp.environment.valuePlaceholder')"
                @input="updateEnvironmentRow(name as string, rowIndex, 'value', ($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="header-row-remove"
                :aria-label="t('mcp.environment.removeRow')"
                @click="removeEnvironmentRow(name as string, rowIndex)"
              >
                <IconX :size="14" stroke-width="2" />
              </button>
            </div>

            <button type="button" class="header-add-btn" @click="addEnvironmentRow(name as string)">
              <IconPlus :size="14" stroke-width="2" />
              {{ t('mcp.environment.addRow') }}
            </button>

            <p class="field-help">{{ t('mcp.environment.help') }}</p>
          </div>
        </div>
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

interface EnvironmentRow {
  id: string
  key: string
  value: string
}

interface CommandRow {
  id: string
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
const commandRowsByServer = ref<Record<string, CommandRow[]>>({})
const environmentRowsByServer = ref<Record<string, EnvironmentRow[]>>({})

function addMcp() {
  const name = newMcpName.value.trim()
  if (!name) return
  emit('add', name)
  newMcpName.value = ''
}

function getItemAnchorId(name: string): string | undefined {
  return props.itemAnchorIds?.[name]
}

function createHeaderRow(key = '', value = ''): HeaderRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    key,
    value
  }
}

function createEnvironmentRow(key = '', value = ''): EnvironmentRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    key,
    value,
  }
}

function createCommandRow(value = ''): CommandRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    value,
  }
}

function splitCommandInput(value: string): string[] {
  const input = value.trim()
  if (!input) return []
  const parts: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaped = false

  for (const char of input) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (quote) {
      if (char === quote) {
        quote = null
      } else {
        current += char
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (/\s/.test(char)) {
      if (current) {
        parts.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (escaped) {
    current += '\\'
  }
  if (current) {
    parts.push(current)
  }

  return parts
}

function normalizeCommand(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return splitCommandInput(value)
  }

  return []
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

function getCommandRows(name: string, server: McpServerConfig): CommandRow[] {
  const existing = commandRowsByServer.value[name]
  if (existing) return existing

  const rows = normalizeCommand(server.command).map((token) => createCommandRow(token))
  commandRowsByServer.value[name] = rows.length > 0 ? rows : [createCommandRow()]
  return commandRowsByServer.value[name]
}

function syncCommandRows(name: string) {
  const rows = commandRowsByServer.value[name] ?? []
  const next = rows
    .map((row) => row.value.trim())
    .filter(Boolean)
  emit('updateField', name, 'command', next.length > 0 ? next : undefined)
}

function updateCommandRow(name: string, rowIndex: number, value: string) {
  const rows = commandRowsByServer.value[name]
  if (!rows || !rows[rowIndex]) return

  const parsed = splitCommandInput(value)
  if (parsed.length > 1) {
    rows.splice(rowIndex, 1, ...parsed.map((token) => createCommandRow(token)))
  } else {
    rows[rowIndex].value = value
  }

  syncCommandRows(name)
}

function addCommandRow(name: string) {
  const rows = commandRowsByServer.value[name] ?? []
  rows.push(createCommandRow())
  commandRowsByServer.value[name] = rows
}

function removeCommandRow(name: string, rowIndex: number) {
  const rows = commandRowsByServer.value[name]
  if (!rows) return
  rows.splice(rowIndex, 1)
  if (rows.length === 0) rows.push(createCommandRow())
  syncCommandRows(name)
}

function getEnvironmentRows(name: string, server: McpServerConfig): EnvironmentRow[] {
  const existing = environmentRowsByServer.value[name]
  if (existing) return existing

  const environment = server.environment
  const rows =
    environment && typeof environment === 'object' && !Array.isArray(environment)
      ? Object.entries(environment)
          .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
          .map(([key, value]) => createEnvironmentRow(key, String(value)))
      : []

  environmentRowsByServer.value[name] = rows.length > 0 ? rows : [createEnvironmentRow()]
  return environmentRowsByServer.value[name]
}

function syncEnvironmentRows(name: string) {
  const rows = environmentRowsByServer.value[name] ?? []
  const parsed = rows.reduce<Record<string, string>>((map, row) => {
    const key = row.key.trim()
    if (!key) return map
    map[key] = row.value
    return map
  }, {})
  emit('updateField', name, 'environment', Object.keys(parsed).length > 0 ? parsed : undefined)
}

function updateEnvironmentRow(name: string, rowIndex: number, field: 'key' | 'value', value: string) {
  const rows = environmentRowsByServer.value[name]
  if (!rows || !rows[rowIndex]) return
  rows[rowIndex][field] = value
  syncEnvironmentRows(name)
}

function addEnvironmentRow(name: string) {
  const rows = environmentRowsByServer.value[name] ?? []
  rows.push(createEnvironmentRow())
  environmentRowsByServer.value[name] = rows
}

function removeEnvironmentRow(name: string, rowIndex: number) {
  const rows = environmentRowsByServer.value[name]
  if (!rows) return
  rows.splice(rowIndex, 1)
  if (rows.length === 0) rows.push(createEnvironmentRow())
  syncEnvironmentRows(name)
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

.command-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.header-row input,
.command-row input {
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

.header-row input:focus,
.command-row input:focus {
  border-color: #3b82f6;
}

.header-row-remove,
.header-add-btn,
.command-row-remove,
.command-add-btn {
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
.header-add-btn:hover,
.command-row-remove:hover,
.command-add-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.header-add-btn,
.command-add-btn {
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
