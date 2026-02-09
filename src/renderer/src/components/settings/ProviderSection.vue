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
          :model-value="getProviderString(prov, 'options.apiKey')"
          @update:model-value="updateProviderTextField(name as string, 'options.apiKey', String($event))"
          :help="t('provider.apiKey.help')"
        />
        <SettingsField
          :label="t('provider.baseUrl.label')"
          type="text"
          :model-value="getProviderString(prov, 'options.baseURL')"
          @update:model-value="updateProviderTextField(name as string, 'options.baseURL', String($event))"
          placeholder="https://..."
          :help="t('provider.baseUrl.help')"
        />

        <button class="advanced-toggle-btn" type="button" @click="toggleProviderAdvanced(name as string)">
          {{ isProviderAdvanced(name as string) ? t('provider.advanced.toggleHide') : t('provider.advanced.toggleShow') }}
        </button>

        <div v-if="isProviderAdvanced(name as string)" class="advanced-group">
          <SettingsField
            :label="t('provider.advanced.api')"
            type="text"
            :model-value="getProviderString(prov, 'api')"
            @update:model-value="updateProviderTextField(name as string, 'api', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.name')"
            type="text"
            :model-value="getProviderString(prov, 'name')"
            @update:model-value="updateProviderTextField(name as string, 'name', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.id')"
            type="text"
            :model-value="getProviderString(prov, 'id')"
            @update:model-value="updateProviderTextField(name as string, 'id', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.npm')"
            type="text"
            :model-value="getProviderString(prov, 'npm')"
            @update:model-value="updateProviderTextField(name as string, 'npm', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.env')"
            type="textarea"
            :rows="3"
            :model-value="getProviderLineArrayValue(prov, 'env')"
            @update:model-value="updateProviderLineArrayField(name as string, 'env', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.whitelist')"
            type="textarea"
            :rows="3"
            :model-value="getProviderLineArrayValue(prov, 'whitelist')"
            @update:model-value="updateProviderLineArrayField(name as string, 'whitelist', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.blacklist')"
            type="textarea"
            :rows="3"
            :model-value="getProviderLineArrayValue(prov, 'blacklist')"
            @update:model-value="updateProviderLineArrayField(name as string, 'blacklist', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.enterpriseUrl')"
            type="text"
            :model-value="getProviderString(prov, 'options.enterpriseUrl')"
            @update:model-value="updateProviderTextField(name as string, 'options.enterpriseUrl', String($event))"
          />
          <SettingsField
            :label="t('provider.advanced.setCacheKey')"
            type="checkbox"
            :model-value="getProviderBoolean(prov, 'options.setCacheKey')"
            @update:model-value="updateProviderBooleanField(name as string, 'options.setCacheKey', Boolean($event))"
          />
          <SettingsField
            :label="t('provider.advanced.timeout')"
            type="text"
            :model-value="getProviderTimeoutValue(prov)"
            @update:model-value="updateProviderTimeoutField(name as string, String($event))"
            placeholder="300000 or false"
          />
        </div>

        <div class="models-section">
          <p class="models-section-title">{{ t('provider.models.label') }}</p>

          <div
            v-for="(modelData, modelId) in getModelsObject(prov)"
            :key="modelId"
            :id="getModelAnchorId(name as string, modelId as string)"
            class="model-card"
            :data-anchor-label="getModelDisplayName(modelData, String(modelId))"
          >
            <div class="model-header">
              <button
                class="model-remove-btn"
                :aria-label="t('provider.model.remove')"
                @click="removeModel(name as string, modelId as string)"
              >
                <IconX :size="14" stroke-width="2" />
              </button>
            </div>

            <div class="model-details">
              <SettingsField
                :label="t('provider.model.id')"
                type="text"
                :model-value="String(modelId)"
                @update:model-value="renameModelId(name as string, modelId as string, String($event))"
              />
              <SettingsField
                :label="t('provider.model.name')"
                type="text"
                :model-value="getModelStringValueByPath(modelData, 'name')"
                @update:model-value="updateModelTextField(name as string, modelId as string, 'name', String($event))"
              />

              <div class="model-row">
                <SettingsField
                  :label="t('provider.model.contextLimit')"
                  type="number"
                  :model-value="getModelNumberValueByPath(modelData, 'limit.context')"
                  @update:model-value="updateModelNumberField(name as string, modelId as string, 'limit.context', $event)"
                  class="half-width"
                />
                <SettingsField
                  :label="t('provider.model.outputLimit')"
                  type="number"
                  :model-value="getModelNumberValueByPath(modelData, 'limit.output')"
                  @update:model-value="updateModelNumberField(name as string, modelId as string, 'limit.output', $event)"
                  class="half-width"
                />
              </div>

              <div class="model-row modalities-row">
                <div class="modality-field half-width">
                  <label>{{ t('provider.model.inputModalities') }}</label>
                  <div class="modality-picker">
                    <button
                      v-for="option in modalityOptions"
                      :key="`input-${option}`"
                      type="button"
                      class="modality-tag"
                      :class="{ active: getModelModalitiesArray(modelData, 'input').includes(option) }"
                      @click="toggleModality(name as string, modelId as string, 'input', option, getModelModalitiesArray(modelData, 'input'))"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>
                <div class="modality-field half-width">
                  <label>{{ t('provider.model.outputModalities') }}</label>
                  <div class="modality-picker">
                    <button
                      v-for="option in modalityOptions"
                      :key="`output-${option}`"
                      type="button"
                      class="modality-tag"
                      :class="{ active: getModelModalitiesArray(modelData, 'output').includes(option) }"
                      @click="toggleModality(name as string, modelId as string, 'output', option, getModelModalitiesArray(modelData, 'output'))"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>
              </div>

              <button
                class="advanced-toggle-btn model-advanced-toggle"
                type="button"
                @click="toggleModelAdvanced(name as string, modelId as string)"
              >
                {{ isModelAdvanced(name as string, modelId as string) ? t('provider.model.advanced.toggleHide') : t('provider.model.advanced.toggleShow') }}
              </button>

              <div v-if="isModelAdvanced(name as string, modelId as string)" class="advanced-group model-advanced-group">
                <SettingsField
                  :label="t('provider.model.advanced.idOverride')"
                  type="text"
                  :model-value="getModelStringValueByPath(modelData, 'id')"
                  @update:model-value="updateModelTextField(name as string, modelId as string, 'id', String($event))"
                />
                <SettingsField
                  :label="t('provider.model.advanced.family')"
                  type="text"
                  :model-value="getModelStringValueByPath(modelData, 'family')"
                  @update:model-value="updateModelTextField(name as string, modelId as string, 'family', String($event))"
                />
                <SettingsField
                  :label="t('provider.model.advanced.releaseDate')"
                  type="text"
                  :model-value="getModelStringValueByPath(modelData, 'release_date')"
                  @update:model-value="updateModelTextField(name as string, modelId as string, 'release_date', String($event))"
                  placeholder="YYYY-MM-DD"
                />

                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.limitInput')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'limit.input')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'limit.input', $event)"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.status')"
                    type="select"
                    :model-value="getModelStringValueByPath(modelData, 'status')"
                    :options="['', 'alpha', 'beta', 'deprecated']"
                    @update:model-value="updateModelTextField(name as string, modelId as string, 'status', String($event))"
                    class="half-width"
                  />
                </div>

                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.experimental')"
                    type="checkbox"
                    :model-value="getModelBooleanValueByPath(modelData, 'experimental')"
                    @update:model-value="updateModelBooleanField(name as string, modelId as string, 'experimental', Boolean($event))"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.attachment')"
                    type="checkbox"
                    :model-value="getModelBooleanValueByPath(modelData, 'attachment')"
                    @update:model-value="updateModelBooleanField(name as string, modelId as string, 'attachment', Boolean($event))"
                    class="half-width"
                  />
                </div>

                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.reasoning')"
                    type="checkbox"
                    :model-value="getModelBooleanValueByPath(modelData, 'reasoning')"
                    @update:model-value="updateModelBooleanField(name as string, modelId as string, 'reasoning', Boolean($event))"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.temperature')"
                    type="checkbox"
                    :model-value="getModelBooleanValueByPath(modelData, 'temperature')"
                    @update:model-value="updateModelBooleanField(name as string, modelId as string, 'temperature', Boolean($event))"
                    class="half-width"
                  />
                </div>

                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.toolCall')"
                    type="checkbox"
                    :model-value="getModelBooleanValueByPath(modelData, 'tool_call')"
                    @update:model-value="updateModelBooleanField(name as string, modelId as string, 'tool_call', Boolean($event))"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.interleaved')"
                    type="select"
                    :options="['', 'true', 'object']"
                    :model-value="getModelInterleavedMode(modelData)"
                    @update:model-value="setModelInterleavedMode(name as string, modelId as string, String($event))"
                    class="half-width"
                  />
                </div>

                <SettingsField
                  v-if="getModelInterleavedMode(modelData) === 'object'"
                  :label="t('provider.model.advanced.interleavedField')"
                  type="select"
                  :options="['reasoning_content', 'reasoning_details']"
                  :model-value="getModelInterleavedField(modelData)"
                  @update:model-value="setModelInterleavedField(name as string, modelId as string, String($event))"
                />

                <p class="advanced-subtitle">{{ t('provider.model.advanced.costTitle') }}</p>
                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.input')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.input')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.input', $event)"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.output')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.output')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.output', $event)"
                    class="half-width"
                  />
                </div>
                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.cacheRead')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.cache_read')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.cache_read', $event)"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.cacheWrite')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.cache_write')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.cache_write', $event)"
                    class="half-width"
                  />
                </div>

                <p class="advanced-subtitle">{{ t('provider.model.advanced.costOver200kTitle') }}</p>
                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.input')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.context_over_200k.input')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.context_over_200k.input', $event)"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.output')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.context_over_200k.output')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.context_over_200k.output', $event)"
                    class="half-width"
                  />
                </div>
                <div class="model-row">
                  <SettingsField
                    :label="t('provider.model.advanced.cacheRead')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.context_over_200k.cache_read')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.context_over_200k.cache_read', $event)"
                    class="half-width"
                  />
                  <SettingsField
                    :label="t('provider.model.advanced.cacheWrite')"
                    type="number"
                    :model-value="getModelNumberValueByPath(modelData, 'cost.context_over_200k.cache_write')"
                    @update:model-value="updateModelNumberField(name as string, modelId as string, 'cost.context_over_200k.cache_write', $event)"
                    class="half-width"
                  />
                </div>

                <SettingsField
                  :label="t('provider.model.advanced.headers')"
                  type="textarea"
                  :rows="3"
                  :model-value="getModelKeyValueTextByPath(modelData, 'headers')"
                  @update:model-value="setModelKeyValueField(name as string, modelId as string, 'headers', String($event))"
                />
                <SettingsField
                  :label="t('provider.model.advanced.providerNpmOverride')"
                  type="text"
                  :model-value="getModelStringValueByPath(modelData, 'provider.npm')"
                  @update:model-value="updateModelTextField(name as string, modelId as string, 'provider.npm', String($event))"
                />
                <SettingsField
                  :label="t('provider.model.advanced.optionsJson')"
                  type="textarea"
                  :rows="4"
                  :model-value="getModelJsonFieldText(modelData, 'options')"
                  @update:model-value="setModelJsonField(name as string, modelId as string, 'options', String($event))"
                />
                <SettingsField
                  :label="t('provider.model.advanced.variantsJson')"
                  type="textarea"
                  :rows="4"
                  :model-value="getModelJsonFieldText(modelData, 'variants')"
                  @update:model-value="setModelJsonField(name as string, modelId as string, 'variants', String($event))"
                />
              </div>
            </div>
          </div>

          <div class="add-model-container">
            <button class="add-model-btn" @click="addNewEmptyModel(name as string)">
              <IconPlus :size="14" stroke-width="2" />
              {{ t('provider.model.add.button') }}
            </button>
          </div>
        </div>
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
import { IconX, IconPlus } from '@tabler/icons-vue'
import SettingsCard from './SettingsCard.vue'
import SettingsField from './SettingsField.vue'
import AddItemInput from './AddItemInput.vue'
import type { ProvidersConfig, CollapsedState } from '../../types/settings.js'

interface ModelConfig {
  [key: string]: unknown
}

const { t } = useI18n()

const props = defineProps<{
  providers: ProvidersConfig
  collapsedState: CollapsedState
  itemAnchorIds?: Record<string, string>
}>()

const emit = defineEmits<{
  add: [name: string]
  remove: [name: string]
  updateField: [name: string, path: string, value: unknown]
  updateModels: [name: string, models: string[]]
  updateCollapsed: [state: CollapsedState]
}>()

const newProviderName = ref('')
const advancedProviderState = ref<Record<string, boolean>>({})
const advancedModelState = ref<Record<string, boolean>>({})
const modalityOptions = ['text', 'audio', 'image', 'video', 'pdf'] as const

function isCollapsed(name: string): boolean {
  return props.collapsedState[name] !== false
}

function toggleCollapsed(name: string) {
  const newState = { ...props.collapsedState, [name]: !isCollapsed(name) }
  emit('updateCollapsed', newState)
}

function getPathValue(source: unknown, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = source
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
      continue
    }
    return undefined
  }
  return current
}

function parseLineArray(value: string): string[] {
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
    .reduce<Record<string, string>>((result, line) => {
      const separator = line.indexOf('=')
      if (separator <= 0) return result
      const key = line.slice(0, separator).trim()
      if (!key) return result
      const val = line.slice(separator + 1)
      result[key] = val
      return result
    }, {})
}

function parseNumberish(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getProviderString(prov: unknown, path: string): string {
  const value = getPathValue(prov, path)
  return typeof value === 'string' ? value : ''
}

function getProviderBoolean(prov: unknown, path: string): boolean {
  return getPathValue(prov, path) === true
}

function getProviderLineArrayValue(prov: unknown, path: string): string {
  const value = getPathValue(prov, path)
  if (!Array.isArray(value)) return ''
  return value.filter((item): item is string => typeof item === 'string').join('\n')
}

function getProviderTimeoutValue(prov: unknown): string {
  const value = getPathValue(prov, 'options.timeout')
  if (value === false) return 'false'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function updateProviderTextField(providerName: string, path: string, value: string) {
  const trimmed = value.trim()
  emit('updateField', providerName, path, trimmed ? trimmed : undefined)
}

function updateProviderBooleanField(providerName: string, path: string, value: boolean) {
  emit('updateField', providerName, path, value ? true : undefined)
}

function updateProviderLineArrayField(providerName: string, path: string, value: string) {
  const next = parseLineArray(value)
  emit('updateField', providerName, path, next.length > 0 ? next : undefined)
}

function updateProviderTimeoutField(providerName: string, value: string) {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    emit('updateField', providerName, 'options.timeout', undefined)
    return
  }
  if (trimmed === 'false') {
    emit('updateField', providerName, 'options.timeout', false)
    return
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    emit('updateField', providerName, 'options.timeout', undefined)
    return
  }
  emit('updateField', providerName, 'options.timeout', Math.floor(parsed))
}

function hasModelsObject(prov: unknown): boolean {
  if (typeof prov !== 'object' || prov === null) return false
  const models = (prov as Record<string, unknown>).models
  if (models === undefined) return true
  return typeof models === 'object' && models !== null && !Array.isArray(models)
}

function getModelsObject(prov: unknown): Record<string, ModelConfig> {
  if (typeof prov !== 'object' || prov === null) return {}
  const models = (prov as Record<string, unknown>).models
  if (typeof models === 'object' && models !== null && !Array.isArray(models)) {
    return models as Record<string, ModelConfig>
  }
  if (Array.isArray(models)) {
    return Object.fromEntries(
      models
        .filter((model): model is string => typeof model === 'string' && model.trim().length > 0)
        .map((modelId) => [modelId, {}])
    )
  }
  return {}
}

function getModelDisplayName(modelData: ModelConfig, modelId: string): string {
  const name = getPathValue(modelData, 'name')
  if (typeof name === 'string' && name.trim().length > 0) return name
  return modelId
}

function getModelStringValueByPath(modelData: ModelConfig, path: string): string {
  const value = getPathValue(modelData, path)
  return typeof value === 'string' ? value : ''
}

function getModelNumberValueByPath(modelData: ModelConfig, path: string): string {
  const value = getPathValue(modelData, path)
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return String(value)
}

function getModelBooleanValueByPath(modelData: ModelConfig, path: string): boolean {
  return getPathValue(modelData, path) === true
}

function getModelKeyValueTextByPath(modelData: ModelConfig, path: string): string {
  const source = getPathValue(modelData, path)
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return ''
  }
  return Object.entries(source as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n')
}

function getModelJsonFieldText(modelData: ModelConfig, path: string): string {
  const source = getPathValue(modelData, path)
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return ''
  }
  try {
    return JSON.stringify(source, null, 2)
  } catch {
    return ''
  }
}

function getModelPath(modelId: string): string {
  return `models.${modelId}`
}

function updateModelField(providerName: string, modelId: string, path: string, value: unknown) {
  emit('updateField', providerName, `${getModelPath(modelId)}.${path}`, value)
}

function updateModelTextField(providerName: string, modelId: string, path: string, value: string) {
  const trimmed = value.trim()
  updateModelField(providerName, modelId, path, trimmed ? trimmed : undefined)
}

function updateModelNumberField(providerName: string, modelId: string, path: string, value: unknown) {
  const parsed = parseNumberish(value)
  updateModelField(providerName, modelId, path, parsed)
}

function updateModelBooleanField(providerName: string, modelId: string, path: string, value: boolean) {
  updateModelField(providerName, modelId, path, value ? true : undefined)
}

function updateModalities(providerName: string, modelId: string, key: 'input' | 'output', items: string[]) {
  const allowed = new Set<string>(modalityOptions)
  const next = items.filter((item) => allowed.has(item))
  updateModelField(providerName, modelId, `modalities.${key}`, next.length > 0 ? next : undefined)
}

function toggleModality(providerName: string, modelId: string, key: 'input' | 'output', option: string, current: string[]) {
  const next = current.includes(option)
    ? current.filter((i) => i !== option)
    : [...current, option]
  updateModalities(providerName, modelId, key, next)
}

function getModelModalitiesArray(modelData: ModelConfig, key: 'input' | 'output'): string[] {
  const value = getPathValue(modelData, `modalities.${key}`)
  if (!Array.isArray(value)) return []
  const allowed = new Set<string>(modalityOptions)
  return value
    .filter((item): item is string => typeof item === 'string')
    .filter((item) => allowed.has(item))
}

function getModelInterleavedMode(modelData: ModelConfig): string {
  const value = getPathValue(modelData, 'interleaved')
  if (value === true) return 'true'
  if (value && typeof value === 'object' && !Array.isArray(value)) return 'object'
  return ''
}

function setModelInterleavedMode(providerName: string, modelId: string, mode: string) {
  if (mode === 'true') {
    updateModelField(providerName, modelId, 'interleaved', true)
    return
  }
  if (mode === 'object') {
    updateModelField(providerName, modelId, 'interleaved', { field: 'reasoning_content' })
    return
  }
  updateModelField(providerName, modelId, 'interleaved', undefined)
}

function getModelInterleavedField(modelData: ModelConfig): string {
  const value = getPathValue(modelData, 'interleaved')
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'reasoning_content'
  }
  const field = (value as Record<string, unknown>).field
  if (field === 'reasoning_content' || field === 'reasoning_details') return field
  return 'reasoning_content'
}

function setModelInterleavedField(providerName: string, modelId: string, field: string) {
  if (field !== 'reasoning_content' && field !== 'reasoning_details') return
  updateModelField(providerName, modelId, 'interleaved', { field })
}

function setModelKeyValueField(providerName: string, modelId: string, path: string, value: string) {
  const parsed = parseKeyValueLines(value)
  updateModelField(providerName, modelId, path, Object.keys(parsed).length > 0 ? parsed : undefined)
}

function setModelJsonField(providerName: string, modelId: string, path: string, value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    updateModelField(providerName, modelId, path, undefined)
    return
  }
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      updateModelField(providerName, modelId, path, parsed)
    }
  } catch {
  }
}

function addProvider() {
  const name = newProviderName.value.trim()
  if (!name) return
  emit('add', name)
  newProviderName.value = ''
}

function addNewEmptyModel(providerName: string) {
  const provider = props.providers[providerName]
  const models = getModelsObject(provider)
  let index = 1
  let candidate = `new-model-${index}`
  while (models[candidate]) {
    index += 1
    candidate = `new-model-${index}`
  }
  emit('updateField', providerName, getModelPath(candidate), {})
}

function removeModel(providerName: string, modelId: string) {
  emit('updateField', providerName, getModelPath(modelId), undefined)
}

function renameModelId(providerName: string, oldId: string, newId: string) {
  const trimmedNewId = newId.trim()
  if (!trimmedNewId || trimmedNewId === oldId) return

  const provider = props.providers[providerName]
  const models = getModelsObject(provider)
  if (models[trimmedNewId]) return

  const modelData = models[oldId]
  if (!modelData) return

  emit('updateField', providerName, getModelPath(oldId), undefined)
  emit('updateField', providerName, getModelPath(trimmedNewId), modelData)
}

function getItemAnchorId(name: string): string | undefined {
  return props.itemAnchorIds?.[name]
}

function getModelAnchorId(providerName: string, modelId: string): string {
  const combined = `${providerName}::${modelId}`
  const normalized = combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const stableKey = encodeURIComponent(combined).replace(/%/g, '_')
  return `anchor-provider-model-${normalized || 'item'}-${stableKey || 'empty'}`
}

function providerAdvancedKey(providerName: string): string {
  return providerName
}

function modelAdvancedKey(providerName: string, modelId: string): string {
  return `${providerName}::${modelId}`
}

function isProviderAdvanced(providerName: string): boolean {
  return advancedProviderState.value[providerAdvancedKey(providerName)] === true
}

function toggleProviderAdvanced(providerName: string) {
  const key = providerAdvancedKey(providerName)
  advancedProviderState.value = {
    ...advancedProviderState.value,
    [key]: !isProviderAdvanced(providerName),
  }
}

function isModelAdvanced(providerName: string, modelId: string): boolean {
  return advancedModelState.value[modelAdvancedKey(providerName, modelId)] === true
}

function toggleModelAdvanced(providerName: string, modelId: string) {
  const key = modelAdvancedKey(providerName, modelId)
  advancedModelState.value = {
    ...advancedModelState.value,
    [key]: !isModelAdvanced(providerName, modelId),
  }
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}

.models-section {
  margin-top: 16px;
}

.models-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #ddd1c8;
  margin: 0 0 12px;
}

.advanced-toggle-btn {
  margin-top: 8px;
  border: 1px solid #4f433f;
  background: #211a19;
  color: #d8cbc1;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
}

.advanced-toggle-btn:hover {
  border-color: #3b82f6;
  color: #f5efea;
  background: #2a211f;
}

.advanced-group {
  margin-top: 10px;
  margin-bottom: 6px;
  border: 1px dashed #4f433f;
  border-radius: 6px;
  padding: 10px;
}

.model-card {
  background: #1a1514;
  border: 1px solid #3f3431;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.model-card:last-child {
  margin-bottom: 0;
}

.model-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: -20px;
  position: relative;
  z-index: 1;
}

.model-remove-btn {
  border: none;
  background: transparent;
  color: #8d7d73;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;
}

.model-remove-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

.model-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modalities-row {
  align-items: flex-start;
  margin-bottom: 12px;
}

.modality-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modality-field label {
  font-size: 13px;
  color: #b8aaa1;
}

.modality-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.modality-tag {
  background: #1a1514;
  border: 1px solid #4f433f;
  border-radius: 20px;
  padding: 4px 12px;
  color: #aa9a90;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.modality-tag:hover {
  border-color: #6a5b56;
  color: #ddd1c8;
}

.modality-tag.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #3b82f6;
}

.field-help {
  margin: 0;
  color: #aa9a90;
  font-size: 12px;
  line-height: 1.35;
}

.model-row {
  display: flex;
  gap: 12px;
}

.half-width {
  flex: 1;
}

.model-advanced-toggle {
  align-self: flex-start;
  margin-top: 6px;
}

.model-advanced-group {
  margin-top: 8px;
}

.advanced-subtitle {
  margin: 8px 0 2px;
  font-size: 12px;
  font-weight: 700;
  color: #b8aaa1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.add-model-container {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}

.add-model-btn {
  background: none;
  border: 1px dashed #4f433f;
  border-radius: 6px;
  color: #8d7d73;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
}

.add-model-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.04);
}
</style>
