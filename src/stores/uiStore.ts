import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isDark = ref(true)

  function toggleTheme() {
    isDark.value = !isDark.value
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  }

  // Apply theme on load
  function init() {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  return { isDark, toggleTheme, init }
})