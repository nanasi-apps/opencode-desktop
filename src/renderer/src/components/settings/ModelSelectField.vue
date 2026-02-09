<template>
  <div class="field">
    <label>{{ label }}</label>
    <div class="field-control" ref="root">
      <input
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :style="{ 'anchor-name': anchorName }"
        autocomplete="off"
        @focus="openMenu"
        @click="openMenu"
        @input="onInput"
        @keydown.down.prevent="moveHighlight(1)"
        @keydown.up.prevent="moveHighlight(-1)"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.esc.prevent="closeMenu"
        @blur="onBlur"
      />

      <div
        v-show="isOpen && hasModels"
        ref="menuRef"
        popover="auto"
        class="autocomplete-menu"
        :style="{ 'position-anchor': anchorName }"
      >
        <template v-if="filteredModels.length > 0">
          <button
            v-for="(model, index) in filteredModels"
            :key="model"
            type="button"
            class="autocomplete-item"
            :class="{ active: index === highlightedIndex }"
            @mousedown.prevent="selectModel(model)"
            @mouseenter="highlightedIndex = index"
          >
            {{ model }}
          </button>
        </template>
        <p v-else class="field-hint menu-hint">{{ t('modelPicker.noMatches') }}</p>
      </div>

      <p v-if="showNoModels" class="field-hint">{{ t('modelPicker.noModels') }}</p>
      <p v-if="help" class="field-help">{{ help }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  label: string
  modelValue: string
  models: string[]
  placeholder?: string
  help?: string
  disabled?: boolean
}>(), {
  placeholder: '',
  help: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()
const root = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const highlightedIndex = ref(-1)
const anchorName = computed(() => `--model-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`)

const hasModels = computed(() => props.models.length > 0)

const filteredModels = computed(() => {
  const query = props.modelValue.trim().toLowerCase()
  const filtered = query
    ? props.models.filter((model) => model.toLowerCase().includes(query))
    : props.models

  if (props.modelValue && !filtered.includes(props.modelValue)) {
    return [props.modelValue, ...filtered]
  }

  return filtered
})

const showNoModels = computed(() => !hasModels.value)

function openMenu() {
  if (!hasModels.value || props.disabled) return
  showMenuPopover()
  isOpen.value = true
}

function closeMenu() {
  hideMenuPopover()
  isOpen.value = false
  highlightedIndex.value = -1
}

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
  openMenu()
}

function onBlur(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null
  if (nextTarget && root.value?.contains(nextTarget)) return
  window.setTimeout(() => {
    closeMenu()
  }, 0)
}

function moveHighlight(delta: number) {
  if (!isOpen.value) {
    openMenu()
  }

  if (filteredModels.value.length === 0) {
    highlightedIndex.value = -1
    return
  }

  const next = highlightedIndex.value + delta
  if (next < 0) {
    highlightedIndex.value = filteredModels.value.length - 1
    return
  }
  highlightedIndex.value = next % filteredModels.value.length
}

function selectModel(model: string) {
  emit('update:modelValue', model)
  closeMenu()
}

function selectHighlighted() {
  if (!isOpen.value) {
    openMenu()
    return
  }
  if (highlightedIndex.value < 0 || highlightedIndex.value >= filteredModels.value.length) return
  selectModel(filteredModels.value[highlightedIndex.value])
}

function showMenuPopover() {
  const menu = menuRef.value as (HTMLElement & { showPopover?: () => void }) | null
  if (!menu) return
  if (menu.matches(':popover-open')) return
  window.requestAnimationFrame(() => {
    try {
      menu.showPopover?.()
    } catch {
    }
  })
}

function hideMenuPopover() {
  const menu = menuRef.value as (HTMLElement & { hidePopover?: () => void }) | null
  if (!menu) return
  if (!menu.matches(':popover-open')) return
  try {
    menu.hidePopover?.()
  } catch {
  }
}
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
  position: relative;
}

.field input,
.field select {
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
.field select:focus {
  border-color: #3b82f6;
}

.field input:disabled,
.field select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-help,
.field-hint {
  margin: 0;
  color: #aa9a90;
  font-size: 12px;
  line-height: 1.35;
}

.autocomplete-menu {
  margin: 0;
  position: fixed;
  inset: auto;
  z-index: 1200;
  top: calc(anchor(bottom) + 4px);
  left: anchor(left);
  width: anchor-size(width);
  max-height: 0;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #171211;
  display: flex;
  flex-direction: column;
  opacity: 0;
  will-change: max-height, opacity, transform;
  transition:
    max-height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    opacity 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55),
    border-color 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    overlay 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) allow-discrete,
    display 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) allow-discrete;
}

.autocomplete-menu:popover-open {
  max-height: 220px;
  opacity: 1;
  overflow-y: auto;
  border-color: #4f433f;
}

@starting-style {
  .autocomplete-menu:popover-open {
    max-height: 0;
    opacity: 0;
  }
}

.autocomplete-item {
  display: block;
  width: 100%;
  border: none;
  border-bottom: 1px solid #2f2624;
  background: transparent;
  color: #f5efea;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.autocomplete-item:hover,
.autocomplete-item.active {
  background: #2a211f;
}

.menu-hint {
  padding: 8px 12px;
}

.autocomplete-menu:popover-open {
  display: flex;
}
</style>
