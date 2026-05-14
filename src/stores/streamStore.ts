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

  function startStream() {
    if (intervalId) return
    intervalId = setInterval(() => {
      if (isPaused.value) return
      const event = generateStreamEvent()
      events.value.unshift(event)           // newest first
      if (events.value.length > MAX_EVENTS) {
        events.value.pop()                  // prevent memory leak
      }
    }, 800)
    status.value = 'connected'
  }

  function stopStream() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function togglePause() {
    isPaused.value = !isPaused.value
    status.value = isPaused.value ? 'paused' : 'connected'
  }

  // Clean up on unmount
  function cleanup() { stopStream() }

  const recentEvents = computed(() => events.value.slice(0, 50))

  return { status, events, isPaused, recentEvents, startStream, stopStream, togglePause, cleanup }
})