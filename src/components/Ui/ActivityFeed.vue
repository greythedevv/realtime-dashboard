<template>
  <div class="feed">
    <h3>Live Activity</h3>
    <TransitionGroup name="feed-item" tag="ul">
      <li v-for="event in store.recentEvents" :key="event.id" :class="event.type">
        <span class="time">{{ formatTime(event.timestamp) }}</span>
        <span class="msg">{{ event.message }}</span>
        <span class="badge">{{ event.type }}</span>
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useStreamStore } from '@/stores/streamStore'
import dayjs from 'dayjs'

const store = useStreamStore()
const formatTime = (ts: number) => dayjs(ts).format('HH:mm:ss')
</script>