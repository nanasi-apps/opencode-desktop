<template>
  <div class="schema-renderer">
    <div v-if="loading" class="schema-loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="schema-error">{{ error }}</div>
    <template v-else-if="parsedSchema">
      <div v-if="parsedSchema.rootFields.length > 0" class="schema-root-fields">
        <SchemaField
          v-for="field in parsedSchema.rootFields"
          :key="field.key"
          :field="field"
          :model-value="getFieldValue(field.key)"
          :available-models="availableModels"
          @update:model-value="setFieldValue(field.key, $event)"
        />
      </div>
      
      <SchemaSection
        v-for="section in parsedSchema.sections"
        :key="section.id"
        :section="section"
        :section-data="getSectionData(section.key)"
        :available-models="availableModels"
        :collapsed="isSectionCollapsed(section.id)"
        @toggle="toggleSection(section.id)"
        @update:field="updateSectionField(section.key, $event.key, $event.value)"
        @update:item="updateSectionItem(section.key, $event.itemKey, $event.fieldKey, $event.value)"
        @add:item="addSectionItem(section.key, $event)"
        @remove:item="removeSectionItem(section.key, $event)"
      />
    </template>
    <div v-else class="schema-empty">{{ t('common.noData') }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SchemaField from './SchemaField.vue'
import SchemaSection from './SchemaSection.vue'
import { useSchemaParser, type ParsedSchema, type SchemaField as SchemaFieldType } from '../composables/useSchemaParser.js'

const { t } = useI18n()

const props = defineProps<{
  schemaUrl?: string
  schema?: { properties?: Record<string, unknown> }
  modelValue: Record<string, unknown>
  availableModels?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const { parsedSchema, error, loading, loadAndParseSchema, parseLocalSchema } = useSchemaParser()
const collapsedSections = ref<Record<string, boolean>>({})

async function loadSchema() {
  if (props.schemaUrl) {
    await loadAndParseSchema(props.schemaUrl)
  } else if (props.schema) {
    parseLocalSchema(props.schema as { properties?: Record<string, unknown> })
  }
}

watch(() => [props.schemaUrl, props.schema], loadSchema, { immediate: true })

function getFieldValue(key: string): unknown {
  return props.modelValue[key]
}

function setFieldValue(key: string, value: unknown) {
  const newValue = { ...props.modelValue }
  if (value === undefined || value === '' || value === null) {
    delete newValue[key]
  } else {
    newValue[key] = value
  }
  emit('update:modelValue', newValue)
}

function getSectionData(key: string): Record<string, unknown> {
  const value = props.modelValue[key]
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function updateSectionField(sectionKey: string, fieldKey: string, value: unknown) {
  const newValue = { ...props.modelValue }
  const section = { ...(newValue[sectionKey] as Record<string, unknown> || {}) }
  
  if (value === undefined || value === '' || value === null) {
    delete section[fieldKey]
  } else {
    section[fieldKey] = value
  }
  
  if (Object.keys(section).length === 0) {
    delete newValue[sectionKey]
  } else {
    newValue[sectionKey] = section
  }
  
  emit('update:modelValue', newValue)
}

function updateSectionItem(sectionKey: string, itemKey: string, fieldKey: string, value: unknown) {
  const newValue = { ...props.modelValue }
  const section = { ...(newValue[sectionKey] as Record<string, Record<string, unknown>> || {}) }
  const item = { ...(section[itemKey] || {}) }
  
  if (value === undefined || value === '' || value === null) {
    delete item[fieldKey]
  } else {
    item[fieldKey] = value
  }
  
  if (Object.keys(item).length === 0) {
    delete section[itemKey]
  } else {
    section[itemKey] = item
  }
  
  if (Object.keys(section).length === 0) {
    delete newValue[sectionKey]
  } else {
    newValue[sectionKey] = section
  }
  
  emit('update:modelValue', newValue)
}

function addSectionItem(sectionKey: string, itemKey: string) {
  const newValue = { ...props.modelValue }
  const section = { ...(newValue[sectionKey] as Record<string, Record<string, unknown>> || {}) }
  
  if (!section[itemKey]) {
    section[itemKey] = {}
  }
  
  newValue[sectionKey] = section
  emit('update:modelValue', newValue)
}

function removeSectionItem(sectionKey: string, itemKey: string) {
  const newValue = { ...props.modelValue }
  const section = { ...(newValue[sectionKey] as Record<string, Record<string, unknown>> || {}) }
  
  delete section[itemKey]
  
  if (Object.keys(section).length === 0) {
    delete newValue[sectionKey]
  } else {
    newValue[sectionKey] = section
  }
  
  emit('update:modelValue', newValue)
}

function isSectionCollapsed(sectionId: string): boolean {
  return collapsedSections.value[sectionId] === true
}

function toggleSection(sectionId: string) {
  collapsedSections.value = {
    ...collapsedSections.value,
    [sectionId]: !isSectionCollapsed(sectionId)
  }
}
</script>

<style scoped>
.schema-renderer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schema-loading,
.schema-error,
.schema-empty {
  padding: 40px;
  text-align: center;
  color: #b8aaa1;
}

.schema-error {
  color: #f87171;
}

.schema-root-fields {
  padding: 16px;
  background: #1a1413;
  border: 1px solid #3f3431;
  border-radius: 8px;
}
</style>
