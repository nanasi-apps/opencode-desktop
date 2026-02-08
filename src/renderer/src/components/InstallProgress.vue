<template>
  <div class="install-progress">
    <div class="step-header">
      <StatusIndicator :status="status" />
      <span class="step-name">{{ name }}</span>
      <span class="step-label">{{ label }}</span>
    </div>
    <div v-if="output" class="step-output">
      <pre>{{ output }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusIndicator from './StatusIndicator.vue'
import type { InstallStatus } from '../../../../shared/types.js'

const { t } = useI18n()

const props = defineProps<{
  name: string
  status: InstallStatus
  output?: string
}>()

const label = computed(() => {
  switch (props.status) {
    case 'idle': return t('installProgress.waiting')
    case 'checking': return t('installProgress.checking')
    case 'installing': return t('installProgress.installing')
    case 'installed': return t('installProgress.ready')
    case 'error': return t('installProgress.failed')
    default: return ''
  }
})
</script>

<style scoped>
.install-progress {
  padding: 12px 0;
  border-bottom: 1px solid #3f3431;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-name {
  font-weight: 600;
  color: #e7ddd6;
  font-size: 14px;
}
.step-label {
  color: #b8aaa1;
  font-size: 13px;
  margin-left: auto;
}
.step-output {
  margin-top: 8px;
  padding: 8px 12px;
  background: #1a1514;
  border-radius: 6px;
  overflow-x: auto;
}
.step-output pre {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: #b8aaa1;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
