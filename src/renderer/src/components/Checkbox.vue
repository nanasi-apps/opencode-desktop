<template>
  <label class="checkbox-wrapper" :class="{ disabled }">
    <input
      type="checkbox"
      class="checkbox-input"
      :checked="checked"
      :disabled="disabled"
      @change="handleChange"
    />
    <div class="checkbox-control">
      <svg
        v-if="checked"
        class="checkbox-icon"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.3334 4L6.00008 11.3333L2.66675 8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <span v-if="label || $slots.default" class="checkbox-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
const props = defineProps<{
  checked?: boolean
  disabled?: boolean
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:checked', value: boolean): void
  (e: 'change', value: boolean): void
}>()

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:checked', target.checked)
  emit('change', target.checked)
}
</script>

<style scoped>
.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  position: relative;
}

.checkbox-wrapper.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
}

.checkbox-control {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid #4f433f;
  background: #1a1514;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-wrapper:hover:not(.disabled) .checkbox-control {
  border-color: #6a5b56;
  background: #221c1a;
}

.checkbox-input:focus-visible + .checkbox-control {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.checkbox-input:checked + .checkbox-control {
  background: #3b82f6;
  border-color: #3b82f6;
}

.checkbox-wrapper:hover:not(.disabled) .checkbox-input:checked + .checkbox-control {
  background: #2563eb;
  border-color: #2563eb;
}

.checkbox-icon {
  width: 12px;
  height: 12px;
  color: white;
  stroke-dasharray: 16;
  stroke-dashoffset: 0;
  animation: check-anim 0.2s ease-out;
}

@keyframes check-anim {
  from {
    stroke-dashoffset: 16;
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    stroke-dashoffset: 0;
    opacity: 1;
    transform: scale(1);
  }
}

.checkbox-label {
  font-size: 13px;
  color: #e7ddd6;
  line-height: 1.4;
}
</style>
