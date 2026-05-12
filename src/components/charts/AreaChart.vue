<template>
  <div class="chart-wrapper">
    <v-chart :option="chartOption" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useChartData } from '@/composables/useChartData'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{ metricId: string; title: string }>()
const { labels, values } = useChartData(props.metricId)

const chartOption = computed(() => ({
  title: { text: props.title, textStyle: { color: '#94a3b8' } },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: labels.value },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: values.value, smooth: true, areaStyle: {} }]
}))
</script>