export interface StreamEvent {
  id: string
  type:  'alert' | 'info' | 'warning' | 'error' 
  message: string
  timestamp: number
  severity: 1 | 2 | 3
}

export type StreamStatus = 'connected' | 'paused' | 'error' | 'reconnecting' 