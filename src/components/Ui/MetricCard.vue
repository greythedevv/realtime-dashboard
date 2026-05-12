<template>
  <div class="metric-card">
    <p class="label">{{ metric?.title }}</p>
    <h2 class="value">{{ metric?.current.toFixed(1) }}<span>{{ metric?.unit }}</span></h2>
    <span :class="['trend', metric?.trend]">
      {{ metric?.trend === 'up' ? '▲' : metric?.trend === 'down' ? '▼' : '—' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useChartData } from '@/composables/useChartData'
const props = defineProps<{ metricId: string }>()
const { metric } = useChartData(props.metricId)
</script>