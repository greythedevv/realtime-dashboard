import { computed } from 'vue'
import { useMetricsStore } from '@/stores/metricsStore'

export function useChartData(metricId: string) {
  const store = useMetricsStore()

  const metric = computed(() =>
    store.metrics.find(m => m.id === metricId)
  )

  const labels = computed(() =>
    metric.value?.history.map(p =>
      new Date(p.timestamp).toLocaleTimeString()
    ) ?? []
  )

  const values = computed(() =>
    metric.value?.history.map(p => p.value) ?? []
  )

  return { metric, labels, values }
}