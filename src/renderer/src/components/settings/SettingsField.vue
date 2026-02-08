<template>
  <div class="field" :class="{ 'field-textarea': isTextarea }">
    <label>{{ label }}</label>
    <div class="field-control">
      <select
        v-if="type === 'select'"
        :value="modelValue"
        :disabled="disabled"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in options" :key="option" :value="option">
          {{ option || t('common.unset') }}
        </option>
      </select>
      
      <Checkbox
        v-else-if="type === 'checkbox'"
        :checked="modelValue === true"
        :disabled="disabled"
        @change="$emit('update:modelValue', $event)"
      />
      
      <textarea
        v-else-if="type === 'textarea'"
        :value="modelValue"
        :disabled="disabled"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        :rows="rows"
        :placeholder="placeholder"
      />
      
      <input
        v-else
        :type="type"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
      />
      
      <p v-if="help" class="field-help">{{ help }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkbox from '../Checkbox.vue'

const { t } = useI18n()

const props = defineProps<{
  label: string
  type?: 'text' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea'
  modelValue: string | number | boolean | undefined
  placeholder?: string
  help?: string
  options?: string[]
  rows?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string | number | boolean]
}>()

const isTextarea = computed(() => props.type === 'textarea')
</script>

<style scoped>
.field {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.field:last-child {
  margin-bottom: 0;
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

.field input[type="text"],
.field input[type="password"],
.field input[type="number"],
.field select,
.field textarea {
  flex: 1;
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

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #3b82f6;
}

.field textarea {
  resize: vertical;
  min-height: 60px;
}

.field input:disabled,
.field select:disabled,
.field textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
</style>
