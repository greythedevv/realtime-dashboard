<template>
  <button @click="store.togglePause" :class="store.isPaused ? 'resume' : 'pause'">
    {{ store.isPaused ? '▶ Resume' : '⏸ Pause' }}
  </button>
</template>

<script setup lang="ts">
import { useStreamStore } from '@/stores/streamStore'
const store = useStreamStore()
</script>