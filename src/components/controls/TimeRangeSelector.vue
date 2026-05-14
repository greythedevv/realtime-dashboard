<template>
  <div class="range-selector">
    <button v-for="range in ranges" :key="range.label"
      :class="{ active: selected === range.value }"
      @click="selected = range.value">
      {{ range.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const selected = ref(60)
const ranges = [
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '1 hr', value: 3600 },
]
</script>