<template>
  <div class="add-inline">
    <input
      type="text"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.enter.prevent="$emit('add')"
      :placeholder="placeholder"
    />
    <button class="add-inline-btn" @click="$emit('add')">
      + {{ buttonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
  buttonText: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  add: []
}>()
</script>

<style scoped>
.add-inline {
  display: flex;
  gap: 8px;
}

.add-inline input {
  flex: 1;
  background: #1a1514;
  border: 1px solid #4f433f;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f5efea;
  font-size: 13px;
  outline: none;
}

.add-inline input:focus {
  border-color: #3b82f6;
}

.add-inline-btn {
  background: none;
  border: 1px dashed #4f433f;
  border-radius: 6px;
  color: #8d7d73;
  padding: 10px 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.add-inline-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}
</style>
