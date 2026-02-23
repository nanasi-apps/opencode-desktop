<template>
  <section class="schema-section" :id="section.id">
    <button
      type="button"
      class="section-header"
      :aria-expanded="String(!collapsed)"
      @click="$emit('toggle')"
    >
      <span class="section-title">{{ section.label }}</span>
      <span class="section-chevron" :class="{ expanded: !collapsed }" aria-hidden="true"></span>
    </button>

    <Transition
      name="section-collapse"
      @enter="handleEnter"
      @after-enter="handleAfterEnter"
      @leave="handleLeave"
      @after-leave="handleAfterLeave"
    >
      <div v-if="!collapsed" class="section-content-wrapper">
        <div class="section-content">
          <p v-if="section.description" class="section-description">{{ section.description }}</p>
          
          <div class="section-fields">
            <SchemaField
              v-for="field in section.fields"
              :key="field.key"
              :field="field"
              :model-value="getFieldValue(field.key)"
              :available-models="availableModels"
              @update:model-value="updateField(field.key, $event)"
            />
          </div>

          <div v-if="hasTemplateField" class="section-items">
            <div class="items-header">
              <h4>{{ t('schema.items') }}</h4>
              <div class="add-item">
                <input
                  v-model="newItemKey"
                  type="text"
                  :placeholder="t('schema.itemName')"
                  @keydown.enter.prevent="addItem"
                />
                <button type="button" class="add-btn" @click="addItem">{{ t('common.add') }}</button>
              </div>
            </div>

            <div v-for="(item, itemKey) in sectionItems" :key="itemKey" class="item-card">
              <div class="item-header">
                <span class="item-name">{{ itemKey }}</span>
                <button type="button" class="remove-btn" @click="removeItem(itemKey)">
                  {{ t('common.remove') }}
                </button>
              </div>
              <div class="item-fields">
                <SchemaField
                  v-for="field in templateFields"
                  :key="field.key"
                  :field="field"
                  :model-value="getItemFieldValue(itemKey, field.key)"
                  :available-models="availableModels"
                  @update:model-value="updateItemField(itemKey, field.key, $event)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SchemaField from './SchemaField.vue'
import type { SchemaSection as SchemaSectionType, SchemaField as SchemaFieldType } from '../composables/useSchemaParser.js'

const { t } = useI18n()

const props = defineProps<{
  section: SchemaSectionType
  sectionData: Record<string, unknown>
  availableModels?: string[]
  collapsed?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  'update:field': [{ key: string; value: unknown }]
  'update:item': [{ itemKey: string; fieldKey: string; value: unknown }]
  'add:item': [string]
  'remove:item': [string]
}>()

const newItemKey = ref('')

const templateField = computed(() => {
  return props.section.fields.find(f => f.key === '__template')
})

const hasTemplateField = computed(() => !!templateField.value)

const templateFields = computed(() => {
  return templateField.value?.properties || []
})

const sectionFields = computed(() => {
  return props.section.fields.filter(f => f.key !== '__template')
})

const sectionItems = computed(() => {
  const items: Record<string, Record<string, unknown>> = {}
  for (const [key, value] of Object.entries(props.sectionData)) {
    if (key !== '__template' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      items[key] = value as Record<string, unknown>
    }
  }
  return items
})

function getFieldValue(key: string): unknown {
  return props.sectionData[key]
}

function updateField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

function getItemFieldValue(itemKey: string, fieldKey: string): unknown {
  const item = props.sectionData[itemKey]
  if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
    return (item as Record<string, unknown>)[fieldKey]
  }
  return undefined
}

function updateItemField(itemKey: string, fieldKey: string, value: unknown) {
  emit('update:item', { itemKey, fieldKey, value })
}

function addItem() {
  const key = newItemKey.value.trim()
  if (key) {
    emit('add:item', key)
    newItemKey.value = ''
  }
}

function removeItem(key: string) {
  emit('remove:item', key)
}

function handleEnter(el: Element) {
  const panel = el as HTMLElement
  panel.style.overflow = 'hidden'
  panel.style.willChange = 'height, opacity, transform'
  panel.style.transition = 'height 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, transform 0.28s ease'
  panel.style.height = '0px'
  panel.style.opacity = '0'
  panel.style.transform = 'translateY(-6px)'
  void panel.offsetHeight
  panel.style.height = `${panel.scrollHeight}px`
  panel.style.opacity = '1'
  panel.style.transform = 'translateY(0)'
}

function handleAfterEnter(el: Element) {
  const panel = el as HTMLElement
  panel.style.height = ''
  panel.style.overflow = ''
  panel.style.opacity = ''
  panel.style.transform = ''
  panel.style.transition = ''
  panel.style.willChange = ''
}

function handleLeave(el: Element) {
  const panel = el as HTMLElement
  panel.style.overflow = 'hidden'
  panel.style.willChange = 'height, opacity, transform'
  panel.style.transition = 'height 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, transform 0.28s ease'
  panel.style.height = `${panel.scrollHeight}px`
  panel.style.opacity = '1'
  panel.style.transform = 'translateY(0)'
  void panel.offsetHeight
  panel.style.height = '0px'
  panel.style.opacity = '0'
  panel.style.transform = 'translateY(-6px)'
}

function handleAfterLeave(el: Element) {
  const panel = el as HTMLElement
  panel.style.height = ''
  panel.style.overflow = ''
  panel.style.opacity = ''
  panel.style.transform = ''
  panel.style.transition = ''
  panel.style.willChange = ''
}
</script>

<style scoped>
.schema-section {
  margin-bottom: 14px;
  border: 1px solid #3f3431;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  width: 100%;
  padding: 12px 16px;
  background: #2d2422;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.15s;
}

.section-header:hover {
  background: #3a2e2b;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #f5efea;
}

.section-chevron {
  color: #c9bcb3;
  font-size: 12px;
  transition: transform 0.24s ease;
}

.section-chevron::before {
  content: '▼';
}

.section-chevron.expanded {
  transform: rotate(180deg);
}

.section-content-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}

.section-content {
  overflow: hidden;
  min-height: 0;
  padding: 16px;
  background: #1a1413;
}

.section-description {
  margin: 0 0 16px 0;
  color: #aa9a90;
  font-size: 13px;
}

.section-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-items {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #3f3431;
}

.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.items-header h4 {
  margin: 0;
  font-size: 14px;
  color: #f5efea;
}

.add-item {
  display: flex;
  gap: 8px;
}

.add-item input {
  background: #1a1514;
  border: 1px solid #4f433f;
  border-radius: 6px;
  padding: 6px 10px;
  color: #f5efea;
  font-size: 13px;
  outline: none;
}

.add-item input:focus {
  border-color: #3b82f6;
}

.add-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.add-btn:hover {
  background: #2563eb;
}

.item-card {
  background: #221b19;
  border: 1px solid #3f3431;
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #2a211f;
  border-bottom: 1px solid #3f3431;
}

.item-name {
  font-weight: 500;
  color: #f5efea;
  font-size: 13px;
}

.remove-btn {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.remove-btn:hover {
  background: #b91c1c;
}

.item-fields {
  padding: 12px;
}

.section-collapse-enter-active,
.section-collapse-leave-active {
  transition: grid-template-rows 0.34s cubic-bezier(0.16, 1, 0.3, 1), 
              opacity 0.22s ease, 
              transform 0.28s ease;
}

.section-collapse-enter-from,
.section-collapse-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-6px);
}
</style>
