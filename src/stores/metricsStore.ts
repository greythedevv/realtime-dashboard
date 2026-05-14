import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MetricPoint, MetricCard } from '@/types/metrics'
import { generateMetricPoint } from '@/utils/dataGenerator'

const MAX_HISTORY = 60 // 60 data points max per metric

export const useMetricsStore = defineStore('metrics', () => {
  const metrics = ref<MetricCard[]>([
    { id: 'cpu', title: 'CPU Usage', current: 0, unit: '%', trend: 'stable', history: [] },
    { id: 'memory', title: 'Memory', current: 0, unit: 'GB', trend: 'stable', history: [] },
    { id: 'network', title: 'Network I/O', current: 0, unit: 'MB/s', trend: 'stable', history: [] },
    { id: 'requests', title: 'Requests/s', current: 0, unit: 'req/s', trend: 'stable', history: [] },
  ])

  let intervalId: ReturnType<typeof setInterval> | null = null

  function startUpdating() {
    intervalId = setInterval(() => {
      metrics.value.forEach(metric => {
        const point = generateMetricPoint(metric.id)
        const prev = metric.current
        metric.current = point.value
        metric.trend = point.value > prev ? 'up' : point.value < prev ? 'down' : 'stable'
        metric.history.push(point)
        if (metric.history.length > MAX_HISTORY) metric.history.shift()
      })
    }, 1000)
  }

  function stopUpdating() {
    if (intervalId) clearInterval(intervalId)
  }

  return { metrics, startUpdating, stopUpdating }
})