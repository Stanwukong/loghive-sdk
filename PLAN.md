# PLAN.md — Monita SDK Development Roadmap

> **Component**: `loghive-sdk/` — JavaScript/TypeScript SDK (npm: `monita`)
> **Parent Plan**: [../PLAN.md](../PLAN.md)
> **Product Spec**: [../PRODUCT.md](../PRODUCT.md)

---

## Current State

The SDK is functional with core features implemented:
- 6 manual log levels (trace → fatal)
- Auto-instrumentation: errors, performance, network, page views, user interactions, console
- PII sanitization: 10 built-in patterns, 3 presets, audit trail
- Batching (10 logs/5s default) with exponential backoff retry (max 3)
- Advanced features: session manager, custom events, feature flags, A/B testing, performance monitor
- CommonJS output only, no tests, no offline support

**Key Gaps**: Zero test coverage, potential memory leaks, no framework integrations, no compression, no circuit breaker, CJS only.

---

## Phase 0: Stabilization

**Goal**: Fix all bugs and add guards against existing issues.

### 0.1 Memory Safety
- [x] **Buffer overflow protection**: Cap `_logBuffer` at a configurable max (default 1000 logs). When full, drop oldest logs (ring buffer behavior).
- [x] **Audit trail cap**: Verify audit trail rotates at 1000 entries (it does, but add test).
- [x] **Event listener cleanup**: Verify `destroy()` removes ALL event listeners (window.onerror, unhandledrejection, history patches, fetch/XHR patches, console patches, click/scroll/keypress/focus/blur, beforeunload, SIGINT, SIGTERM).
- [x] **Interval cleanup**: Verify `shutdown()` clears the flush interval timer.

**Files to modify**:
- `src/logger.ts` — Add buffer size limit, improve shutdown
- `src/auto-instrumentation.ts` — Verify destroy() completeness

### 0.2 Double-Initialization Guard
- [x] Add `_initialized` flag to prevent `init()` from being called twice
- [x] If `init()` is called again, log a warning and return (don't re-patch)
- [x] Add `isInitialized()` public method

**File**: `src/logger.ts`

### 0.3 Retry Logic Fixes
- [x] Verify `getExponentialBackoffDelay()` doesn't exceed `maxRetryDelay` (cap at 60s)
- [x] Handle the case where `maxRetries` is 0 (no retries)
- [x] Verify failed logs are re-queued at buffer FRONT (not back) — confirmed in code, add test
- [x] Handle network offline scenario (don't retry infinitely, check `navigator.onLine`)

**File**: `src/logger.ts`, `src/utils.ts`

### 0.4 Auto-Instrumentation Fixes
- [x] **Fetch patching**: Handle `Request` objects as first argument (not just strings/URLs)
- [x] **XHR patching**: Verify `_loggerData` doesn't leak between requests
- [x] **Console patching**: Prevent infinite recursion if SDK itself logs to console
- [x] **History patching**: Verify `replaceState` and `pushState` patches are correct
- [x] **Performance observer**: Handle browsers that don't support `PerformanceObserver`
- [x] **Throttle cleanup**: Verify scroll/keypress throttle timers are cleaned up on destroy

**File**: `src/auto-instrumentation.ts`

### 0.5 Data Sanitizer Fixes
- [x] Verify deep clone handles all edge cases: Date objects, RegExp, typed arrays, Map, Set
- [x] Verify regex patterns don't have catastrophic backtracking (test with long strings)
- [x] Add timeout guard for sanitization (if it takes >100ms, skip and log warning)
- [x] Handle `null` and `undefined` gracefully in recursive sanitization

**File**: `src/data-sanitizer.ts`

### 0.6 Type Safety
- [x] Add `strict: true` to tsconfig.json if not already set
- [x] Fix any `any` types that could cause runtime errors
- [x] Verify all public API methods have correct TypeScript signatures
- [x] Ensure `LoggerConfig` interface marks optional fields correctly
- [x] Verify `LogLevel` enum values match backend expectations

**File**: `src/types.ts`, `tsconfig.json`

---

## Phase 1: Testing & Build Infrastructure

**Goal**: Add comprehensive test coverage and modernize the build system.

### 1.1 Test Suite Setup

**Duration**: 3-4 days

- [ ] Install test framework: Vitest (fast, TypeScript-native, ESM-friendly)
- [ ] Configure test environment: jsdom for browser tests, node for Node.js tests
- [ ] Set up coverage reporting (target: 80%+)
- [ ] Add test scripts to package.json

**File structure**:
```
loghive-sdk/
├── src/
├── tests/
│   ├── logger.test.ts              ← Core logger tests
│   ├── auto-instrumentation.test.ts ← Event capture tests
│   ├── data-sanitizer.test.ts      ← PII detection tests
│   ├── log-level-logic.test.ts     ← Level assignment tests
│   ├── advanced-features.test.ts   ← Utility class tests
│   ├── utils.test.ts               ← Utility function tests
│   ├── integration.test.ts         ← End-to-end flow tests
│   └── fixtures/                   ← Test data
├── vitest.config.ts
```

### 1.2 Core Logger Tests

- [ ] **Initialization**: config defaults, custom config, missing required fields
- [ ] **Log methods**: each level creates correct log entry, respects minLogLevel
- [ ] **Batching**: buffer fills to batchSize then flushes, timer-based flush at interval
- [ ] **Retry**: exponential backoff calculation, max retries, re-queue on failure
- [ ] **Context**: setContext merges, getContext returns current, context in every log
- [ ] **Shutdown**: flushes remaining, clears intervals, removes event listeners
- [ ] **captureException**: extracts error details correctly
- [ ] **captureMessage**: creates log with correct level and context
- [ ] **Breadcrumbs**: addBreadcrumb stores, breadcrumbs attached to logs

### 1.3 Auto-Instrumentation Tests

- [ ] **Error capture**: window.onerror handler creates correct log entry
- [ ] **Promise rejection**: unhandledrejection creates correct log entry
- [ ] **Performance**: PerformanceObserver callback creates correct entries
- [ ] **Fetch**: patched fetch logs request/response correctly, handles errors
- [ ] **XHR**: patched XHR logs request/response correctly
- [ ] **Console**: hijacked console.error/warn create correct log entries
- [ ] **Page views**: initial load, pushState, replaceState, popstate all captured
- [ ] **User interactions**: click, scroll (throttled), keypress (throttled), focus, blur
- [ ] **Destroy**: all original functions restored, all listeners removed

### 1.4 Data Sanitizer Tests

- [ ] **PII patterns**: test each of 10 patterns with valid and invalid inputs
  - Email: `john@example.com` → `[EMAIL_REDACTED]`
  - SSN: `123-45-6789` → `[SSN_REDACTED]`
  - Credit card: `4111 1111 1111 1111` → `[CARD_REDACTED]`
  - Phone: various formats → `[PHONE_REDACTED]`
  - IP: `192.168.1.1` → `[IP_REDACTED]`
  - API key: long alphanumeric strings → `[API_KEY_REDACTED]`
  - JWT: `eyJ...` → `[JWT_REDACTED]`
  - Bank account, driver's license, passport
- [ ] **Nested objects**: PII in deeply nested structures
- [ ] **Arrays**: PII in array elements
- [ ] **Circular references**: handled without crash
- [ ] **Custom rules**: add rule, remove rule, rule applied correctly
- [ ] **Presets**: STRICT, BALANCED, LENIENT each apply correct config
- [ ] **Audit trail**: operations logged, capped at 1000
- [ ] **Field anonymization**: password, secret, token fields anonymized

### 1.5 Build System Modernization

**Duration**: 2-3 days

- [ ] Switch from tsc to tsup or Rollup for optimized builds
- [ ] Dual output: CommonJS (`dist/cjs/`) + ESM (`dist/esm/`)
- [ ] Generate source maps for debugging
- [ ] Tree-shakeable ESM exports
- [ ] Bundle size monitoring (target: < 15KB gzipped for core)
- [ ] Update package.json exports field for dual output:
  ```json
  {
    "main": "dist/cjs/index.js",
    "module": "dist/esm/index.js",
    "types": "dist/types/index.d.ts",
    "exports": {
      ".": {
        "import": "./dist/esm/index.js",
        "require": "./dist/cjs/index.js",
        "types": "./dist/types/index.d.ts"
      }
    }
  }
  ```

### 1.6 Circuit Breaker

**Duration**: 1 day

- [ ] Implement circuit breaker pattern:
  - **Closed** (normal): All requests pass through
  - **Open** (failed): After N consecutive failures, stop sending for cooldown period
  - **Half-open** (testing): After cooldown, try one request. If success → closed, if fail → open
- [ ] Configurable: `failureThreshold` (default 5), `cooldownMs` (default 30000)
- [ ] Log state transitions
- [ ] Buffer logs during open state (up to max buffer size), flush on close

**File to create**: `src/circuit-breaker.ts`

### 1.7 Log Compression

**Duration**: 1 day

- [ ] Gzip/deflate compression for payloads > 1KB
- [ ] Use `CompressionStream` in browsers that support it
- [ ] Fallback to pako for older browsers
- [ ] Set `Content-Encoding: gzip` header
- [ ] Configurable: `compression: true|false` (default true in production)

### 1.8 SDK Health Metrics

**Duration**: 1 day

- [ ] Track internal metrics:
  - Logs buffered / flushed / dropped / retried
  - Flush success rate
  - Average flush duration
  - Buffer high watermark
  - Circuit breaker state changes
  - Sanitization operations count
- [ ] Expose via `getHealthMetrics()` method
- [ ] Optionally send as periodic health log (configurable, default off)

**File to create**: `src/health-metrics.ts`

---

## Phase 2: Enhanced Capabilities

**Goal**: Add features that make the SDK production-ready for serious applications.

### 2.1 Offline Support

**Duration**: 2-3 days

- [ ] Detect online/offline status (`navigator.onLine`, `online`/`offline` events)
- [ ] When offline: queue logs in memory (within buffer limit)
- [ ] When back online: flush queued logs
- [ ] Optional IndexedDB persistence for critical logs (configurable)
- [ ] Sync indicator: `onSyncComplete` callback

**File to create**: `src/offline-manager.ts`

### 2.2 Remote Configuration

**Duration**: 2 days

- [ ] On `init()`, fetch SDK configuration from backend (`GET /sdk-config/:projectId`)
- [ ] Apply remote config: minLogLevel, batchSize, flushInterval, autoCapture toggles, sanitization preset
- [ ] Local config takes precedence over remote (merge strategy)
- [ ] Periodic config refresh (configurable interval, default 5 minutes)
- [ ] Graceful fallback if fetch fails (use local config)

**File to create**: `src/remote-config.ts`

### 2.3 Distributed Tracing

**Duration**: 3-4 days

- [ ] Generate trace IDs (UUID v4) for each user session/request
- [ ] Propagate trace ID via HTTP headers (`X-Trace-ID`)
- [ ] Attach trace ID to all logs within a trace context
- [ ] `startTrace()` / `endTrace()` manual API
- [ ] Auto-create traces for page navigations and network requests
- [ ] Parent-child span relationships

**Files to create**:
- `src/tracing/trace-context.ts`
- `src/tracing/span.ts`
- `src/tracing/propagator.ts`

### 2.4 Core Web Vitals Auto-Capture

**Duration**: 2 days

- [ ] Auto-capture LCP (Largest Contentful Paint) via PerformanceObserver
- [ ] Auto-capture CLS (Cumulative Layout Shift) via PerformanceObserver
- [ ] Auto-capture FID/INP (First Input Delay / Interaction to Next Paint)
- [ ] Report as performance events with `eventType: "web-vital"`
- [ ] Smart log levels: Good (DEBUG), Needs Improvement (INFO), Poor (WARN)
- [ ] Thresholds per Google's Core Web Vitals guidelines

**File to modify**: `src/auto-instrumentation.ts`

### 2.5 Enhanced Error Context

**Duration**: 1-2 days

- [ ] Capture last N user interactions before an error (breadcrumb trail)
- [ ] Capture current URL, referrer, viewport size, scroll position
- [ ] Capture network state (online/offline, connection type if available)
- [ ] Capture memory usage (if `performance.memory` available)
- [ ] Attach to error logs as `context.breadcrumbs`, `context.environment`

### 2.6 Source Map Support

**Duration**: 2-3 days

- [ ] CLI command to upload source maps: `monita upload-sourcemaps --release 1.0.0`
- [ ] Attach release version to all logs: `release` field
- [ ] Backend stores source maps and de-minifies stack traces on display
- [ ] Integration with build tools (webpack plugin, vite plugin)

**Files to create**:
- `cli/upload-sourcemaps.ts`
- `plugins/webpack.ts` (webpack plugin)
- `plugins/vite.ts` (vite plugin)

---

## Phase 3: Framework SDKs

**Goal**: Create framework-specific wrappers that provide idiomatic integration.

### 3.1 React SDK (`@monita/react`)

**Duration**: 5-7 days

**Package structure**:
```
packages/react/
├── src/
│   ├── MonitaProvider.tsx    ← Context provider (wraps createEnhancedLogger)
│   ├── useMonita.ts          ← Hook: access logger instance
│   ├── useLogError.ts        ← Hook: log errors with component context
│   ├── useTrackEvent.ts      ← Hook: track custom events
│   ├── usePerformance.ts     ← Hook: measure component render performance
│   ├── ErrorBoundary.tsx     ← React error boundary that auto-reports to Monita
│   ├── MonitaDevtools.tsx    ← Development overlay showing SDK status (dev only)
│   └── index.ts              ← Public exports
├── package.json
└── tsconfig.json
```

**Key features**:
- [ ] `<MonitaProvider config={}>` — Initializes SDK, provides context
- [ ] `useMonita()` — Returns logger instance with all methods
- [ ] `useLogError()` — Returns function to log errors with component name/props context
- [ ] `useTrackEvent()` — Returns function to track custom events
- [ ] `usePerformance(componentName)` — Measures render time, reports slow renders
- [ ] `<MonitaErrorBoundary>` — Catches React errors, reports to Monita, shows fallback UI
- [ ] `<MonitaDevtools>` — Floating panel showing: buffer size, last flush, connection status
- [ ] Auto-capture React component errors with component stack
- [ ] SSR-safe (no window access during server render)

### 3.2 Next.js SDK (`@monita/nextjs`)

**Duration**: 4-5 days

**Package structure**:
```
packages/nextjs/
├── src/
│   ├── middleware.ts          ← Next.js middleware for request logging
│   ├── instrumentation.ts    ← Next.js instrumentation hook
│   ├── server-logger.ts      ← Server-side logger (API routes, server components)
│   ├── client-provider.tsx   ← Client-side provider (extends @monita/react)
│   ├── route-handler.ts      ← Wrapper for API route handlers
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Key features**:
- [ ] Automatic request/response logging in middleware
- [ ] Server component error capture via instrumentation hook
- [ ] API route handler wrapper with timing and error capture
- [ ] Client-side provider that extends React SDK
- [ ] Deployment tracking via Vercel environment variables

### 3.3 Express Middleware (`@monita/express`)

**Duration**: 2-3 days

**Key features**:
- [ ] `monita.requestLogger()` — Middleware that logs every request/response
- [ ] `monita.errorHandler()` — Error middleware that captures and reports errors
- [ ] Request timing (start → end, response time)
- [ ] Request context: method, path, status, IP, user agent
- [ ] Configurable: path exclusions, header capture, body capture

### 3.4 Vue.js Plugin (`@monita/vue`)

**Duration**: 3-4 days

**Key features**:
- [ ] Vue 3 plugin: `app.use(MonitaPlugin, config)`
- [ ] `useMonita()` composable
- [ ] Global error handler integration (`app.config.errorHandler`)
- [ ] Router integration (page view tracking)
- [ ] Component performance tracking via lifecycle hooks

### 3.5 Node.js SDK (`@monita/node`)

**Duration**: 2-3 days

**Key features**:
- [ ] Process monitoring (memory, CPU, event loop lag)
- [ ] Uncaught exception and unhandled rejection handlers
- [ ] HTTP server request logging (generic, not framework-specific)
- [ ] Worker thread support
- [ ] Graceful shutdown handling

---

## Phase 4: Advanced Features

### 4.1 Session Replay Data Collection
- [ ] Capture DOM mutations (MutationObserver)
- [ ] Capture network waterfall
- [ ] Capture console output timeline
- [ ] Send replay data as structured events
- [ ] Privacy-aware: mask all text inputs, redact sensitive elements

### 4.2 Custom Metrics API
- [ ] `monita.metric('response_time', 142, { endpoint: '/api/users' })`
- [ ] Counter, gauge, histogram metric types
- [ ] Aggregation on client side before sending
- [ ] Dashboard integration for custom metric visualization

### 4.3 Feature Flag Integration
- [ ] Native LaunchDarkly integration
- [ ] Native Statsig integration
- [ ] Generic flag evaluation logging
- [ ] Impact analysis: correlate flag changes with error rate changes

---

## Phase 5: Developer Experience

### 5.1 CLI Tool

**Duration**: 3-4 days

```
monita init                          ← Interactive project setup
monita upload-sourcemaps --release   ← Upload source maps
monita logs --project --tail         ← Stream logs in terminal
monita projects list                 ← List projects
monita config set                    ← Update SDK config
```

### 5.2 Documentation
- [ ] Comprehensive README with examples for each feature
- [ ] TypeDoc-generated API documentation
- [ ] Framework-specific quickstart guides
- [ ] Migration guide from Sentry/LogRocket/Datadog
- [ ] Troubleshooting guide

### 5.3 Example Applications
- [ ] React + Vite example app
- [ ] Next.js example app
- [ ] Express API example
- [ ] Vue 3 example app
- [ ] Node.js script example

---

## Version Strategy

| Version | Scope | Breaking Changes |
|---------|-------|------------------|
| 1.x | Current release (Phase 0 fixes) | None |
| 2.0 | Dual CJS/ESM, circuit breaker, compression, health metrics | Build output structure changes |
| 3.0 | Distributed tracing, offline support, remote config | Config interface extension |
| 4.0 | Framework SDKs (separate packages) | Monorepo restructure |

---

## Monorepo Migration (Phase 3+)

When framework SDKs are added, migrate to a monorepo:

```
monita/
├── packages/
│   ├── core/          ← Current loghive-sdk (npm: monita)
│   ├── react/         ← @monita/react
│   ├── nextjs/        ← @monita/nextjs
│   ├── express/       ← @monita/express
│   ├── vue/           ← @monita/vue
│   ├── node/          ← @monita/node
│   └── cli/           ← @monita/cli
├── examples/
│   ├── react-app/
│   ├── nextjs-app/
│   ├── express-api/
│   └── vue-app/
├── package.json       ← Workspace root
├── turbo.json         ← Turborepo config
└── tsconfig.base.json ← Shared TS config
```

**Tool**: Turborepo for monorepo management (builds, tests, publishing).

---

## Testing Matrix

| Environment | Tool | What's Tested |
|-------------|------|---------------|
| Browser (jsdom) | Vitest | Auto-instrumentation, DOM events, fetch/XHR patching |
| Browser (real) | Playwright | End-to-end SDK behavior in real browsers |
| Node.js | Vitest | Server-side logger, process handlers, Node detection |
| Bundle | Size-limit | Bundle size < 15KB gzipped |
| Types | tsc --noEmit | TypeScript compilation, type correctness |
| Integration | Vitest | Full flow: init → log → flush → verify payload |

---

## Performance Targets

| Metric | Target | How Measured |
|--------|--------|-------------|
| SDK initialization time | < 5ms | `performance.now()` before/after `init()` |
| Log method call time | < 0.1ms | Benchmark 10K calls |
| Flush duration | < 50ms | Time from flush start to HTTP response |
| Memory overhead | < 2MB | Heap snapshot comparison |
| Bundle size (core) | < 15KB gzipped | size-limit CI check |
| Auto-instrumentation overhead | < 1% CPU | Chrome DevTools profiling |

---

*Last updated: March 2026*
