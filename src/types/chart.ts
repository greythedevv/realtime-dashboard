export type ChartType = 'line' | 'bar' | 'area'

export interface ChartDataset {
  name: string
  data: number[]
  color: string
  visible: boolean
}