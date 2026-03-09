# @monita/react

React bindings for the [Monita](https://www.npmjs.com/package/monita) observability SDK. Provides a context provider, hooks, and an error boundary to integrate Monita logging into any React application with minimal boilerplate.

## Installation

```bash
npm install @monita/react monita react
```

> `react` and `monita` are peer dependencies -- you must install them alongside this package.

## Quick Start

### 1. Wrap your app with `MonitaProvider`

```tsx
import { MonitaProvider } from "@monita/react";

const monitaConfig = {
  apiKey: "your-api-key",
  projectId: "your-project-id",
  environment: "production",
};

function App() {
  return (
    <MonitaProvider config={monitaConfig}>
      <YourApp />
    </MonitaProvider>
  );
}
```

### 2. Use hooks in your components

```tsx
import { useMonita } from "@monita/react";

function Dashboard() {
  const { logInfo, logError, trackEvent } = useMonita();

  useEffect(() => {
    logInfo("Dashboard loaded");
  }, []);

  const handleAction = () => {
    try {
      performAction();
      trackEvent("action_completed", { actionId: "abc" });
    } catch (err) {
      logError(err as Error, { action: "performAction" });
    }
  };

  return <button onClick={handleAction}>Do something</button>;
}
```

### 3. Add error boundaries

```tsx
import { MonitaErrorBoundary } from "@monita/react";

function App() {
  return (
    <MonitaProvider config={monitaConfig}>
      <MonitaErrorBoundary
        fallback={(error, resetError) => (
          <div>
            <p>Something went wrong: {error.message}</p>
            <button onClick={resetError}>Try again</button>
          </div>
        )}
      >
        <YourApp />
      </MonitaErrorBoundary>
    </MonitaProvider>
  );
}
```

## API Reference

### Components

#### `<MonitaProvider>`

Initializes the Monita SDK and provides it to all descendant components.

| Prop | Type | Description |
|------|------|-------------|
| `config` | `LoggerConfig` | Monita SDK configuration (apiKey, projectId, etc.) |
| `children` | `ReactNode` | Child components |

The provider creates a new `Monita` instance on mount and calls `shutdown()` on unmount. If the config changes (by reference), the previous instance is destroyed and a new one is created.

#### `<MonitaErrorBoundary>`

A React Error Boundary that automatically logs caught errors to Monita.

| Prop | Type | Description |
|------|------|-------------|
| `fallback` | `ReactNode \| (error: Error, resetError: () => void) => ReactNode` | UI to render when an error is caught |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | Optional callback on error |
| `children` | `ReactNode` | Child components |

### Hooks

#### `useMonita(): UseMonitaReturn`

Primary hook. Returns the logger instance and convenience methods.

```typescript
interface UseMonitaReturn {
  logger: Monita;
  trackEvent: (eventName: string, data?: Record<string, any>) => void;
  logError: (error: Error, context?: Record<string, any>) => void;
  logInfo: (message: string, data?: Record<string, any>) => void;
  logWarn: (message: string, data?: Record<string, any>) => void;
  logDebug: (message: string, data?: Record<string, any>) => void;
  sessionId: string | null;
}
```

#### `useLogError()`

Returns a stable callback to log errors.

```tsx
const logError = useLogError();
logError(new Error("oops"), { userId: "123" });
```

#### `useTrackEvent()`

Returns a stable callback to track custom events.

```tsx
const trackEvent = useTrackEvent();
trackEvent("page_viewed", { page: "/pricing" });
```

#### `usePerformance()`

Returns the current Monita context snapshot, which includes browser and performance data set by auto-instrumentation.

```tsx
const perfData = usePerformance();
```

### Exported Types

- `MonitaProviderProps`
- `UseMonitaReturn`
- `MonitaErrorBoundaryProps`
- `MonitaErrorBoundaryState`
- `LoggerConfig` (re-exported from `monita`)
- `LogEntry` (re-exported from `monita`)
- `LogLevel` (re-exported from `monita`)

## Configuration

All configuration is passed through the `config` prop on `MonitaProvider`. See the [monita SDK documentation](https://www.npmjs.com/package/monita) for the full `LoggerConfig` reference.

Key options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your Monita API key |
| `projectId` | `string` | required | Your Monita project ID |
| `environment` | `string` | `"development"` | Environment name |
| `minLogLevel` | `LogLevel` | `LogLevel.INFO` | Minimum log level to capture |
| `batchSize` | `number` | `10` | Logs to buffer before flushing |
| `flushIntervalMs` | `number` | `5000` | Auto-flush interval in ms |
| `autoCapture.errors` | `boolean` | `true` | Auto-capture unhandled errors |
| `autoCapture.performance` | `boolean` | `true` | Auto-capture Web Vitals |
| `autoCapture.networkRequests` | `boolean` | `true` | Auto-capture fetch/XHR |
| `autoCapture.pageViews` | `boolean` | `true` | Auto-capture page views |

## License

MIT
