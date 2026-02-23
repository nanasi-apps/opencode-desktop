<template>
  <div class="schema-demo-view">
    <header class="demo-header">
      <button class="back-btn" @click="goBack">{{ t('common.back') }}</button>
      <h1>{{ t('schemaDemo.title') }}</h1>
      <div class="header-actions">
        <button class="save-btn" @click="saveConfig">{{ t('common.save') }}</button>
      </div>
    </header>

    <div class="demo-body">
      <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <SchemaRenderer
        v-else
        :schema="localSchema"
        v-model="config"
        :available-models="availableModels"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SchemaRenderer from '../components/SchemaRenderer.vue'
import { clientReady } from '../rpc/client.js'

const { t } = useI18n()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const localSchema = ref<Record<string, unknown> | null>(null)
const config = ref<Record<string, unknown>>({})
const availableModels = ref<string[]>([])

async function loadSchema() {
  loading.value = true
  error.value = ''
  
  try {
    const response = await fetch('/schema.json')
    if (!response.ok) {
      throw new Error(`Failed to load schema: ${response.status}`)
    }
    localSchema.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load schema'
    localSchema.value = null
  } finally {
    loading.value = false
  }
}

async function loadAvailableModels() {
  try {
    const client = await clientReady
    const result = await client.config.getAvailableModels()
    availableModels.value = result.models
  } catch {
    availableModels.value = []
  }
}

async function saveConfig() {
  console.log('Saving config:', config.value)
}

function goBack() {
  router.back()
}

onMounted(() => {
  loadSchema()
  loadAvailableModels()
})
</script>

<style scoped>
.schema-demo-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #131010;
  color: #f5efea;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #3f3431;
  flex-shrink: 0;
}

.demo-header h1 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  background: #4f433f;
  color: #ddd1c8;
  border: 1px solid #6a5b56;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.back-btn:hover {
  background: #6a5b56;
}

.save-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover {
  background: #2563eb;
}

.demo-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px 40px;
}

.loading,
.error {
  padding: 40px;
  text-align: center;
  color: #b8aaa1;
}

.error {
  color: #f87171;
}
</style>
