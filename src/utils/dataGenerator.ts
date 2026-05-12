import type { MetricPoint } from '@/types/metrics'
import type { StreamEvent } from '@/types/stream'

let eventCounter = 0

export function generateMetricPoint(label: string): MetricPoint {
  return {
    timestamp: Date.now(),
    value: parseFloat((Math.random() * 100).toFixed(2)),
    label
  }
}

export function generateStreamEvent(): StreamEvent {
  const types = ['alert', 'info', 'warning', 'error'] as const
  const messages = [
    'CPU spike detected on Node 3',
    'New user session started',
    'Memory usage above 80%',
    'API response time nominal',
    'Disk I/O threshold reached'
  ]
  return {
    id: `evt-${++eventCounter}`,
    type: types[Math.floor(Math.random() * types.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: Date.now(),
    severity: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3
  }
}