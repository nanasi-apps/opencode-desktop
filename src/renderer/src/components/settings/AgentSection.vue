<template>
  <div class="section-body">
    <div v-for="name in agentNames" :key="name" :id="getAgentAnchorId(name)" :data-anchor-label="name">
      <SettingsCard
        :title="name"
        collapsible
        :collapsed="isCollapsed(name)"
        :removable="!builtinAgents.includes(name)"
        @toggle="toggleCollapsed(name)"
        @remove="$emit('remove', name)"
      >
        <SettingsField
          :label="t('agent.model.label')"
          type="text"
          :model-value="getAgentValue(name, 'model')"
          @update:model-value="$emit('updateField', name, 'model', $event as string)"
          :help="t('agent.model.help')"
        />
        <SettingsField
          :label="t('agent.temperature.label')"
          type="number"
          :model-value="getAgentValue(name, 'temperature')"
          @update:model-value="$emit('updateField', name, 'temperature', parseNumber($event))"
          :min="0"
          :max="2"
          :step="0.1"
          :help="t('agent.temperature.help')"
        />
        <SettingsField
          :label="t('agent.steps.label')"
          type="number"
          :model-value="getAgentValue(name, 'steps')"
          @update:model-value="$emit('updateField', name, 'steps', parseInteger($event))"
          :min="1"
          :help="t('agent.steps.help')"
        />
      </SettingsCard>
    </div>

    <AddItemInput
      v-model="newAgentName"
      :placeholder="t('agent.add.placeholder')"
      :button-text="t('agent.add.button')"
      @add="addAgent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsCard from './SettingsCard.vue'
import SettingsField from './SettingsField.vue'
import AddItemInput from './AddItemInput.vue'
import type { AgentsConfig, CollapsedState } from '../../types/settings.js'

const { t } = useI18n()

const props = defineProps<{
  agents: AgentsConfig
  agentNames: string[]
  builtinAgents: string[]
  collapsedState: CollapsedState
  itemAnchorIds?: Record<string, string>
}>()

const emit = defineEmits<{
  add: [name: string]
  remove: [name: string]
  updateField: [name: string, field: string, value: unknown]
  updateCollapsed: [state: CollapsedState]
}>()

const newAgentName = ref('')

function isCollapsed(name: string): boolean {
  return props.collapsedState[name] !== false
}

function toggleCollapsed(name: string) {
  emit('updateCollapsed', { ...props.collapsedState, [name]: !isCollapsed(name) })
}

function getAgentValue(name: string, field: string): string | number {
  const value = props.agents[name]?.[field]
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  return ''
}

function parseNumber(value: string | number | boolean): number | undefined {
  const raw = String(value)
  const parsed = parseFloat(raw)
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseInteger(value: string | number | boolean): number | undefined {
  const raw = String(value)
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

function addAgent() {
  const name = newAgentName.value.trim()
  if (!name) return
  emit('add', name)
  newAgentName.value = ''
}

function getAgentAnchorId(name: string): string | undefined {
  return props.itemAnchorIds?.[name] ?? buildAgentAnchorId(name)
}

function buildAgentAnchorId(name: string): string {
  const trimmed = name.trim()
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const stableKey = encodeURIComponent(trimmed).replace(/%/g, '_')
  return `anchor-agent-${normalized || 'item'}-${stableKey || 'empty'}`
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
