<template>
  <div class="card">
    <div class="card-header" :class="{ clickable: collapsible }" @click="collapsible && $emit('toggle')">
      <strong>{{ title }}</strong>
      <div class="card-actions">
        <button
          v-if="removable"
          class="remove-btn"
          @click.stop="$emit('remove')"
        >
          <IconX :size="16" stroke-width="2" />
        </button>
      </div>
    </div>
    <Transition name="card-collapse">
      <div
        v-if="!collapsed"
        class="card-body-shell"
      >
        <div class="card-body">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { IconX } from '@tabler/icons-vue'

defineProps<{
  title: string
  collapsible?: boolean
  collapsed?: boolean
  removable?: boolean
}>()

defineEmits<{
  toggle: []
  remove: []
}>()
</script>

<style scoped>
.card {
  background: #221c1a;
  border: 1px solid #3f3431;
  border-radius: 8px;
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

.card-header.clickable {
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s;
}

.card-header.clickable:hover {
  opacity: 0.8;
}

.card-header strong {
  font-size: 14px;
  color: #e7ddd6;
}

.card-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.collapse-btn {
  background: none;
  border: 1px solid #4f433f;
  border-radius: 6px;
  color: #b8aaa1;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
}

.collapse-btn:hover {
  border-color: #3b82f6;
  color: #f5efea;
}

.remove-btn {
  background: none;
  border: none;
  color: #f87171;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.remove-btn:hover {
  color: #ef4444;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 0 16px 14px 16px;
}

.card-body-shell {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}

.card-body-shell > .card-body {
  overflow: hidden;
}

.card-collapse-enter-active,
.card-collapse-leave-active {
  transition: grid-template-rows 0.28s ease, opacity 0.2s ease, transform 0.28s ease;
}

.card-collapse-enter-from,
.card-collapse-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
}
</style>
