# ⚡ Nexus Monitor — Real-Time Data Visualization Platform

A high-performance real-time analytics dashboard built with Vue 3 and TypeScript. Visualizes live-streaming system telemetry data with smooth chart updates, interactive controls, and a live activity feed — simulating a production-grade DevOps monitoring terminal.

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- npm v9+

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd realtime-dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open your browser at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🗂️ Project Structure

```
src/
├── assets/
│   ├── base.css              # CSS reset and base styles
│   └── main.css              # Global styles and Tailwind import
│
├── types/                    # TypeScript interfaces and type definitions
│   ├── metrics.ts            # MetricPoint, MetricCard interfaces
│   ├── stream.ts             # StreamEvent, StreamStatus types
│   └── chart.ts              # ChartType, ChartDataset interfaces
│
├── utils/                    # Pure utility functions
│   ├── dataGenerator.ts      # Simulated real-time data generator
│   ├── formatters.ts         # Date and number formatting helpers
│   └── validators.ts         # Input validation and data guards
│
├── stores/                   # Pinia state management
│   ├── streamStore.ts        # Activity feed stream control
│   └── metricsStore.ts       # Chart metrics data management
│
├── composables/              # Reusable Vue composition functions
│   ├── useChartData.ts       # Extracts chart-ready arrays from store
│   └── useThrottle.ts        # Throttle utility for render control
│
├── views/
│   ├── DashboardView.vue     # Main dashboard — all panels assembled
│   └── NotFoundView.vue      # 404 fallback page
│
├── router/
│   └── index.ts              # Vue Router configuration
│
├── App.vue                   # Root component
└── main.ts                   # App entry point
```

---

## 🏗️ Architecture Explanation

### Component Architecture

The application follows a **single-view, multi-store** architecture. The `DashboardView.vue` is the sole consumer of data — it imports both Pinia stores and all chart configurations live as `computed()` properties that reactively derive from store state.

```
dataGenerator.ts  →  Pinia Stores  →  computed()  →  ECharts / Template
(data source)        (state layer)    (derived)       (render layer)
```

This separation means:
- The data source can be swapped (mock → WebSocket) without touching components
- The stores can be tested independently of the UI
- Charts always reflect the latest store state automatically

### Data Flow

```
setInterval (800ms / 1000ms)
        │
        ▼
dataGenerator.ts
  generateStreamEvent()   →   streamStore.events[]
  generateMetricPoint()   →   metricsStore.metrics[].history[]
        │
        ▼
Vue reactivity system detects change
        │
        ▼
computed() properties recalculate labels and values
        │
        ▼
ECharts re-renders affected chart regions only
        │
        ▼
DOM updates — user sees live data
```

---

## 🗄️ State Management Strategy

State is managed with **Pinia** — Vue's official state management library.

### `streamStore.ts`
Owns the **live activity feed**:

| Property / Method | Purpose |
|---|---|
| `events` | Reactive array of StreamEvent objects (max 100) |
| `status` | Current stream status: connected / paused / error |
| `isPaused` | Boolean toggle for stream control |
| `recentEvents` | Computed — last 50 events, newest first |
| `startStream()` | Starts the setInterval data generator |
| `togglePause()` | Pauses/resumes without clearing data |
| `cleanup()` | Clears interval on component unmount |

### `metricsStore.ts`
Owns the **chart metric data**:

| Property / Method | Purpose |
|---|---|
| `metrics` | Array of 4 MetricCard objects with live history |
| `startUpdating()` | Starts 1-second metric tick |
| `stopUpdating()` | Clears interval on unmount |

### Why Pinia over Vuex?
- Composition API native — no more mutations/actions boilerplate
- Full TypeScript inference out of the box
- Smaller bundle size
- Devtools support built in

---

## ⚡ Rendering Optimization Decisions

### 1. Bounded Data Arrays
```ts
const MAX_EVENTS = 100
const MAX_HISTORY = 60

// Stream store — evict oldest on overflow
if (events.value.length > MAX_EVENTS) events.value.pop()

// Metrics store — shift oldest point
if (metric.history.length > MAX_HISTORY) metric.history.shift()
```
Prevents arrays from growing unboundedly. Without this cap, a 1-hour session would accumulate 3,600+ data points per metric — causing progressive memory growth and chart slowdown.

### 2. Cleanup on Unmount
```ts
onUnmounted(() => {
  streamStore.cleanup()        // clears stream setInterval
  metricsStore.stopUpdating()  // clears metrics setInterval
  clearInterval(clockTimer)    // clears clock setInterval
})
```
Every interval registered in `onMounted` is explicitly cleared in `onUnmounted`. This is the most critical memory leak prevention in any real-time Vue app.

### 3. Computed Chart Data
```ts
const lbs = (id: string) => computed(() =>
  g(id)?.history.map(p => dayjs(p.timestamp).format('HH:mm:ss')) ?? []
)
```
Vue's `computed()` caches results and only recalculates when reactive dependencies change — meaning chart labels and values are not reprocessed on every render cycle, only when the underlying store data updates.

### 4. ECharts with `autoresize`
```html
<v-chart :option="lineOpt" autoresize />
```
ECharts handles its own canvas resize via ResizeObserver internally. No manual `window.addEventListener('resize')` handlers are needed, eliminating a common source of event listener leaks.

### 5. Throttle Composable
```ts
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
```
Ensures that high-frequency updates are gated — preventing the rendering pipeline from being overwhelmed during data bursts.

### 6. TransitionGroup for Feed
```html
<TransitionGroup name="row">
  <div v-for="ev in streamStore.recentEvents" :key="ev.id" ...>
```
Vue's `TransitionGroup` uses the FLIP animation technique — it calculates positions before and after DOM changes and animates only the delta. This is far more performant than CSS-only approaches for list updates.

---

## 📡 Data Streaming Approach

### Current Implementation — Mocked Generator

The app uses a **mocked streaming generator** via `setInterval`:

```ts
// streamStore.ts
intervalId = setInterval(() => {
  if (isPaused.value) return
  const event = generateStreamEvent()
  events.value.unshift(event)        // newest first
  if (events.value.length > MAX_EVENTS) events.value.pop()
}, 800)

// metricsStore.ts
intervalId = setInterval(() => {
  metrics.value.forEach(metric => {
    const point = generateMetricPoint(metric.id)
    metric.history.push(point)
    if (metric.history.length > MAX_HISTORY) metric.history.shift()
  })
}, 1000)
```

- Stream tick: **800ms** — activity feed events
- Metrics tick: **1000ms** — chart data points

### Upgrading to Real WebSocket

The store architecture is designed for this upgrade. Replace the `setInterval` block in each store with:

```ts
const ws = new WebSocket('wss://your-server/stream')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // same store update logic — nothing in components changes
}

ws.onerror = () => { status.value = 'error' }
ws.onclose = () => { /* reconnect logic here */ }
```

No component code needs to change — only the store internals.

---

## 📊 Charts & Visualizations

| Chart | Type | Metric | Color |
|---|---|---|---|
| CPU Usage | Line + Area fill | Processor load % | Sky blue `#38bdf8` |
| Memory | Bar | RAM usage GB | Violet `#a78bfa` |
| Network I/O | Area | Transfer rate MB/s | Emerald `#34d399` |
| Requests/sec | Area | API request rate | Pink `#f472b6` |

All charts use **ECharts** via `vue-echarts` with:
- `smooth: true` — bezier curve interpolation
- `showSymbol: false` — no dots on data points (cleaner at high frequency)
- `autoresize` — responsive to container size changes
- Gradient area fills — visual depth without performance cost

---

## 📱 Responsive Design

| Breakpoint | Layout |
|---|---|
| Desktop `1024px+` | 4-column charts, 4-column metric cards, full topbar |
| Tablet `640–1024px` | 2×2 chart grid, 2-column metric cards |
| Mobile `< 640px` | Single column, clock hidden, range filters hidden, scrollable |

CSS Grid with `minmax(0, 1fr)` columns prevents overflow. `clamp()` on metric value font sizes ensures numbers scale proportionally across screen sizes.

---

## 🛡️ Error Handling & Resilience

| Scenario | Handling |
|---|---|
| Undefined array value | `?? 'fallback'` nullish coalescing in dataGenerator |
| Empty metric history | `computed()` returns `[]` — charts render empty gracefully |
| Long feed messages | `text-overflow: ellipsis` — never breaks layout |
| Component unmount | All intervals cleared in `onUnmounted` |
| Malformed data type | TypeScript union types reject invalid values at compile time |

---

## ⚖️ Trade-offs Made

| Decision | Trade-off |
|---|---|
| **Mock generator over WebSocket** | Portable, zero backend dependency. Easily upgradeable — store architecture supports WebSocket without component changes |
| **ECharts over D3** | ECharts provides production-ready chart types out of the box. D3 offers more customization but requires significantly more implementation time |
| **60-point history cap** | Limits visible time window but guarantees bounded memory. In production, this would be configurable per time-range filter |
| **Single view architecture** | Simpler to demonstrate and present. A larger app would split charts into individual components with their own composables |
| **setInterval over RxJS** | Lower complexity, no additional dependency. RxJS would provide better backpressure handling for very high-frequency streams |
| **IBM Plex fonts via CDN** | Requires internet connection. For fully offline builds, fonts would be bundled locally |

---

## 🧰 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Vue 3 | ^3.x | UI framework with Composition API |
| TypeScript | ^5.x | Static typing and compile-time safety |
| Pinia | ^2.x | Centralized state management |
| ECharts | ^5.x | High-performance chart rendering |
| vue-echarts | ^7.x | Vue wrapper for ECharts |
| Day.js | ^1.x | Lightweight timestamp formatting |
| Tailwind CSS | ^4.x | Utility-first CSS framework |
| Vite | ^6.x | Build tool and dev server |



