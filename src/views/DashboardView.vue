<template>
  <div class="dash" :class="{ light: !uiStore.isDark }">

    <!-- TOP BAR -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand">
          <div class="brand-dot"></div>
          <span class="brand-name">NEXUS</span>
        </div>

        <!-- Stream Status Indicator -->
        <div class="status-pill" :class="streamStore.status">
          <span class="pulse-dot"></span>
          {{ statusLabel }}
        </div>
      </div>

      <div class="topbar-center">
        <span class="topbar-clock">{{ currentTime }}</span>
      </div>

      <div class="topbar-right">
        <!-- Time Range Filters -->
        <div class="range-group">
          <button v-for="r in ranges" :key="r.label"
            :class="['rbtn', { active: activeRange === r.label }]"
            @click="setRange(r)">{{ r.label }}</button>
        </div>

        <!-- Simulate Reconnect -->
        <button class="icon-btn" title="Simulate reconnect" @click="streamStore.simulateReconnect">
          ↺
        </button>

        <!-- Dark / Light Mode -->
        <button class="icon-btn" :title="uiStore.isDark ? 'Light mode' : 'Dark mode'"
          @click="uiStore.toggleTheme">
          {{ uiStore.isDark ? '☀' : '☾' }}
        </button>

        <!-- Pause / Resume -->
        <button class="pause-btn" @click="handlePauseToggle">
          {{ streamStore.isPaused ? '▶ Resume' : '⏸ Pause' }}
        </button>
      </div>
    </header>

    <!-- METRIC CARDS -->
    <section class="metrics">
      <div v-for="(metric, i) in metricsStore.metrics" :key="metric.id"
        class="mcard" :style="{ '--c': colors[i] }">
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

    <!-- RECONNECTING OVERLAY -->
    <Transition name="overlay">
      <div v-if="streamStore.status === 'reconnecting'" class="reconnect-overlay">
        <div class="reconnect-box">
          <div class="reconnect-spinner"></div>
          <p class="reconnect-title">Reconnecting...</p>
          <p class="reconnect-sub">Stream interrupted. Attempting to restore connection.</p>
        </div>
      </div>
    </Transition>

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
import { useUiStore } from '@/stores/uiStore'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'

use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const streamStore  = useStreamStore()
const metricsStore = useMetricsStore()
const uiStore      = useUiStore()

// ── TIME RANGES ──────────────────────────────────────────
const ranges = [
  { label: '1M',  minutes: 1  },
  { label: '5M',  minutes: 5  },
  { label: '1H',  minutes: 60 },
  { label: 'LIVE',minutes: 0  },
]
const activeRange = ref('LIVE')
const activeMinutes = ref(0)

function setRange(r: { label: string; minutes: number }) {
  activeRange.value = r.label
  activeMinutes.value = r.minutes
}

// ── PAUSE — stops BOTH stream and metrics ────────────────
function handlePauseToggle() {
  if (streamStore.isPaused) {
    streamStore.togglePause()
    metricsStore.startUpdating()
  } else {
    streamStore.togglePause()
    metricsStore.stopUpdating()
  }
}

// ── STATUS LABEL ─────────────────────────────────────────
const statusLabel = computed(() => {
  switch (streamStore.status) {
    case 'connected':    return 'LIVE'
    case 'paused':       return 'PAUSED'
    case 'reconnecting': return 'RECONNECTING'
    case 'error':        return 'ERROR'
    default:             return 'UNKNOWN'
  }
})

// ── CLOCK ────────────────────────────────────────────────
const currentTime = ref(dayjs().format('HH:mm:ss'))
let clockTimer: ReturnType<typeof setInterval>

const fmt = (ts: number) => dayjs(ts).format('HH:mm:ss')

// ── COLORS ───────────────────────────────────────────────
const colors = ['#38bdf8', '#a78bfa', '#34d399', '#f472b6']

// ── CHART DATA (respects time range filter) ───────────────
const filteredHistory = (id: string) => computed(() =>
  metricsStore.getHistory(id, activeMinutes.value)
)

const lbs = (id: string) => computed(() =>
  filteredHistory(id).value.map(p => dayjs(p.timestamp).format('HH:mm:ss'))
)
const vs = (id: string) => computed(() =>
  filteredHistory(id).value.map(p => +p.value.toFixed(1))
)

// ── CHART THEME (respects dark/light) ────────────────────
const axisColor  = computed(() => uiStore.isDark ? '#1e3350' : '#cbd5e1')
const labelColor = computed(() => uiStore.isDark ? '#2d4a6a' : '#94a3b8')
const splitColor = computed(() => uiStore.isDark ? '#0d1f35' : '#e2e8f0')
const tooltipBg  = computed(() => uiStore.isDark ? '#0b1628' : '#ffffff')
const tooltipTxt = computed(() => uiStore.isDark ? '#94a3b8' : '#334155')
const tooltipBdr = computed(() => uiStore.isDark ? '#1e3350' : '#e2e8f0')

const chartBase = () => ({
  backgroundColor: 'transparent',
  grid: { left: 44, right: 8, top: 8, bottom: 28 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: tooltipBg.value,
    borderColor: tooltipBdr.value,
    textStyle: { color: tooltipTxt.value, fontSize: 11 }
  },
  xAxis: {
    type: 'category',
    axisLine: { lineStyle: { color: axisColor.value } },
    axisTick: { show: false },
    axisLabel: { color: labelColor.value, fontSize: 9 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: splitColor.value, type: 'dashed' } },
    axisLabel: { color: labelColor.value, fontSize: 9 }
  }
})

const lineOpt = computed(() => ({
  ...chartBase(),
  xAxis: { ...chartBase().xAxis, data: lbs('cpu').value },
  series: [{
    type: 'line', data: vs('cpu').value, smooth: true,
    color: '#38bdf8', showSymbol: false, lineStyle: { width: 2 },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: '#38bdf825' }, { offset: 1, color: '#38bdf800' }] } }
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
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: '#34d39925' }, { offset: 1, color: '#34d39900' }] } }
  }]
}))

const reqOpt = computed(() => ({
  ...chartBase(),
  xAxis: { ...chartBase().xAxis, data: lbs('requests').value },
  series: [{
    type: 'line', data: vs('requests').value, smooth: true,
    color: '#f472b6', showSymbol: false, lineStyle: { width: 2 },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: '#f472b625' }, { offset: 1, color: '#f472b600' }] } }
  }]
}))

// ── LIFECYCLE ────────────────────────────────────────────
onMounted(() => {
  uiStore.init()
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

/* ── THEME TOKENS ── */
.dash {
  --bg:        #040c18;
  --bg2:       #060f1f;
  --border:    #0a1e35;
  --border2:   #0f2240;
  --text:      #cbd5e1;
  --text-dim:  #334e68;
  --text-mute: #1e3a5a;
  --hover:     #07111f;
}

.dash.light {
  --bg:        #f0f4f8;
  --bg2:       #ffffff;
  --border:    #dde3ea;
  --border2:   #c8d0da;
  --text:      #1e293b;
  --text-dim:  #64748b;
  --text-mute: #94a3b8;
  --hover:     #f8fafc;
}

/* ── ROOT ── */
.dash {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  color: var(--text);
  overflow: hidden;
  position: relative;
  transition: background 0.3s, color 0.3s;
}

/* ── TOPBAR ── */
.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  position: relative;
  gap: 12px;
}

.topbar-left  { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.topbar-center {
  position: absolute; left: 50%; transform: translateX(-50%);
  pointer-events: none;
}
.topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: auto; }

.brand { display: flex; align-items: center; gap: 8px; }
.brand-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #38bdf8; box-shadow: 0 0 8px #38bdf8aa;
}
.brand-name {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px; font-weight: 500;
  letter-spacing: 0.18em; color: var(--text);
}

/* ── STATUS PILL ── */
.status-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 20px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px; font-weight: 500;
  letter-spacing: 0.1em; white-space: nowrap;
  transition: all 0.3s;
}
.status-pill.connected    { background: #03180d; border: 1px solid #0a4020; color: #34d399; }
.status-pill.paused       { background: #160f00; border: 1px solid #4a3000; color: #fbbf24; }
.status-pill.reconnecting { background: #0d0a1f; border: 1px solid #2d1a6a; color: #a78bfa; }
.status-pill.error        { background: #1a0505; border: 1px solid #4a0a0a; color: #f87171; }

.dash.light .status-pill.connected    { background: #dcfce7; border-color: #86efac; color: #16a34a; }
.dash.light .status-pill.paused       { background: #fef9c3; border-color: #fde047; color: #ca8a04; }
.dash.light .status-pill.reconnecting { background: #ede9fe; border-color: #c4b5fd; color: #7c3aed; }
.dash.light .status-pill.error        { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

.pulse-dot {
  width: 6px; height: 6px; border-radius: 50%; background: currentColor;
  animation: blink 1.4s infinite;
}
.status-pill.paused .pulse-dot,
.status-pill.error .pulse-dot { animation: none; }
.status-pill.reconnecting .pulse-dot { animation: blink 0.6s infinite; }

.topbar-clock {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 20px; font-weight: 400;
  color: var(--text); letter-spacing: 0.12em;
}

/* ── RANGE BUTTONS ── */
.range-group {
  display: flex;
  background: var(--bg2); border: 1px solid var(--border2); border-radius: 6px; overflow: hidden;
}
.rbtn {
  padding: 4px 10px; background: transparent; border: none;
  color: var(--text-mute); font-size: 10px; font-weight: 600;
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.rbtn:hover { color: var(--text-dim); }
.rbtn.active { background: var(--border); color: #38bdf8; }

/* ── ICON BUTTONS ── */
.icon-btn {
  width: 32px; height: 32px;
  background: var(--bg2); border: 1px solid var(--border2); border-radius: 6px;
  color: var(--text-dim); font-size: 16px;
  cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover { border-color: #38bdf8; color: #38bdf8; }

.pause-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 14px;
  background: var(--bg2); border: 1px solid var(--border2); border-radius: 6px;
  color: var(--text-dim); font-size: 11px; font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.pause-btn:hover { border-color: #38bdf8; color: var(--text); }

/* ── METRICS ── */
.metrics {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px; background: var(--border);
  border-bottom: 1px solid var(--border);
}

.mcard {
  background: var(--bg2); padding: 16px 20px;
  position: relative; overflow: hidden; transition: background 0.2s;
}
.mcard::after {
  content: ''; position: absolute;
  bottom: 0; left: 0; right: 0; height: 2px;
  background: var(--c); opacity: 0.7;
}

.mcard-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.mcard-label {
  font-size: 10px; font-weight: 600; color: var(--text-dim);
  font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase;
}
.mcard-badge { font-size: 13px; font-weight: 700; }
.mcard-badge.up     { color: #34d399; }
.mcard-badge.down   { color: #f87171; }
.mcard-badge.stable { color: var(--text-mute); }

.mcard-val {
  font-size: clamp(22px, 2.5vw, 34px); font-weight: 700; color: var(--c);
  font-variant-numeric: tabular-nums; line-height: 1; margin-bottom: 12px;
}
.mcard-val small {
  font-size: 11px; color: var(--text-dim);
  font-family: 'IBM Plex Mono', monospace; margin-left: 3px; font-weight: 400;
}
.mcard-track { height: 2px; background: var(--border); border-radius: 1px; overflow: hidden; }
.mcard-fill  { height: 100%; background: var(--c); border-radius: 1px; transition: width 1s ease; max-width: 100%; }

/* ── CHARTS ── */
.charts {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 1px; background: var(--border); min-height: 0;
}

.chart-box {
  background: var(--bg2); padding: 12px 14px 6px;
  display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden;
}
.chart-label {
  font-size: 10px; font-weight: 600; color: var(--text-dim);
  font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 4px; flex-shrink: 0; display: flex; align-items: center; gap: 6px;
}
.chart-label em {
  font-style: normal; padding: 1px 5px; border-radius: 3px;
  background: var(--border); color: var(--text-mute);
  font-size: 8px; letter-spacing: 0.12em;
}
.vchart { flex: 1; min-height: 0; width: 100%; }

/* ── RECONNECT OVERLAY ── */
.reconnect-overlay {
  position: absolute; inset: 0; z-index: 50;
  background: rgba(4, 12, 24, 0.85);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.dash.light .reconnect-overlay { background: rgba(240, 244, 248, 0.85); }

.reconnect-box {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px 48px; border-radius: 16px;
  background: var(--bg2); border: 1px solid #2d1a6a;
  box-shadow: 0 0 40px #a78bfa22;
}
.reconnect-spinner {
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: #a78bfa;
  animation: spin 0.8s linear infinite;
}
.reconnect-title { font-size: 16px; font-weight: 600; color: #a78bfa; }
.reconnect-sub { font-size: 12px; color: var(--text-dim); text-align: center; max-width: 260px; }

/* ── FEED ── */
.feed {
  flex-shrink: 0; height: 190px;
  background: var(--bg2); border-top: 1px solid var(--border);
  display: flex; flex-direction: column;
}
.feed-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px 6px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.feed-title {
  font-size: 10px; font-weight: 600; color: var(--text-dim);
  font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase;
}
.feed-count { font-size: 10px; color: var(--text-mute); font-family: 'IBM Plex Mono', monospace; }
.feed-body { flex: 1; overflow-y: auto; }
.feed-body::-webkit-scrollbar { width: 2px; }
.feed-body::-webkit-scrollbar-thumb { background: var(--border); }

.feed-row {
  display: grid; grid-template-columns: 8px 68px 1fr auto;
  align-items: center; gap: 14px; padding: 6px 20px;
  border-bottom: 1px solid var(--bg);
}
.feed-row:hover { background: var(--hover); }

.fdot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.fdot.error   { background: #f87171; box-shadow: 0 0 5px #f8717180; }
.fdot.warning { background: #fbbf24; box-shadow: 0 0 5px #fbbf2480; }
.fdot.info    { background: #38bdf8; box-shadow: 0 0 5px #38bdf880; }
.fdot.alert   { background: #a78bfa; box-shadow: 0 0 5px #a78bfa80; }

.ftime { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--text-mute); flex-shrink: 0; }
.fmsg  { font-size: 12px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ftag  { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 0.1em; flex-shrink: 0; }
.ftag.error   { color: #f87171; }
.ftag.warning { color: #fbbf24; }
.ftag.info    { color: #38bdf8; }
.ftag.alert   { color: #a78bfa; }

/* ── ANIMATIONS ── */
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
@keyframes spin   { to { transform: rotate(360deg); } }

.overlay-enter-active, .overlay-leave-active { transition: opacity 0.3s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.row-enter-active { transition: all 0.2s ease; }
.row-enter-from   { opacity: 0; transform: translateY(-4px); }

/* ── RESPONSIVE ── */
/* ── RESPONSIVE ── */
@media (max-width: 1024px) {
  .charts {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .feed { height: 160px; }
  .topbar-clock { font-size: 16px; }
}

@media (max-width: 640px) {
  /* Allow scroll on mobile */
  .dash {
    height: auto;
    min-height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100vw;
  }

  /* Topbar — tighter, no overflow */
  .topbar {
    padding: 0 10px;
    height: 44px;
    gap: 6px;
    flex-wrap: nowrap;
    overflow: hidden;
  }
  .topbar-center { display: none; }
  .topbar-left { gap: 8px; min-width: 0; flex-shrink: 1; }
  .topbar-right { gap: 6px; flex-shrink: 0; }
  .brand-name { font-size: 10px; letter-spacing: 0.1em; }
  .range-group { display: none; }

  /* Hide pause label text, show icon only */
  .pause-btn {
    padding: 4px 8px;
    font-size: 10px;
  }

  /* Status pill smaller */
  .status-pill {
    padding: 2px 7px;
    font-size: 9px;
  }

  /* Metric cards — 2 col, no overflow */
  .metrics {
    grid-template-columns: repeat(2, 1fr);
    flex-shrink: 0;
  }
  .mcard {
    padding: 10px 12px;
    min-width: 0;
    overflow: hidden;
  }
  .mcard-val {
    font-size: 22px;
  }
  .mcard-val small { font-size: 10px; }
  .mcard-label { font-size: 9px; }

  /* Charts — single column, fixed height, no overflow */
  .charts {
    display: flex;
    flex-direction: column;
    flex: none;
    gap: 1px;
    width: 100%;
    overflow: hidden;
  }
  .chart-box {
    width: 100%;
    min-width: 0;
    height: 200px;
    flex-shrink: 0;
    overflow: hidden;
    padding: 10px 10px 6px;
  }
  .vchart {
    width: 100% !important;
    height: 155px !important;
  }

  /* Feed */
  .feed {
    height: auto;
    max-height: 260px;
    flex-shrink: 0;
  }
  .feed-row {
    grid-template-columns: 6px 56px 1fr auto;
    gap: 8px;
    padding: 5px 10px;
  }
  .fmsg { font-size: 11px; }
  .ftag { font-size: 8px; }
  .ftime { font-size: 9px; }
}
</style>