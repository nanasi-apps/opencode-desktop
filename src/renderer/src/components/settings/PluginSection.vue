<template>
  <div class="section-body">
    <p v-if="pluginList.length === 0" class="empty-hint">{{ t('plugin.empty') }}</p>
    <div
      v-for="(plugin, index) in pluginList"
      :key="index"
      :id="getPluginAnchorId(plugin)"
      class="plugin-field"
      :data-anchor-label="plugin"
    >
      <div class="plugin-field-control">
        <input
          :value="plugin"
          @change="updatePluginName(index, $event)"
          class="plugin-input"
          :aria-label="t('plugin.edit')"
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
        />
        <button
          type="button"
          class="npm-link-btn"
          @click="openPluginOnNpm(plugin)"
          :aria-label="t('plugin.openNpm')"
          :title="t('plugin.openNpm')"
        >
          <IconExternalLink :size="14" stroke-width="2" />
        </button>
        <button type="button" class="remove-btn" @click="$emit('remove', index)" :aria-label="t('plugin.remove')">
          <IconX :size="14" stroke-width="2" />
        </button>
      </div>
    </div>

    <div class="add-field">
      <AddItemInput
        v-model="newPluginName"
        :placeholder="t('plugin.add.placeholder')"
        :button-text="t('plugin.add.button')"
        @add="addPlugin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconExternalLink, IconX } from '@tabler/icons-vue'
import AddItemInput from './AddItemInput.vue'

const { t } = useI18n()

const props = defineProps<{
  plugins: unknown[]
  itemAnchorIds?: Record<string, string>
}>()

const pluginList = computed(() => {
  if (Array.isArray(props.plugins)) {
    const normalized = props.plugins
      .map((plugin) => normalizePluginName(plugin))
      .filter((plugin) => plugin.length > 0)
    if (normalized.length > 0) return normalized
  }

  if (props.itemAnchorIds) {
    const fromAnchors = Object.keys(props.itemAnchorIds).filter((plugin) => plugin.trim().length > 0)
    if (fromAnchors.length > 0) return fromAnchors
  }

  return []
})

const emit = defineEmits<{
  add: [name: string]
  remove: [index: number]
  update: [index: number, name: string]
}>()

const newPluginName = ref('')

function updatePluginName(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.trim()
  if (value) {
    emit('update', index, value)
  }
}

function addPlugin() {
  const name = newPluginName.value.trim()
  if (!name) return
  emit('add', name)
  newPluginName.value = ''
}

function getPluginAnchorId(name: string): string {
  const explicitId = props.itemAnchorIds?.[name]
  if (explicitId) return explicitId
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const stableKey = encodeURIComponent(name).replace(/%/g, '_')
  return `anchor-plugin-${normalized || 'item'}-${stableKey || 'empty'}`
}

function openPluginOnNpm(pluginName: string): void {
  const packageName = extractPackageName(pluginName)
  if (!packageName) return
  const npmUrl = `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`
  window.open(npmUrl, '_blank', 'noopener,noreferrer')
}

function extractPackageName(pluginName: string): string {
  const trimmed = pluginName.trim()
  if (!trimmed) return ''
  const [nameToken] = trimmed.split(/\s+/)
  if (!nameToken) return ''

  const atIndex = nameToken.lastIndexOf('@')
  if (atIndex > 0) {
    return nameToken.slice(0, atIndex)
  }

  return nameToken
}

function normalizePluginName(plugin: unknown): string {
  if (typeof plugin === 'string') return plugin.trim()
  if (typeof plugin === 'number' || typeof plugin === 'boolean') return String(plugin)
  return ''
}
</script>

<style scoped>
.section-body {
  padding: 16px;
}

.empty-hint {
  font-size: 13px;
  color: #8d7d73;
  margin: 0 0 16px;
}

.plugin-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.plugin-field-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plugin-input {
  flex: 1;
  background: #1a1514;
  border: 1px solid #4f433f;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f5efea;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.plugin-input:focus {
  border-color: #3b82f6;
}

.add-field {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #332b28;
}

.remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #8d7d73;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;
}

.npm-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #8d7d73;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;
}

.npm-link-btn:hover {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.15);
}

.remove-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}
</style>
