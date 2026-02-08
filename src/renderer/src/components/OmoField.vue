<template>
  <div class="omo-field" :class="{ 'is-nested': field.type === 'nested-object' }">
    <template v-if="field.type === 'nested-object'">
      <div
        class="field-header clickable"
        role="button"
        tabindex="0"
        :aria-expanded="String(!isNestedCollapsed)"
        @click="toggleNested"
        @keydown.enter.prevent="toggleNested"
        @keydown.space.prevent="toggleNested"
      >
        <div class="field-header-main">
          <span class="nested-chevron" :class="{ expanded: !isNestedCollapsed }" aria-hidden="true">▶</span>
          <span class="field-label">{{ field.label }}</span>
        </div>
        <p v-if="field.description" class="field-help">{{ field.description }}</p>
      </div>

      <div
        class="nested-shell"
        :class="{ 'is-collapsed': isNestedCollapsed }"
        :aria-hidden="isNestedCollapsed ? 'true' : 'false'"
      >
        <div class="nested-content">
          <OmoField
            v-for="subField in field.properties"
            :key="subField.key"
            :field="subField"
            :model-value="getObjectValue(subField.key)"
            @update:model-value="setObjectValue(subField.key, $event)"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <label class="field-label">{{ field.label }}</label>
      <div class="field-control">
        <input
          v-if="field.type === 'string'"
          type="text"
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          :placeholder="field.placeholder"
        />
        
        <input
          v-else-if="field.type === 'number'"
          type="number"
          :value="modelValue"
          @input="updateNumber"
        />
        
        <Checkbox
          v-else-if="field.type === 'boolean'"
          :checked="modelValue === true"
          @change="$emit('update:modelValue', $event)"
        />
        
        <select
          v-else-if="field.type === 'enum'"
          :value="modelValue"
          @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t('common.unset') }}</option>
          <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>

        <div v-else-if="field.type === 'enum-array'" class="omo-enum-list">
          <label v-for="opt in field.options" :key="opt" class="omo-enum-item">
            <Checkbox
              :checked="getEnumArrayValues().includes(opt)"
              @change="toggleEnumArrayValue(opt, $event)"
            >
              {{ opt }}
            </Checkbox>
          </label>
        </div>

        <textarea
          v-else-if="field.type === 'array'"
          :value="getArrayValue()"
          @input="setArrayValue(($event.target as HTMLTextAreaElement).value)"
          rows="4"
          :placeholder="t('common.oneValuePerLine')"
        />

        <textarea
          v-else-if="field.type === 'object'"
          :value="getObjectMapValue()"
          @change="setObjectMapValue(($event.target as HTMLTextAreaElement).value)"
          rows="4"
          :placeholder="t('common.keyValuePerLine')"
        />

        <textarea
          v-else
          :value="getJsonValue()"
          @change="setJsonValue(($event.target as HTMLTextAreaElement).value)"
          rows="4"
          :placeholder="t('common.emptyObject')"
        />
        
        <p v-if="field.description" class="field-help">{{ field.description }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkbox from './Checkbox.vue'

const { t } = useI18n()

type OmoFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'enum-array' | 'array' | 'object' | 'nested-object' | 'json'

interface OmoSchemaField {
  key: string
  label: string
  type: OmoFieldType
  description: string
  placeholder?: string
  options?: string[]
  properties?: OmoSchemaField[]
}

const props = defineProps<{
  field: OmoSchemaField
  modelValue?: string | number | boolean | object | any[]
}>()

const emit = defineEmits(['update:modelValue'])
const isNestedCollapsed = ref(false)

function toggleNested() {
  isNestedCollapsed.value = !isNestedCollapsed.value
}

function getObjectValue(key: string) {
  if (typeof props.modelValue !== 'object' || props.modelValue === null) return undefined
  return props.modelValue[key]
}

function setObjectValue(key: string, value: any) {
  const newObj = { ...(props.modelValue || {}) }
  if (value === undefined || value === '') {
    delete newObj[key]
  } else {
    newObj[key] = value
  }
  
  if (Object.keys(newObj).length === 0) {
    emit('update:modelValue', undefined)
  } else {
    emit('update:modelValue', newObj)
  }
}

function updateNumber(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (val === '') {
    emit('update:modelValue', undefined)
    return
  }
  const num = Number(val)
  if (!Number.isNaN(num)) {
    emit('update:modelValue', num)
  }
}

function getEnumArrayValues(): string[] {
  if (!Array.isArray(props.modelValue)) return []
  return props.modelValue.filter((item): item is string => typeof item === 'string')
}

function toggleEnumArrayValue(option: string, checked: boolean) {
  const current = getEnumArrayValues()
  const next = checked
    ? [...new Set([...current, option])]
    : current.filter(item => item !== option)
  
  emit('update:modelValue', next.length > 0 ? next : undefined)
}

function getArrayValue(): string {
  if (!Array.isArray(props.modelValue)) return ''
  return props.modelValue.filter((item): item is string => typeof item === 'string').join('\n')
}

function setArrayValue(raw: string) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  emit('update:modelValue', lines.length > 0 ? lines : undefined)
}

function getObjectMapValue(): string {
  if (typeof props.modelValue !== 'object' || props.modelValue === null || Array.isArray(props.modelValue)) return ''
  return Object.entries(props.modelValue)
    .map(([k, v]) => {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return `${k}=${v}`
      }
      return `${k}=${JSON.stringify(v)}`
    })
    .join('\n')
}

function setObjectMapValue(raw: string) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) {
    emit('update:modelValue', undefined)
    return
  }
  
  const next: Record<string, any> = {}
  for (const line of lines) {
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const k = line.slice(0, idx).trim()
    const v = line.slice(idx + 1).trim()
    if (!k) continue
    
    // Simple primitive parsing
    if (v === 'true') next[k] = true
    else if (v === 'false') next[k] = false
    else if (!Number.isNaN(Number(v)) && v !== '') next[k] = Number(v)
    else {
      // Try JSON parsing for complex values
      try {
        if (v.startsWith('{') || v.startsWith('[') || v.startsWith('"')) {
          next[k] = JSON.parse(v)
        } else {
          next[k] = v
        }
      } catch {
        next[k] = v
      }
    }
  }
  emit('update:modelValue', Object.keys(next).length > 0 ? next : undefined)
}

function getJsonValue(): string {
  if (props.modelValue === undefined) return ''
  return JSON.stringify(props.modelValue, null, 2)
}

function setJsonValue(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    emit('update:modelValue', undefined)
    return
  }
  try {
    emit('update:modelValue', JSON.parse(trimmed))
  } catch {
    // Invalid JSON, ignore or handle error (component level error handling is tricky without more props)
  }
}
</script>

<style scoped>
.omo-field {
  margin-bottom: 10px;
}

.omo-field.is-nested {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
  margin-bottom: 12px;
}

.field-header {
  margin-bottom: 8px;
  padding-bottom: 0;
  border-bottom: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-header.clickable {
  cursor: pointer;
  user-select: none;
  border-radius: 6px;
  padding: 4px 6px 4px 0;
}

.field-header.clickable:hover .field-label,
.field-header.clickable:hover .nested-chevron {
  color: #f5efea;
}

.field-header.clickable:focus-visible {
  outline: 1px solid #3b82f6;
  outline-offset: 2px;
}

.field-header-main {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.field-header .field-label {
  margin-bottom: 0;
}

.nested-chevron {
  color: #c9bcb3;
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
  transition: transform 0.24s ease, color 0.2s ease;
  transform-origin: center;
}

.nested-chevron.expanded {
  transform: rotate(90deg);
}

.nested-content {
  margin-left: 2px;
  padding-left: 12px;
  border-left: 1px solid #3f3431;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nested-shell {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
  transition: grid-template-rows 0.28s ease, opacity 0.2s ease, transform 0.28s ease;
}

.nested-shell > .nested-content {
  overflow: hidden;
  min-height: 0;
}

.nested-shell.is-collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
}

/* Reusing styles from SettingsView roughly */
.field-label {
  display: block;
  font-size: 13px;
  color: #b8aaa1;
  margin-bottom: 6px;
}

.omo-field:not(.is-nested) {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #2e2422;
}

.nested-content > .omo-field:last-child,
.omo-field:last-child {
  margin-bottom: 0;
}

.nested-content > .omo-field:last-child:not(.is-nested) {
  border-bottom: none;
}

.omo-field:not(.is-nested) .field-label {
  width: 160px;
  flex-shrink: 0;
  padding-top: 8px;
  margin-bottom: 0;
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
  width: 100%;
  box-sizing: border-box;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #3b82f6;
}

.field-help {
  margin: 0;
  color: #aa9a90;
  font-size: 12px;
  line-height: 1.35;
}

.omo-enum-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.omo-enum-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #ddd1c8;
  font-size: 13px;
}

@media (max-width: 960px) {
  .omo-field:not(.is-nested) {
    flex-direction: column;
    gap: 6px;
  }

  .omo-field:not(.is-nested) .field-label {
    width: auto;
    padding-top: 0;
  }
}
</style>
