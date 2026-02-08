<template>
  <div class="status-indicator" :class="color" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'idle' | 'checking' | 'installing' | 'installed' | 'error' | 'stopped' | 'starting' | 'running'
}>()

const color = computed(() => {
  switch (props.status) {
    case 'installed':
    case 'running':
      return 'green'
    case 'checking':
    case 'installing':
    case 'starting':
      return 'yellow'
    case 'error':
      return 'red'
    default:
      return 'gray'
  }
})
</script>

<style scoped>
.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.green { background: #34d399; box-shadow: 0 0 6px #34d39966; }
.yellow { background: #fbbf24; box-shadow: 0 0 6px #fbbf2466; }
.red { background: #f87171; box-shadow: 0 0 6px #f8717166; }
.gray { background: #6b7280; }
</style>
