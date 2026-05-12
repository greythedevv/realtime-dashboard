export interface MetricPoint {
  timestamp: number
  value: number
  label: string
}

export interface MetricCard {
  id: string
  title: string
  current: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  history: MetricPoint[]
}