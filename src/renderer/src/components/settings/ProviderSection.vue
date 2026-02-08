<template>
  <div class="section-body">
    <div v-for="(prov, name) in providers" :key="name" :id="getItemAnchorId(name as string)">
      <SettingsCard
        :title="name"
        collapsible
        :collapsed="isCollapsed(name as string)"
        removable
        @toggle="toggleCollapsed(name as string)"
        @remove="$emit('remove', name as string)"
      >
        <SettingsField
          :label="t('provider.apiKey.label')"
          type="password"
          :model-value="getProviderValue(prov, 'options.apiKey')"
          @update:model-value="$emit('updateField', name as string, 'options.apiKey', $event)"
          :help="t('provider.apiKey.help')"
        />
        <SettingsField
          :label="t('provider.baseUrl.label')"
          type="text"
          :model-value="getProviderValue(prov, 'options.baseURL')"
          @update:model-value="$emit('updateField', name as string, 'options.baseURL', $event)"
          placeholder="https://..."
          :help="t('provider.baseUrl.help')"
        />
        <SettingsField
          :label="t('provider.models.label')"
          type="textarea"
          :model-value="getModelsValue(prov)"
          @update:model-value="$emit('updateModels', name as string, ($event as string).split('\n').filter(Boolean))"
          :rows="3"
          :help="t('provider.models.help')"
        />
      </SettingsCard>
    </div>

    <AddItemInput
      v-model="newProviderName"
      :placeholder="t('provider.add.placeholder')"
      :button-text="t('provider.add.button')"
      @add="addProvider"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsCard from './SettingsCard.vue'
import SettingsField from './SettingsField.vue'
import AddItemInput from './AddItemInput.vue'
import type { ProvidersConfig, CollapsedState } from '../../types/settings.js'

const { t } = useI18n()

const props = defineProps<{
  providers: ProvidersConfig
  collapsedState: CollapsedState
  itemAnchorIds?: Record<string, string>
}>()

const emit = defineEmits<{
  add: [name: string]
  remove: [name: string]
  updateField: [name: string, path: string, value: string]
  updateModels: [name: string, models: string[]]
  updateCollapsed: [state: CollapsedState]
}>()

const newProviderName = ref('')

function isCollapsed(name: string): boolean {
  return props.collapsedState[name] !== false
}

function toggleCollapsed(name: string) {
  const newState = { ...props.collapsedState, [name]: !isCollapsed(name) }
  emit('updateCollapsed', newState)
}

function getProviderValue(prov: unknown, path: string): string {
  if (typeof prov !== 'object' || prov === null) return ''
  const parts = path.split('.')
  let current: unknown = prov
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return ''
    }
  }
  return typeof current === 'string' ? current : ''
}

function getModelsValue(prov: unknown): string {
  if (typeof prov !== 'object' || prov === null) return ''
  const models = (prov as { models?: string[] }).models
  if (!Array.isArray(models)) return ''
  return models.join('\n')
}

function addProvider() {
  const name = newProviderName.value.trim()
  if (!name) return
  emit('add', name)
  newProviderName.value = ''
}

function getItemAnchorId(name: string): string | undefined {
  return props.itemAnchorIds?.[name]
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}
</style>
