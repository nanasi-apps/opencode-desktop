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
        <OmoField
          v-for="(field, index) in displayFields"
          :key="`${name}-${field.key}-${index}`"
          :field="field"
          :available-models="availableModels"
          :model-value="getAgentValue(name, field.key)"
          @update:model-value="$emit('updateField', name, field.key, $event)"
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import OmoField from '../OmoField.vue'
import SettingsCard from './SettingsCard.vue'
import AddItemInput from './AddItemInput.vue'
import type { AgentsConfig, CollapsedState, OmoSchemaField } from '../../types/settings.js'

const { t } = useI18n()

const props = defineProps<{
  agents: AgentsConfig
  agentNames: string[]
  builtinAgents: string[]
  availableModels: string[]
  schemaFields: OmoSchemaField[]
  collapsedState: CollapsedState
  itemAnchorIds?: Record<string, string>
}>()

const emit = defineEmits<{
  add: [name: string]
  remove: [name: string]
  updateField: [name: string, field: string, value: unknown]
  updateCollapsed: [state: CollapsedState]
}>()

const VARIANT_OPTIONS = ['', 'low', 'medium', 'high', 'xhigh', 'max']

const fallbackFields: OmoSchemaField[] = [
  { key: 'model', label: 'Model', type: 'string', description: '' },
  { key: 'temperature', label: 'Temperature', type: 'number', description: '' },
  { key: 'steps', label: 'Steps', type: 'number', description: '' },
]

const displayFields = computed<OmoSchemaField[]>(() => {
  const base = props.schemaFields.length > 0 ? props.schemaFields : fallbackFields
  return base.map((field) => {
    if (field.key === 'variant') {
      return { ...field, type: 'enum', options: VARIANT_OPTIONS }
    }
    return field
  })
})

const newAgentName = ref('')

function isCollapsed(name: string): boolean {
  return props.collapsedState[name] !== false
}

function toggleCollapsed(name: string) {
  emit('updateCollapsed', { ...props.collapsedState, [name]: !isCollapsed(name) })
}

function getAgentValue(name: string, field: string): unknown {
  return props.agents[name]?.[field]
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
