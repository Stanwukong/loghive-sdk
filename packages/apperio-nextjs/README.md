# @monita/nextjs

Next.js integration for the [Monita](https://www.npmjs.com/package/monita) observability SDK. Provides middleware instrumentation, a server-side logger factory, and a route handler wrapper with automatic error catching.

## Installation

```bash
npm install @monita/nextjs monita
```

> `next` and `monita` are peer dependencies -- you must have them installed in your project.

For client-side React hooks and components, also install `@monita/react`.

## Quick Start

### 1. Middleware -- log every request

Create or update your `middleware.ts` at the project root:

```ts
import { withMonitaMiddleware } from "@monita/nextjs";
import { NextResponse } from "next/server";

function middleware(request: any) {
  return NextResponse.next();
}

export default withMonitaMiddleware(middleware, {
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  environment: "production",
  excludePaths: ["/_next/*", "/favicon.ico"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 2. Route Handlers -- automatic error catching

```ts
// app/api/users/route.ts
import { withMonita } from "@monita/nextjs";

const monitaConfig = {
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  environment: "production",
  serviceName: "users-api",
};

export const GET = withMonita(async (request) => {
  const users = await getUsers();
  return Response.json(users);
}, monitaConfig);

export const POST = withMonita(async (request) => {
  const body = await request.json();
  const user = await createUser(body);
  return Response.json(user, { status: 201 });
}, monitaConfig);
```

### 3. Server-side logger -- for Server Components and Server Actions

```ts
// lib/logger.ts
import { createServerLogger } from "@monita/nextjs";

export const logger = createServerLogger({
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  environment: "production",
  serviceName: "nextjs-app",
});
```

```tsx
// app/dashboard/page.tsx (Server Component)
import { logger } from "@/lib/logger";

export default async function DashboardPage() {
  logger.info("Rendering dashboard");
  const data = await fetchDashboardData();
  return <Dashboard data={data} />;
}
```

## API Reference

### `withMonitaMiddleware(middleware, config)`

Wraps a Next.js middleware function to log all requests passing through it.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `middleware` | `NextMiddleware` | Your existing middleware function |
| `config` | `MonitaMiddlewareConfig` | Configuration object |

**MonitaMiddlewareConfig:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Monita API key |
| `projectId` | `string` | required | Monita project ID |
| `endpoint` | `string` | Monita production URL | API endpoint |
| `environment` | `string` | `"production"` | Environment name |
| `excludePaths` | `string[]` | `["/_next/*", "/favicon.ico", "/api/health"]` | Paths to skip |
| `addRequestId` | `boolean` | `true` | Add X-Request-Id header |

**Behavior:**
- Logs method, path, duration, user-agent, geo data for every request
- Adds `X-Request-Id` header to responses
- Excludes static assets and configured paths
- Uses a singleton logger instance for efficiency

---

### `withMonita(handler, config)`

Higher-order function that wraps a Next.js App Router Route Handler with automatic error catching and logging.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `handler` | `RouteHandler` | Your route handler function |
| `config` | `RouteWrapperConfig` | Configuration object |

**RouteWrapperConfig:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Monita API key |
| `projectId` | `string` | required | Monita project ID |
| `endpoint` | `string` | Monita production URL | API endpoint |
| `environment` | `string` | `"production"` | Environment name |
| `serviceName` | `string` | `"nextjs-route"` | Service name for logs |

**Behavior:**
- Logs request method, path, status, and duration
- Catches unhandled errors and logs them as error-level events
- Returns a structured JSON error response on failure
- Adds `X-Request-Id` header to all responses
- Hides error details in production (`NODE_ENV=production`)

---

### `createServerLogger(config)`

Factory function that creates a server-side Monita logger. Instances are cached by `projectId + apiKey` so repeated calls return the same logger.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `config` | `ServerLoggerConfig` | Server logger configuration |

**ServerLoggerConfig:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Monita API key |
| `projectId` | `string` | required | Monita project ID |
| `endpoint` | `string` | Monita production URL | API endpoint |
| `environment` | `string` | `"production"` | Environment name |
| `serviceName` | `string` | `"nextjs-server"` | Service name |
| `serviceVersion` | `string` | - | Service version |
| `release` | `string` | - | Release version |
| `minLogLevel` | `LogLevel` | `LogLevel.INFO` | Minimum log level |
| `batchSize` | `number` | `10` | Batch size |
| `flushIntervalMs` | `number` | `5000` | Flush interval |

**Returns:** A `Monita` instance with all browser auto-capture disabled.

---

### `destroyServerLogger(config)`

Shuts down and removes a cached server logger instance.

```ts
await destroyServerLogger({ apiKey: "...", projectId: "..." });
```

### `destroyAllServerLoggers()`

Shuts down and removes all cached server loggers.

```ts
await destroyAllServerLoggers();
```

## Exported Types

- `ServerLoggerConfig`
- `MonitaMiddlewareConfig`
- `RouteWrapperConfig`
- `MonitaErrorResponse`
- `LoggerConfig` (re-exported from `monita`)
- `LogEntry` (re-exported from `monita`)
- `LogLevel` (re-exported from `monita`)

## Environment Variables

Set these in your `.env.local`:

```bash
MONITA_API_KEY=your-api-key
MONITA_PROJECT_ID=your-project-id
```

## Compatibility

- **Next.js**: 13+ (App Router and Pages Router)
- **Node.js**: 18+
- **Runtime**: Node.js and Edge Runtime compatible

## License

MIT
