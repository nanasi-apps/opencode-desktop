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
        <SettingsField
          v-if="(srv as McpServerConfig)?.type === 'remote'"
          :label="t('mcp.headers.label')"
          type="textarea"
          :rows="4"
          :model-value="getKeyValueText(srv as McpServerConfig, 'headers')"
          @update:model-value="updateKeyValueText(name as string, 'headers', $event)"
          :help="t('mcp.headers.help')"
        />
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
import SettingsCard from './SettingsCard.vue'
import SettingsField from './SettingsField.vue'
import AddItemInput from './AddItemInput.vue'
import type { McpServersConfig, McpServerConfig } from '../../types/settings.js'

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
</style>
