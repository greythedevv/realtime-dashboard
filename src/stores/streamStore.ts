import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StreamEvent, StreamStatus } from '@/types/stream'
import { generateStreamEvent } from '@/utils/dataGenerator'

const MAX_EVENTS = 100

export const useStreamStore = defineStore('stream', () => {
  const status = ref<StreamStatus>('connected')
  const events = ref<StreamEvent[]>([])
  const isPaused = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function pushEvent() {
    const event = generateStreamEvent()
    events.value.unshift(event)
    if (events.value.length > MAX_EVENTS) events.value.pop()
  }

  function startStream() {
    if (intervalId) return
    status.value = 'connected'
    intervalId = setInterval(pushEvent, 800)
  }

  function stopStream() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function togglePause() {
    if (isPaused.value) {
      // Resume
      isPaused.value = false
      startStream()
    } else {
      // Pause — actually stop the interval
      isPaused.value = true
      status.value = 'paused'
      stopStream()
    }
  }

  // Simulate a disconnect + reconnect after 3 seconds
  function simulateReconnect() {
    stopStream()
    status.value = 'reconnecting'
    isPaused.value = false

    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      status.value = 'connected'
      startStream()
    }, 3000)
  }

  function cleanup() {
    stopStream()
    if (reconnectTimer) clearTimeout(reconnectTimer)
  }

  const recentEvents = computed(() => events.value.slice(0, 50))

  return {
    status, events, isPaused, recentEvents,
    startStream, stopStream, togglePause,
    simulateReconnect, cleanup
  }
})