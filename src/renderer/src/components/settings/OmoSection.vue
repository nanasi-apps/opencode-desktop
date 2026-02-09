<template>
  <div class="section-body">
    <p v-if="sectionId === 'omo-categories' && loadWarning" class="warning">{{ loadWarning }}</p>
    <p v-if="sectionId === 'omo-general' && omo.schemaError" class="warning">{{ omo.schemaError }}</p>

    <template v-for="field in fields" :key="field.key">
      <div class="field" :class="{ 'field-block': isBlockField(field) }">
        <label v-if="!isBlockField(field)">{{ field.label }}</label>
        <div class="field-control">
          <input
            v-if="field.type === 'string'"
            type="text"
            :value="String(omo.config[field.key] ?? '')"
            @input="omo.setFieldValue(field.key, ($event.target as HTMLInputElement).value)"
          />
          <select
            v-else-if="field.type === 'enum'"
            :value="String(omo.config[field.key] ?? '')"
            @change="omo.setFieldValue(field.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ t('common.unset') }}</option>
            <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
          </select>
          <input
            v-else-if="field.type === 'number'"
            type="number"
            :value="typeof omo.config[field.key] === 'number' ? String(omo.config[field.key]) : ''"
            @input="omo.setNumberField(field.key, ($event.target as HTMLInputElement).value)"
          />
          <Checkbox
            v-else-if="field.type === 'boolean'"
            :checked="omo.config[field.key] === true"
            @change="(val) => omo.setFieldValue(field.key, val)"
          />
          <div v-else-if="field.type === 'enum-array'" :class="['omo-enum-list', { 'omo-enum-grid': isDisabledField(field.key) }]">
            <label
              v-for="option in (field.options ?? [])"
              :key="`${field.key}-${option}`"
              class="omo-enum-item"
            >
              <Checkbox
                :checked="omo.getEnumArrayValues(field.key).includes(option)"
                @change="(val) => omo.toggleEnumArrayValue(field.key, option, val)"
              >
                {{ option }}
              </Checkbox>
            </label>
          </div>
          <textarea
            v-else-if="field.type === 'array'"
            :value="Array.isArray(omo.config[field.key]) ? (omo.config[field.key] as string[]).join('\n') : ''"
            @input="omo.setArrayField(field.key, ($event.target as HTMLTextAreaElement).value)"
            rows="4"
            :placeholder="t('common.oneValuePerLine')"
          />

          <div v-else-if="field.type === 'object' && field.key === 'agents'" class="omo-agents-group">
            <div v-for="name in agentNames" :key="`omo-agent-${name}`" :id="getItemAnchorId(name)" :data-anchor-label="name">
              <SettingsCard
                :title="name"
                collapsible
                :collapsed="isCollapsed(name)"
                removable
                @toggle="toggleCollapsed(name)"
                @remove="omo.removeAgent(name)"
              >
                <SettingsField
                  :label="t('omo.agentFields.model')"
                  :model-value="omo.getAgentStringField(name, 'model')"
                  @update:model-value="omo.setAgentStringField(name, 'model', String($event))"
                />
                <SettingsField
                  :label="t('omo.agentFields.variant')"
                  :model-value="omo.getAgentStringField(name, 'variant')"
                  @update:model-value="omo.setAgentStringField(name, 'variant', String($event))"
                />
                <SettingsField
                  :label="t('omo.agentFields.category')"
                  :model-value="omo.getAgentStringField(name, 'category')"
                  @update:model-value="omo.setAgentStringField(name, 'category', String($event))"
                />
                <SettingsField
                  :label="t('omo.agentFields.mode')"
                  type="select"
                  :model-value="omo.getAgentStringField(name, 'mode')"
                  :options="['', 'subagent', 'primary', 'all']"
                  @update:model-value="omo.setAgentStringField(name, 'mode', String($event))"
                />
                <SettingsField
                  :label="t('omo.agentFields.temperature')"
                  type="number"
                  :model-value="omo.getAgentNumberField(name, 'temperature')"
                  @update:model-value="omo.setAgentNumberField(name, 'temperature', String($event))"
                  :min="0"
                  :max="2"
                  :step="0.1"
                />
                <SettingsField
                  :label="t('omo.agentFields.topP')"
                  type="number"
                  :model-value="omo.getAgentNumberField(name, 'top_p')"
                  @update:model-value="omo.setAgentNumberField(name, 'top_p', String($event))"
                  :min="0"
                  :max="1"
                  :step="0.01"
                />
                <SettingsField
                  :label="t('omo.agentFields.disable')"
                  type="checkbox"
                  :model-value="omo.getAgentBooleanField(name, 'disable')"
                  @update:model-value="omo.setAgentBooleanField(name, 'disable', Boolean($event))"
                />
                <SettingsField
                  :label="t('omo.agentFields.color')"
                  :model-value="omo.getAgentStringField(name, 'color')"
                  @update:model-value="omo.setAgentStringField(name, 'color', String($event))"
                  placeholder="#AABBCC"
                />
                <SettingsField
                  :label="t('omo.agentFields.description')"
                  :model-value="omo.getAgentStringField(name, 'description')"
                  @update:model-value="omo.setAgentStringField(name, 'description', String($event))"
                />
                <SettingsField
                  :label="t('omo.agentFields.prompt')"
                  type="textarea"
                  :model-value="omo.getAgentStringField(name, 'prompt')"
                  @update:model-value="omo.setAgentStringField(name, 'prompt', String($event))"
                  :rows="4"
                />
                <SettingsField
                  :label="t('omo.agentFields.promptAppend')"
                  type="textarea"
                  :model-value="omo.getAgentStringField(name, 'prompt_append')"
                  @update:model-value="omo.setAgentStringField(name, 'prompt_append', String($event))"
                  :rows="4"
                />
                <SettingsField
                  :label="t('omo.agentFields.skills')"
                  type="textarea"
                  :model-value="omo.getAgentArrayField(name, 'skills')"
                  @update:model-value="omo.setAgentArrayField(name, 'skills', String($event))"
                  :rows="4"
                />
                <SettingsField
                  :label="t('omo.agentFields.tools')"
                  type="textarea"
                  :model-value="omo.getAgentBooleanMapField(name, 'tools')"
                  @update:model-value="omo.setAgentBooleanMapField(name, 'tools', String($event))"
                  :rows="4"
                  :help="t('omo.agentFields.toolsHelp')"
                />

                <div class="field field-textarea">
                  <label>{{ t('omo.agentFields.permission') }}</label>
                  <div class="field-control omo-agent-permission-group">
                    <div class="omo-agent-permission-grid">
                      <div class="omo-agent-permission-item" v-for="perm in permissionKeys" :key="`${name}-perm-${perm}`">
                        <label>{{ perm }}</label>
                        <select
                          :value="omo.getAgentPermissionField(name, perm)"
                          @change="omo.setAgentPermissionField(name, perm, ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="">{{ t('common.unset') }}</option>
                          <option value="ask">{{ t('common.permission.ask') }}</option>
                          <option value="allow">{{ t('common.permission.allow') }}</option>
                          <option value="deny">{{ t('common.permission.deny') }}</option>
                        </select>
                      </div>
                    </div>
                    <p class="field-help">{{ t('omo.agentFields.permissionBashHelp') }}</p>
                    <textarea
                      :value="omo.getAgentPermissionBashMap(name)"
                      @change="omo.setAgentPermissionBashMap(name, ($event.target as HTMLTextAreaElement).value)"
                      rows="4"
                      :placeholder="t('omo.agentFields.permissionBashPlaceholder')"
                    />
                  </div>
                </div>
              </SettingsCard>
            </div>

            <AddItemInput
              v-model="newAgentName"
              :placeholder="t('omo.add.agentPlaceholder')"
              :button-text="t('omo.add.agentButton')"
              @add="addOmoAgent"
            />
          </div>

          <div v-else-if="field.type === 'object' && field.key === 'categories'" class="omo-categories-group">
            <div v-for="name in categoryNames" :key="`omo-category-${name}`" :id="getItemAnchorId(name)" :data-anchor-label="name">
              <SettingsCard
                :title="name"
                collapsible
                :collapsed="isCategoryCollapsed(name)"
                removable
                @toggle="toggleCategoryCollapsed(name)"
                @remove="omo.removeCategory(name)"
              >
                <OmoField
                  v-for="subField in categoryValueFields"
                  :key="`omo-category-${name}-${subField.key}`"
                  :field="subField"
                  :model-value="omo.getCategoryFieldValue(name, subField.key)"
                  @update:model-value="omo.setCategoryFieldValue(name, subField.key, $event)"
                />
              </SettingsCard>
            </div>

            <AddItemInput
              v-model="newCategoryName"
              :placeholder="t('omo.add.categoryPlaceholder')"
              :button-text="t('omo.add.categoryButton')"
              @add="addCategory"
            />
          </div>

          <div v-else-if="field.type === 'nested-object'" class="omo-nested-group">
            <div v-if="isSingleFieldSection" class="omo-nested-inline">
              <p v-if="field.description" class="field-help">{{ field.description }}</p>
              <OmoField
                v-for="subField in (field.properties ?? [])"
                :key="`omo-nested-${field.key}-${subField.key}`"
                :field="subField"
                :model-value="getNestedFieldValue(field.key, subField.key)"
                @update:model-value="setNestedFieldValue(field.key, subField.key, $event)"
              />
            </div>
            <SettingsCard
              v-else
              :title="field.label"
              collapsible
              :collapsed="isNestedCollapsed(field.key)"
              @toggle="toggleNestedCollapsed(field.key)"
            >
              <p v-if="field.description" class="field-help">{{ field.description }}</p>
              <OmoField
                v-for="subField in (field.properties ?? [])"
                :key="`omo-nested-${field.key}-${subField.key}`"
                :field="subField"
                :model-value="getNestedFieldValue(field.key, subField.key)"
                @update:model-value="setNestedFieldValue(field.key, subField.key, $event)"
              />
            </SettingsCard>
          </div>

          <textarea
            v-else-if="field.type === 'object'"
            :value="omo.getObjectMapField(field.key)"
            @change="omo.setObjectMapField(field.key, ($event.target as HTMLTextAreaElement).value)"
            rows="6"
            :placeholder="t('common.keyValuePerLine')"
          />
          <textarea
            v-else
            :value="omo.getJsonValue(field.key)"
            @change="omo.setJsonField(field.key, ($event.target as HTMLTextAreaElement).value)"
            rows="6"
            :placeholder="t('common.emptyObject')"
          />
          <p v-if="field.description && field.type !== 'nested-object'" class="field-help">{{ field.description }}</p>
        </div>
      </div>
    </template>

    <template v-if="sectionId === 'omo-custom' && omo.customKeys.length > 0">
      <div class="field" v-for="key in omo.customKeys" :key="`custom-${key}`">
        <label>{{ key }}</label>
        <div class="field-control">
          <textarea
            :value="omo.getJsonValue(key)"
            @change="omo.setJsonField(key, ($event.target as HTMLTextAreaElement).value)"
            rows="6"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkbox from '../Checkbox.vue'
import OmoField from '../OmoField.vue'
import SettingsCard from './SettingsCard.vue'
import SettingsField from './SettingsField.vue'
import AddItemInput from './AddItemInput.vue'
import type { CollapsedState, OmoSchemaField } from '../../types/settings.js'

const props = defineProps<{
  sectionId: string
  omo: Record<string, any>
  loadWarning?: string
  collapsedState: CollapsedState
  itemAnchorIds?: Record<string, string>
}>()

const loadWarning = computed(() => props.loadWarning ?? '')

const emit = defineEmits<{
  updateCollapsed: [state: CollapsedState]
}>()

const { t } = useI18n()

const permissionKeys = ['edit', 'bash', 'webfetch', 'doom_loop', 'external_directory']
const newAgentName = ref('')
const newCategoryName = ref('')

const fields = computed<OmoSchemaField[]>(() => props.omo.getFieldsForSection(props.sectionId))
const isSingleFieldSection = computed(() => fields.value.length === 1)
const agentNames = computed<string[]>(() => {
  const value = props.omo.agentNames
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.value)) return value.value
  return []
})

const categoryNames = computed<string[]>(() => {
  const value = props.omo.categoryNames
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.value)) return value.value
  return []
})

const categoryValueFields = computed<OmoSchemaField[]>(() => {
  const value = props.omo.categoryValueFields
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.value)) return value.value
  return []
})

function isDisabledField(key: string): boolean {
  return key.startsWith('disabled_')
}

function isBlockField(field: OmoSchemaField): boolean {
  return (field.type === 'object' && (field.key === 'agents' || field.key === 'categories'))
    || field.type === 'nested-object'
}

function isCollapsed(name: string): boolean {
  return props.collapsedState[name] !== false
}

function toggleCollapsed(name: string) {
  emit('updateCollapsed', { ...props.collapsedState, [name]: !isCollapsed(name) })
}

function getCategoryCollapsedKey(name: string): string {
  return `category:${name}`
}

function getNestedCollapsedKey(key: string): string {
  return `nested:${key}`
}

function isCategoryCollapsed(name: string): boolean {
  return props.collapsedState[getCategoryCollapsedKey(name)] !== false
}

function toggleCategoryCollapsed(name: string) {
  const key = getCategoryCollapsedKey(name)
  emit('updateCollapsed', { ...props.collapsedState, [key]: !isCategoryCollapsed(name) })
}

function isNestedCollapsed(key: string): boolean {
  return props.collapsedState[getNestedCollapsedKey(key)] !== false
}

function toggleNestedCollapsed(key: string) {
  const collapsedKey = getNestedCollapsedKey(key)
  emit('updateCollapsed', { ...props.collapsedState, [collapsedKey]: !isNestedCollapsed(key) })
}

function getNestedFieldValue(parentKey: string, childKey: string): unknown {
  const parent = props.omo.getFieldValue(parentKey)
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return undefined
  return (parent as Record<string, unknown>)[childKey]
}

function setNestedFieldValue(parentKey: string, childKey: string, value: unknown) {
  const parent = props.omo.getFieldValue(parentKey)
  const next = parent && typeof parent === 'object' && !Array.isArray(parent)
    ? { ...(parent as Record<string, unknown>) }
    : {}

  if (value === undefined || value === null || value === '') {
    delete next[childKey]
  } else {
    next[childKey] = value
  }

  props.omo.setFieldValue(parentKey, Object.keys(next).length > 0 ? next : undefined)
}

function addOmoAgent() {
  const name = newAgentName.value.trim()
  if (!name) return
  props.omo.addAgent(name)
  newAgentName.value = ''
}

function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  props.omo.addCategory(name)
  newCategoryName.value = ''
}

function getItemAnchorId(name: string): string | undefined {
  return props.itemAnchorIds?.[name] ?? buildFallbackAnchorId(name)
}

function buildFallbackAnchorId(name: string): string {
  const sectionPrefix = props.sectionId === 'omo-categories' ? 'omo-categories' : 'omo-agents'
  const trimmed = name.trim()
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const stableKey = encodeURIComponent(trimmed).replace(/%/g, '_')
  return `anchor-${sectionPrefix}-${normalized || 'item'}-${stableKey || 'empty'}`
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

.field.field-block {
  display: block;
}

.field.field-block .field-control {
  width: 100%;
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

input[type="text"],
input[type="number"],
select,
textarea {
  background: #1a1514;
  border: 1px solid #4f433f;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f5efea;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #3b82f6;
}

textarea {
  resize: vertical;
  min-height: 60px;
}

.field-help {
  margin: 0;
  color: #aa9a90;
  font-size: 12px;
  line-height: 1.35;
}

.field-textarea {
  align-items: flex-start;
}

.hint {
  margin: 2px 0 0;
  color: #aa9a90;
  font-size: 12px;
}

.section-hint {
  margin-top: 0;
  margin-bottom: 10px;
}

.warning {
  margin: 8px 0 0;
  color: #fca5a5;
  font-size: 12px;
}

.omo-enum-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.omo-enum-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
}

.omo-enum-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #ddd1c8;
  font-size: 13px;
}

.omo-agents-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.omo-categories-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.omo-nested-group {
  display: flex;
  flex-direction: column;
}

.omo-nested-inline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.omo-agent-permission-group {
  gap: 10px;
}

.omo-agent-permission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.omo-agent-permission-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.omo-agent-permission-item label {
  width: auto;
  padding-top: 0;
}

@media (max-width: 960px) {
  .omo-enum-grid {
    grid-template-columns: 1fr;
  }

  .omo-agent-permission-grid {
    grid-template-columns: 1fr;
  }
}
</style>
