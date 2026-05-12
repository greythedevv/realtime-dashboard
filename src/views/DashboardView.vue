<template>
  <div class="dash">

    <!-- TOP BAR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand">
          <div class="brand-dot"></div>
          <span class="brand-name">NEXUS</span>
        </div>
        <div class="live-pill" :class="{ paused: streamStore.isPaused }">
          <span class="pulse-dot"></span>
          {{ streamStore.isPaused ? 'PAUSED' : 'LIVE' }}
        </div>
      </div>
      <div class="topbar-center">
        <span class="topbar-clock">{{ currentTime }}</span>
      </div>
      <div class="topbar-right">
        <div class="range-group">
          <button v-for="r in ranges" :key="r"
            :class="['rbtn', { active: activeRange === r }]"
            @click="activeRange = r">{{ r }}</button>
        </div>
        <button class="pause-btn" @click="streamStore.togglePause">
          {{ streamStore.isPaused ? '▶' : '⏸' }}
          <span class="pause-label">{{ streamStore.isPaused ? 'Resume' : 'Pause' }}</span>
        </button>
      </div>
    </header>

    <!-- METRIC CARDS -->
    <section class="metrics">
      <div v-for="(metric, i) in metricsStore.metrics" :key="metric.id"
        class="mcard" :style="{ '--c': colors[i], '--cg': colorGlows[i] }">
        <div class="mcard-top">
          <span class="mcard-label">{{ metric.title }}</span>
          <span class="mcard-badge" :class="metric.trend">
            {{ metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '·' }}
          </span>
        </div>
        <div class="mcard-val">
          {{ metric.current.toFixed(1) }}<small>{{ metric.unit }}</small>
        </div>
        <div class="mcard-track">
          <div class="mcard-fill" :style="{ width: Math.min(metric.current, 100) + '%' }"></div>
        </div>
      </div>
    </section>

    <!-- CHARTS -->
    <section class="charts">
      <div class="chart-box c-wide">
        <div class="chart-label">CPU Usage <em>LINE</em></div>
        <v-chart :option="lineOpt" class="vchart" autoresize />
      </div>
      <div class="chart-box">
        <div class="chart-label">Memory <em>BAR</em></div>
        <v-chart :option="barOpt" class="vchart" autoresize />
      </div>
      <div class="chart-box">
        <div class="chart-label">Network I/O <em>AREA</em></div>
        <v-chart :option="areaOpt" class="vchart" autoresize />
      </div>
      <div class="chart-box">
        <div class="chart-label">Requests/sec <em>AREA</em></div>
        <v-chart :option="reqOpt" class="vchart" autoresize />
      </div>
    </section>

    <!-- FEED -->
    <section class="feed">
      <div class="feed-head">
        <span class="feed-title">Live Activity Feed</span>
        <span class="feed-count">{{ streamStore.recentEvents.length }} events</span>
      </div>
      <div class="feed-body">
        <TransitionGroup name="row">
          <div v-for="ev in streamStore.recentEvents" :key="ev.id" class="feed-row">
            <span class="fdot" :class="ev.type"></span>
            <span class="ftime">{{ fmt(ev.timestamp) }}</span>
            <span class="fmsg">{{ ev.message }}</span>
            <span class="ftag" :class="ev.type">{{ ev.type.toUpperCase() }}</span>
          </div>
        </TransitionGroup>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useStreamStore } from '@/stores/streamStore'
import { useMetricsStore } from '@/stores/metricsStore'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'

use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const streamStore = useStreamStore()
const metricsStore = useMetricsStore()

const ranges = ['1M', '5M', '1H', 'LIVE']
const activeRange = ref('LIVE')

const colors     = ['#38bdf8', '#a78bfa', '#34d399', '#f472b6']
const colorGlows = ['#38bdf820', '#a78bfa20', '#34d39920', '#f472b620']

const currentTime = ref(dayjs().format('HH:mm:ss'))
let clockTimer: ReturnType<typeof setInterval>

const fmt = (ts: number) => dayjs(ts).format('HH:mm:ss')

const g   = (id: string) => metricsStore.metrics.find(m => m.id === id)
const lbs = (id: string) => computed(() => g(id)?.history.map(p => fmt(p.timestamp)) ?? [])
const vs  = (id: string) => computed(() => g(id)?.history.map(p => +p.value.toFixed(1)) ?? [])

const chartBase = () => ({
  backgroundColor: 'transparent',
  grid: { left: 44, right: 8, top: 8, bottom: 28 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0b1628',
    borderColor: '#1e3350',
    textStyle: { color: '#94a3b8', fontSize: 11 }
  },
  xAxis: {
    type: 'category',
    axisLine: { lineStyle: { color: '#1e3350' } },
    axisTick: { show: false },
    axisLabel: { color: '#2d4a6a', fontSize: 9 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#0d1f35', type: 'dashed' } },
    axisLabel: { color: '#2d4a6a', fontSize: 9 }
  }
})

const lineOpt = computed(() => ({
  ...chartBase(),
  xAxis: { ...chartBase().xAxis, data: lbs('cpu').value },
  series: [{
    type: 'line', data: vs('cpu').value, smooth: true,
    color: '#38bdf8', showSymbol: false, lineStyle: { width: 2 },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#38bdf825' }, { offset: 1, color: '#38bdf800' }] } }
  }]
}))

const barOpt = computed(() => ({
  ...chartBase(),
  xAxis: { ...chartBase().xAxis, data: lbs('memory').value },
  series: [{
    type: 'bar', data: vs('memory').value, color: '#a78bfa',
    barMaxWidth: 10, itemStyle: { borderRadius: [3, 3, 0, 0] }
  }]
}))

const areaOpt = computed(() => ({
  ...chartBase(),
  xAxis: { ...chartBase().xAxis, data: lbs('network').value },
  series: [{
    type: 'line', data: vs('network').value, smooth: true,
    color: '#34d399', showSymbol: false, lineStyle: { width: 2 },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#34d39925' }, { offset: 1, color: '#34d39900' }] } }
  }]
}))

const reqOpt = computed(() => ({
  ...chartBase(),
  xAxis: { ...chartBase().xAxis, data: lbs('requests').value },
  series: [{
    type: 'line', data: vs('requests').value, smooth: true,
    color: '#f472b6', showSymbol: false, lineStyle: { width: 2 },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f472b625' }, { offset: 1, color: '#f472b600' }] } }
  }]
}))

onMounted(() => {
  streamStore.startStream()
  metricsStore.startUpdating()
  clockTimer = setInterval(() => { currentTime.value = dayjs().format('HH:mm:ss') }, 1000)
})

onUnmounted(() => {
  streamStore.cleanup()
  metricsStore.stopUpdating()
  clearInterval(clockTimer)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── ROOT ── */
.dash {
  width: 100vw;
  min-height: 100vh;
  height: 100vh;
  background: #040c18;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  color: #cbd5e1;
  overflow: hidden;
}

/* ── TOPBAR ── */
.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: #060f1f;
  border-bottom: 1px solid #0f2240;
  position: relative;
  gap: 12px;
}

.topbar-left  { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.topbar-center {
  position: absolute; left: 50%; transform: translateX(-50%);
  pointer-events: none;
}
.topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: auto; }

.brand { display: flex; align-items: center; gap: 8px; }
.brand-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8aa;
}
.brand-name {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px; font-weight: 500;
  letter-spacing: 0.18em; color: #e2e8f0;
}

.live-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 20px;
  background: #03180d; border: 1px solid #0a4020;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px; font-weight: 500;
  color: #34d399; letter-spacing: 0.1em;
  white-space: nowrap;
}
.live-pill.paused { background: #160f00; border-color: #4a3000; color: #fbbf24; }

.pulse-dot {
  width: 6px; height: 6px; border-radius: 50%; background: currentColor;
  animation: blink 1.4s infinite;
}
.live-pill.paused .pulse-dot { animation: none; }

.topbar-clock {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 20px; font-weight: 400;
  color: #e2e8f0; letter-spacing: 0.12em;
}

.range-group {
  display: flex;
  background: #060f1f; border: 1px solid #0f2240; border-radius: 6px; overflow: hidden;
}
.rbtn {
  padding: 4px 10px; background: transparent; border: none;
  color: #2d4a6a; font-size: 10px; font-weight: 600;
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s;
  white-space: nowrap;
}
.rbtn:hover { color: #64748b; }
.rbtn.active { background: #0f2240; color: #38bdf8; }

.pause-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 14px;
  background: #060f1f; border: 1px solid #0f2240; border-radius: 6px;
  color: #64748b; font-size: 11px; font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer; transition: all 0.2s;
  white-space: nowrap;
}
.pause-btn:hover { border-color: #1e3a5a; color: #e2e8f0; }

/* ── METRICS ── */
.metrics {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #0a1e35;
  border-bottom: 1px solid #0a1e35;
}

.mcard {
  background: #060f1f;
  padding: 16px 20px;
  position: relative;
  overflow: hidden;
  transition: background 0.2s;
}
.mcard::after {
  content: ''; position: absolute;
  bottom: 0; left: 0; right: 0; height: 2px;
  background: var(--c); opacity: 0.7;
}

.mcard-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 6px;
}
.mcard-label {
  font-size: 10px; font-weight: 600; color: #334e68;
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.1em; text-transform: uppercase;
}
.mcard-badge { font-size: 13px; font-weight: 700; }
.mcard-badge.up     { color: #34d399; }
.mcard-badge.down   { color: #f87171; }
.mcard-badge.stable { color: #334e68; }

.mcard-val {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700; color: var(--c);
  font-variant-numeric: tabular-nums; line-height: 1;
  margin-bottom: 12px;
}
.mcard-val small {
  font-size: 11px; color: #334e68;
  font-family: 'IBM Plex Mono', monospace;
  margin-left: 3px; font-weight: 400;
}

.mcard-track { height: 2px; background: #0a1e35; border-radius: 1px; overflow: hidden; }
.mcard-fill  {
  height: 100%; background: var(--c); border-radius: 1px;
  transition: width 1s ease; max-width: 100%;
}

/* ── CHARTS ── */
.charts {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 1px;
  background: #0a1e35;
  min-height: 0;
}

.chart-box {
  background: #060f1f;
  padding: 12px 14px 6px;
  display: flex; flex-direction: column;
  min-width: 0; min-height: 0;
  overflow: hidden;
}

.chart-label {
  font-size: 10px; font-weight: 600; color: #334e68;
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 4px; flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}
.chart-label em {
  font-style: normal;
  padding: 1px 5px; border-radius: 3px;
  background: #0a1e35; color: #1e3a5a;
  font-size: 8px; letter-spacing: 0.12em;
}

.vchart { flex: 1; min-height: 0; width: 100%; }

/* ── FEED ── */
.feed {
  flex-shrink: 0;
  height: 190px;
  background: #060f1f;
  border-top: 1px solid #0a1e35;
  display: flex; flex-direction: column;
}

.feed-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px 6px;
  border-bottom: 1px solid #091828;
  flex-shrink: 0;
}
.feed-title {
  font-size: 10px; font-weight: 600; color: #334e68;
  font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase;
}
.feed-count { font-size: 10px; color: #162030; font-family: 'IBM Plex Mono', monospace; }

.feed-body { flex: 1; overflow-y: auto; }
.feed-body::-webkit-scrollbar { width: 2px; }
.feed-body::-webkit-scrollbar-thumb { background: #0a1e35; }

.feed-row {
  display: grid;
  grid-template-columns: 8px 68px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 6px 20px;
  border-bottom: 1px solid #060f1c;
}
.feed-row:hover { background: #07111f; }

.fdot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.fdot.error   { background: #f87171; box-shadow: 0 0 5px #f8717180; }
.fdot.warning { background: #fbbf24; box-shadow: 0 0 5px #fbbf2480; }
.fdot.info    { background: #38bdf8; box-shadow: 0 0 5px #38bdf880; }
.fdot.alert   { background: #a78bfa; box-shadow: 0 0 5px #a78bfa80; }

.ftime { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #1e3a5a; flex-shrink: 0; }
.fmsg  { font-size: 12px; color: #4a6480; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ftag  { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 0.1em; flex-shrink: 0; }
.ftag.error   { color: #f87171; }
.ftag.warning { color: #fbbf24; }
.ftag.info    { color: #38bdf8; }
.ftag.alert   { color: #a78bfa; }

/* ── ANIMATIONS ── */
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
.row-enter-active { transition: all 0.2s ease; }
.row-enter-from   { opacity: 0; transform: translateY(-4px); }

/* ── RESPONSIVE ── */

/* Tablet: 2x2 charts, 2x2 metrics */
@media (max-width: 1024px) {
  .charts {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  .c-wide { grid-column: span 1; }
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .feed { height: 160px; }
  .topbar-clock { font-size: 16px; }
}

/* Mobile: single column, scrollable */
@media (max-width: 640px) {
  .dash {
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }
  .topbar {
    padding: 0 12px;
    height: 48px;
    gap: 8px;
  }
  .topbar-center { display: none; }
  .brand-name { font-size: 11px; letter-spacing: 0.12em; }
  .live-pill { padding: 3px 8px; font-size: 9px; }
  .range-group { display: none; }
  .pause-label { display: none; }
  .pause-btn { padding: 5px 10px; }

  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .mcard { padding: 12px 14px; }

  .charts {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 200px);
    flex: none;
  }
  .vchart { height: 160px; }

  .feed { height: auto; max-height: 280px; }
  .feed-row { grid-template-columns: 8px 60px 1fr auto; gap: 8px; padding: 6px 12px; }
  .fmsg { font-size: 11px; }
}
</style>