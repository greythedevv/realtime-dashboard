import { ref } from 'vue'

export function useThrottle<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  const lastCall = ref(0)
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall.value >= delay) {
      lastCall.value = now
      fn(...args)
    }
  }
}