/**
 * @file example/seed-database.ts
 * @description Database seed script that sends ~500 logs directly via HTTP POST
 * to the backend API. Uses axios directly (NOT the SDK) for full control over
 * every field in the log payload.
 *
 * To run:
 *   npx ts-node example/seed-database.ts
 *
 * Requires .env in the loghive-sdk root with:
 *   REMOTE_LOGGER_API_KEY=...
 *   REMOTE_LOGGER_PROJECT_ID=...
 *   REMOTE_LOGGER_ENDPOINT=...
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_KEY = process.env.REMOTE_LOGGER_API_KEY!;
const PROJECT_ID = process.env.REMOTE_LOGGER_PROJECT_ID!;
const ENDPOINT = process.env.REMOTE_LOGGER_ENDPOINT!;

if (!API_KEY || !PROJECT_ID || !ENDPOINT) {
  console.error(
    "Missing environment variables. Set REMOTE_LOGGER_API_KEY, REMOTE_LOGGER_PROJECT_ID, and REMOTE_LOGGER_ENDPOINT in .env"
  );
  process.exit(1);
}

const LOG_URL = `${ENDPOINT}/${PROJECT_ID}/logs`;
const headers = { "Content-Type": "application/json", "X-API-Key": API_KEY };

let successCount = 0;
let failCount = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function randomTimestamp(): string {
  const offset = Math.random() * TWENTY_FOUR_HOURS;
  return new Date(Date.now() - offset).toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function shortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

async function sendLog(log: Record<string, any>): Promise<void> {
  try {
    await axios.post(LOG_URL, log, { headers });
    successCount++;
  } catch (err: any) {
    failCount++;
    console.error(
      `  FAIL [${err.response?.status}]: ${log.message?.substring(0, 60)}`
    );
  }
}

async function sendBatch(logs: Record<string, any>[]): Promise<void> {
  const BATCH_SIZE = 10;
  const DELAY_MS = 100;

  for (let i = 0; i < logs.length; i += BATCH_SIZE) {
    const batch = logs.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(sendLog));
    if (i + BATCH_SIZE < logs.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const SERVICES = [
  "api-gateway",
  "order-service",
  "payment-service",
  "notification-service",
  "user-service",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
];

const PAGES = [
  "https://myapp.com/",
  "https://myapp.com/products",
  "https://myapp.com/checkout",
  "https://myapp.com/profile",
];

// ---------------------------------------------------------------------------
// 1. Regular Logs (~200)
// ---------------------------------------------------------------------------

function generateRegularLogs(): Record<string, any>[] {
  const logs: Record<string, any>[] = [];

  const infoMessages = [
    "Request processed successfully",
    "Cache hit for user:42",
    "User session started",
    "Configuration loaded from remote",
    "Background job completed",
    "Email notification queued",
    "Payment intent created",
    "Webhook delivered successfully",
    "Health check passed",
    "Token refreshed for client",
    "Order placed successfully",
    "Inventory sync completed",
    "Rate limit counter reset",
    "New user registered",
    "Feature flag evaluated",
  ];

  const debugMessages = [
    "Database query executed in 12ms",
    "Cache miss - fetching from origin",
    "Serializing response payload",
    "Middleware chain executed",
    "Connection pool stats: 8/20 active",
    "JWT token decoded successfully",
    "Request body validated",
    "Outgoing HTTP request initiated",
    "Response compressed with gzip",
    "Retry attempt scheduled",
  ];

  const warnMessages = [
    "Slow query detected (>500ms)",
    "Memory usage above 80% threshold",
    "Deprecated API version called",
    "Rate limit threshold approaching",
    "Connection pool nearing capacity",
    "Disk space below 20%",
    "Response time degradation detected",
    "Stale cache entry served",
    "Retry limit approaching for external call",
    "Certificate expiring in 7 days",
  ];

  for (let i = 0; i < 200; i++) {
    const level = pickWeighted(
      ["info", "debug", "warn"],
      [60, 20, 20]
    );
    const env = pickWeighted(["production", "staging"], [70, 30]);
    const release = pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]);

    let message: string;
    if (level === "info") message = pick(infoMessages);
    else if (level === "debug") message = pick(debugMessages);
    else message = pick(warnMessages);

    logs.push({
      timestamp: randomTimestamp(),
      level,
      message,
      service: pick(SERVICES),
      environment: env,
      release,
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      data: {
        requestId: `req-${shortId()}`,
        durationMs: Math.floor(Math.random() * 800) + 5,
        region: pick(["us-east-1", "eu-west-1", "ap-southeast-1"]),
      },
    });
  }

  return logs;
}

// ---------------------------------------------------------------------------
// 2. Error Logs (~50)
// ---------------------------------------------------------------------------

function generateErrorLogs(): Record<string, any>[] {
  const logs: Record<string, any>[] = [];

  const errorMessages = [
    "Cannot read property 'map' of undefined",
    "Network request failed: ECONNREFUSED",
    "TypeError: null is not an object",
    "RangeError: Maximum call stack size exceeded",
    "SyntaxError: Unexpected token < in JSON at position 0",
    "MongoServerError: E11000 duplicate key error",
    "ENOMEM: not enough memory",
    "ETIMEDOUT: connection timed out",
    "UnhandledPromiseRejection: Query timeout after 30000ms",
    "PermissionDenied: insufficient privileges for operation",
  ];

  const minifiedStacks = [
    `TypeError: Cannot read property 'map' of undefined\n    at r.render (https://cdn.myapp.com/static/js/main.abc123.js:1:48293)\n    at Zo (https://cdn.myapp.com/static/js/main.abc123.js:1:92841)\n    at Hs (https://cdn.myapp.com/static/js/main.abc123.js:1:102557)`,
    `TypeError: null is not an object\n    at e.handleClick (https://cdn.myapp.com/static/js/main.abc123.js:2:18734)\n    at Object.Ln (https://cdn.myapp.com/static/js/main.abc123.js:1:5523)\n    at Un (https://cdn.myapp.com/static/js/main.abc123.js:1:5678)`,
    `RangeError: Maximum call stack size exceeded\n    at https://cdn.myapp.com/static/js/main.abc123.js:1:34291\n    at https://cdn.myapp.com/static/js/main.abc123.js:1:34291\n    at https://cdn.myapp.com/static/js/main.abc123.js:1:34291`,
  ];

  const regularStacks = [
    `Error: Network request failed: ECONNREFUSED\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1278:16)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at OrderService.fetchOrder (/app/src/services/order.service.ts:45:12)`,
    `MongoServerError: E11000 duplicate key error\n    at Connection.onMessage (/app/node_modules/mongodb/lib/cmap/connection.js:202:30)\n    at MessageStream.<anonymous> (/app/node_modules/mongodb/lib/cmap/connection.js:59:60)`,
    `Error: ETIMEDOUT: connection timed out\n    at RedisClient._connect (/app/node_modules/redis/lib/client.js:145:18)\n    at CacheService.get (/app/src/services/cache.service.ts:32:20)`,
  ];

  // -- 8 instances of the same repeated error (for error grouping) --
  for (let i = 0; i < 8; i++) {
    logs.push({
      timestamp: randomTimestamp(),
      level: "error",
      message: "Cannot read property 'map' of undefined",
      service: pick(SERVICES),
      environment: "production",
      release: "2.0.0-rc1",
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      error: {
        name: "TypeError",
        message: "Cannot read property 'map' of undefined",
        stack: minifiedStacks[0],
      },
      data: {
        componentName: pick(["ProductList", "OrderTable", "UserGrid"]),
        route: pick(["/products", "/orders", "/users"]),
      },
    });
  }

  // -- 5 errors with breadcrumbs --
  for (let i = 0; i < 5; i++) {
    const baseTime = Date.now() - Math.random() * TWENTY_FOUR_HOURS;
    const breadcrumbs = [];
    const breadcrumbCount = 5 + Math.floor(Math.random() * 3); // 5-7

    for (let b = 0; b < breadcrumbCount; b++) {
      const category = pick(["navigation", "ui", "network", "console"]);
      const breadcrumbMessages: Record<string, string[]> = {
        navigation: [
          "Navigated to /products",
          "Navigated to /checkout",
          "Navigated to /profile",
          "Back button pressed",
        ],
        ui: [
          "Clicked 'Add to Cart' button",
          "Opened dropdown menu",
          "Scrolled to bottom of page",
          "Toggled dark mode",
        ],
        network: [
          "GET /api/v1/products 200 (142ms)",
          "POST /api/v1/orders 201 (523ms)",
          "GET /api/v1/user/profile 200 (89ms)",
          "PUT /api/v1/cart 500 (3201ms)",
        ],
        console: [
          "Warning: Each child should have a unique key prop",
          "Performance warning: large list rendered",
          "Debug: state updated",
        ],
      };

      breadcrumbs.push({
        timestamp: new Date(baseTime + b * 2000).toISOString(),
        category,
        message: pick(breadcrumbMessages[category]),
        level: category === "console" ? "warn" : "info",
        ...(category === "network"
          ? { data: { method: "GET", statusCode: pick([200, 201, 500]) } }
          : {}),
      });
    }

    logs.push({
      timestamp: new Date(baseTime + breadcrumbs.length * 2000).toISOString(),
      level: "error",
      message: pick(errorMessages),
      service: pick(SERVICES),
      environment: "production",
      release: "2.0.0-rc1",
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      error: {
        name: "Error",
        message: pick(errorMessages),
        stack: pick([...minifiedStacks, ...regularStacks]),
      },
      data: {
        breadcrumbs,
      },
    });
  }

  // -- 5 errors with environment snapshot --
  for (let i = 0; i < 5; i++) {
    const width = pick([1920, 1440, 1366, 375, 390, 414]);
    const height = pick([1080, 900, 768, 812, 844, 896]);

    logs.push({
      timestamp: randomTimestamp(),
      level: "error",
      message: pick(errorMessages),
      service: pick(SERVICES),
      environment: "production",
      release: "2.0.0-rc1",
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      error: {
        name: pick(["TypeError", "ReferenceError", "RangeError"]),
        message: pick(errorMessages),
        stack: pick([...minifiedStacks, ...regularStacks]),
      },
      data: {
        environment: {
          url: pick(PAGES),
          referrer: pick(["https://google.com", "https://myapp.com/", ""]),
          viewport: { width, height },
          scrollPosition: {
            x: 0,
            y: Math.floor(Math.random() * 3000),
          },
          networkState: {
            online: true,
            connectionType: pick(["4g", "wifi", "3g"]),
          },
          memory: {
            usedJSHeapSize: Math.floor(Math.random() * 50000000) + 10000000,
            totalJSHeapSize: 67108864,
            jsHeapSizeLimit: 2147483648,
          },
          timestamp: randomTimestamp(),
        },
      },
    });
  }

  // -- 3 errors with offlineQueued --
  for (let i = 0; i < 3; i++) {
    logs.push({
      timestamp: randomTimestamp(),
      level: "error",
      message: pick(errorMessages),
      service: pick(SERVICES),
      environment: "production",
      release: "2.0.0-rc1",
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      error: {
        name: "NetworkError",
        message: "Failed to fetch: net::ERR_INTERNET_DISCONNECTED",
        stack:
          "NetworkError: Failed to fetch\n    at fetch (native)\n    at ApiClient.request (/app/src/api.ts:23:18)",
      },
      data: {
        offlineQueued: true,
        queuedAt: randomTimestamp(),
        retryCount: Math.floor(Math.random() * 3) + 1,
      },
    });
  }

  // -- Remaining general errors to reach ~50 total --
  const remaining = 50 - logs.length;
  for (let i = 0; i < remaining; i++) {
    const isFatal = Math.random() < 0.15;
    const msg = pick(errorMessages);

    logs.push({
      timestamp: randomTimestamp(),
      level: isFatal ? "fatal" : "error",
      message: msg,
      service: pick(SERVICES),
      environment: pickWeighted(["production", "staging"], [80, 20]),
      release: pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]),
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      error: {
        name: pick([
          "TypeError",
          "ReferenceError",
          "Error",
          "MongoServerError",
        ]),
        message: msg,
        stack: pick([...minifiedStacks, ...regularStacks]),
      },
      data: {
        requestId: `req-${shortId()}`,
        userId: `usr-${shortId()}`,
      },
    });
  }

  return logs;
}

// ---------------------------------------------------------------------------
// 3. Web Vitals (~100)
// ---------------------------------------------------------------------------

function generateWebVitals(): Record<string, any>[] {
  const logs: Record<string, any>[] = [];

  for (let i = 0; i < 100; i++) {
    const vitalName = pick(["LCP", "CLS", "INP"]) as "LCP" | "CLS" | "INP";

    // Determine rating with weighted distribution: 60% good, 25% NI, 15% poor
    const rating = pickWeighted(
      ["good", "needs-improvement", "poor"] as const,
      [60, 25, 15]
    );

    let value: number;

    if (vitalName === "LCP") {
      // LCP in ms: good <2500, NI 2500-4000, poor >4000
      if (rating === "good") value = Math.random() * 2500;
      else if (rating === "needs-improvement")
        value = 2500 + Math.random() * 1500;
      else value = 4000 + Math.random() * 4000;
      value = Math.round(value);
    } else if (vitalName === "CLS") {
      // CLS unitless: good <0.1, NI 0.1-0.25, poor >0.25
      if (rating === "good") value = Math.random() * 0.1;
      else if (rating === "needs-improvement")
        value = 0.1 + Math.random() * 0.15;
      else value = 0.25 + Math.random() * 0.5;
      value = parseFloat(value.toFixed(4));
    } else {
      // INP in ms: good <200, NI 200-500, poor >500
      if (rating === "good") value = Math.random() * 200;
      else if (rating === "needs-improvement")
        value = 200 + Math.random() * 300;
      else value = 500 + Math.random() * 1500;
      value = Math.round(value);
    }

    const page = pick(PAGES);

    logs.push({
      timestamp: randomTimestamp(),
      level: "info",
      message: `Web Vital: ${vitalName} = ${value} (${rating})`,
      eventType: "web-vital",
      service: "frontend",
      environment: pickWeighted(["production", "staging"], [80, 20]),
      release: pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]),
      url: page,
      userAgent: pick(USER_AGENTS),
      data: {
        vital: {
          name: vitalName,
          value,
          rating,
        },
      },
    });
  }

  return logs;
}

// ---------------------------------------------------------------------------
// 4. Traced Logs (~80)
// ---------------------------------------------------------------------------

function generateTracedLogs(): Record<string, any>[] {
  const logs: Record<string, any>[] = [];

  const traceScenarios = [
    {
      name: "User Login Flow",
      services: [
        "api-gateway",
        "user-service",
        "notification-service",
      ],
      success: true,
    },
    {
      name: "Place Order",
      services: [
        "api-gateway",
        "order-service",
        "payment-service",
        "notification-service",
      ],
      success: true,
    },
    {
      name: "Search Products",
      services: ["api-gateway", "order-service"],
      success: true,
    },
    {
      name: "Process Payment",
      services: [
        "api-gateway",
        "payment-service",
        "order-service",
        "notification-service",
      ],
      success: false, // will have error logs
    },
    {
      name: "User Registration",
      services: [
        "api-gateway",
        "user-service",
        "notification-service",
      ],
      success: true,
    },
    {
      name: "Checkout Flow",
      services: [
        "api-gateway",
        "order-service",
        "payment-service",
        "notification-service",
        "user-service",
      ],
      success: false, // will have error logs
    },
    {
      name: "Update Profile",
      services: ["api-gateway", "user-service"],
      success: true,
    },
    {
      name: "Send Notification Batch",
      services: [
        "api-gateway",
        "notification-service",
        "user-service",
      ],
      success: true,
    },
  ];

  for (const scenario of traceScenarios) {
    const traceId = uuid();
    const spanCount = 5 + Math.floor(Math.random() * 8); // 5-12 spans
    const baseTime =
      Date.now() - Math.random() * TWENTY_FOUR_HOURS;

    // Root span
    const rootSpanId = shortId();
    logs.push({
      timestamp: new Date(baseTime).toISOString(),
      level: "info",
      message: `[TRACE] ${scenario.name} - started`,
      service: scenario.services[0],
      environment: "production",
      release: "2.0.0-rc1",
      traceId,
      spanId: rootSpanId,
      data: {
        traceName: scenario.name,
        spanName: "root",
        spanKind: "server",
      },
    });

    // Child spans
    let parentSpanId = rootSpanId;
    for (let s = 1; s < spanCount; s++) {
      const currentSpanId = shortId();
      const service =
        scenario.services[s % scenario.services.length];
      const elapsed = s * (80 + Math.floor(Math.random() * 200));

      // Determine if this span is an error (only for failed traces, last few spans)
      const isError =
        !scenario.success && s >= spanCount - 2 && Math.random() < 0.6;

      const spanNames = [
        "validate-request",
        "authenticate",
        "authorize",
        "fetch-data",
        "transform",
        "persist",
        "notify",
        "cache-lookup",
        "enqueue",
        "serialize",
        "log-audit",
        "respond",
      ];

      logs.push({
        timestamp: new Date(baseTime + elapsed).toISOString(),
        level: isError ? "error" : pick(["info", "debug"]),
        message: isError
          ? `[TRACE] ${scenario.name} - ${spanNames[s % spanNames.length]} failed`
          : `[TRACE] ${scenario.name} - ${spanNames[s % spanNames.length]}`,
        service,
        environment: "production",
        release: "2.0.0-rc1",
        traceId,
        spanId: currentSpanId,
        ...(isError
          ? {
              error: {
                name: "SpanError",
                message: `Operation ${spanNames[s % spanNames.length]} failed in ${service}`,
                stack: `Error: Operation failed\n    at ${service}.${spanNames[s % spanNames.length]} (/app/src/services/${service}.ts:${Math.floor(Math.random() * 200) + 10}:8)`,
              },
            }
          : {}),
        data: {
          parentSpanId,
          traceName: scenario.name,
          spanName: spanNames[s % spanNames.length],
          spanKind: pick(["client", "server", "internal"]),
          durationMs: Math.floor(Math.random() * 300) + 10,
        },
      });

      // Some children branch off root, some chain linearly
      if (Math.random() < 0.4) {
        parentSpanId = rootSpanId; // branch from root
      } else {
        parentSpanId = currentSpanId; // chain linearly
      }
    }
  }

  return logs;
}

// ---------------------------------------------------------------------------
// 5. Network / Performance Events (~40)
// ---------------------------------------------------------------------------

function generateNetworkAndPerformance(): Record<string, any>[] {
  const logs: Record<string, any>[] = [];

  // -- 20 Network events --
  const endpoints = [
    "/api/v1/products",
    "/api/v1/orders",
    "/api/v1/users/profile",
    "/api/v1/cart",
    "/api/v1/search",
    "/api/v1/notifications",
    "/api/v1/analytics",
    "/api/v1/auth/token",
  ];

  for (let i = 0; i < 20; i++) {
    const method = pickWeighted(
      ["GET", "POST", "PUT", "DELETE"],
      [50, 25, 15, 10]
    );
    const status = pickWeighted(
      [200, 201, 400, 404, 500],
      [50, 15, 15, 10, 10]
    );
    const duration = Math.floor(Math.random() * 4950) + 50;
    const endpoint = pick(endpoints);

    logs.push({
      timestamp: randomTimestamp(),
      level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      message: `${method} ${endpoint} ${status} (${duration}ms)`,
      eventType: "network",
      service: "frontend",
      environment: pickWeighted(["production", "staging"], [80, 20]),
      release: pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]),
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      data: {
        method,
        url: `https://api.myapp.com${endpoint}`,
        status,
        duration,
        responseSize: Math.floor(Math.random() * 50000) + 200,
      },
    });
  }

  // -- 20 Performance events --
  for (let i = 0; i < 20; i++) {
    const loadTime = Math.floor(Math.random() * 5000) + 500;
    const fcp = Math.floor(loadTime * (0.3 + Math.random() * 0.3));
    const tti = Math.floor(loadTime * (0.7 + Math.random() * 0.3));

    logs.push({
      timestamp: randomTimestamp(),
      level: "info",
      message: `Page performance: load=${loadTime}ms fcp=${fcp}ms tti=${tti}ms`,
      eventType: "performance",
      service: "frontend",
      environment: pickWeighted(["production", "staging"], [80, 20]),
      release: pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]),
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      data: {
        loadTime,
        firstContentfulPaint: fcp,
        timeToInteractive: tti,
      },
    });
  }

  return logs;
}

// ---------------------------------------------------------------------------
// 6. Other Events (~30): console, pageview, interaction
// ---------------------------------------------------------------------------

function generateOtherEvents(): Record<string, any>[] {
  const logs: Record<string, any>[] = [];

  // -- 10 Console events --
  const consoleMethods = ["log", "warn", "error", "info", "debug"];
  const consoleMessages = [
    ["[Router] Navigation to /products completed"],
    ["Warning: Each child in a list should have a unique 'key' prop."],
    ["Uncaught TypeError: Cannot set properties of null"],
    ["[Store] State updated: cart items count = 3"],
    ["[Debug] Render cycle: ProductList (15ms)"],
    ["[API] Token refresh scheduled in 300s"],
    ["[i18n] Locale loaded: en-US"],
    ["[SW] Service worker registered successfully"],
    ["[Perf] Component mount time exceeded threshold"],
    ["[Auth] Session extended for 30 minutes"],
  ];

  for (let i = 0; i < 10; i++) {
    const method = pick(consoleMethods);
    logs.push({
      timestamp: randomTimestamp(),
      level: method === "error" ? "error" : method === "warn" ? "warn" : "info",
      message: `console.${method}: ${consoleMessages[i][0]}`,
      eventType: "console",
      service: "frontend",
      environment: pickWeighted(["production", "staging"], [70, 30]),
      release: pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]),
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      data: {
        consoleMethod: method,
        args: consoleMessages[i],
      },
    });
  }

  // -- 10 Pageview events --
  const pageTitles: Record<string, string> = {
    "https://myapp.com/": "Home - MyApp",
    "https://myapp.com/products": "Products - MyApp",
    "https://myapp.com/checkout": "Checkout - MyApp",
    "https://myapp.com/profile": "My Profile - MyApp",
  };

  for (let i = 0; i < 10; i++) {
    const page = pick(PAGES);
    logs.push({
      timestamp: randomTimestamp(),
      level: "info",
      message: `Pageview: ${page}`,
      eventType: "pageview",
      service: "frontend",
      environment: pickWeighted(["production", "staging"], [80, 20]),
      release: pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]),
      url: page,
      userAgent: pick(USER_AGENTS),
      referrer: pick([
        "https://google.com",
        "https://myapp.com/",
        "https://myapp.com/products",
        "",
      ]),
      data: {
        page,
        title: pageTitles[page],
        referrer: pick([
          "https://google.com",
          "https://myapp.com/",
          "",
        ]),
      },
    });
  }

  // -- 10 Interaction events --
  const actions = ["click", "scroll", "keypress"];
  const targets = [
    "button.add-to-cart",
    "a.nav-link",
    "input.search-field",
    "div.product-card",
    "button.submit-order",
    "span.menu-toggle",
    "input.email-field",
    "div.modal-overlay",
    "button.close-dialog",
    "a.breadcrumb-link",
  ];

  for (let i = 0; i < 10; i++) {
    const action = pick(actions);
    logs.push({
      timestamp: randomTimestamp(),
      level: "info",
      message: `User ${action} on ${targets[i]}`,
      eventType: "interaction",
      service: "frontend",
      environment: pickWeighted(["production", "staging"], [80, 20]),
      release: pickWeighted(["2.0.0-rc1", "1.9.3"], [70, 30]),
      url: pick(PAGES),
      userAgent: pick(USER_AGENTS),
      data: {
        action,
        target: targets[i],
        coordinates: {
          x: Math.floor(Math.random() * 1920),
          y: Math.floor(Math.random() * 1080),
        },
      },
    });
  }

  return logs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("==========================================================");
  console.log("  Monita Database Seed Script");
  console.log("==========================================================");
  console.log(`  Endpoint : ${LOG_URL}`);
  console.log(`  Project  : ${PROJECT_ID}`);
  console.log("");

  // Generate all log categories
  console.log("[1/6] Generating regular logs (~200)...");
  const regularLogs = generateRegularLogs();

  console.log("[2/6] Generating error logs (~50)...");
  const errorLogs = generateErrorLogs();

  console.log("[3/6] Generating web vitals (~100)...");
  const webVitals = generateWebVitals();

  console.log("[4/6] Generating traced logs (~80)...");
  const tracedLogs = generateTracedLogs();

  console.log("[5/6] Generating network/performance events (~40)...");
  const networkPerf = generateNetworkAndPerformance();

  console.log("[6/6] Generating other events (~30)...");
  const otherEvents = generateOtherEvents();

  const allLogs = [
    ...regularLogs,
    ...errorLogs,
    ...webVitals,
    ...tracedLogs,
    ...networkPerf,
    ...otherEvents,
  ];

  // Shuffle all logs so they arrive in mixed order
  for (let i = allLogs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allLogs[i], allLogs[j]] = [allLogs[j], allLogs[i]];
  }

  console.log("");
  console.log(`Total logs to send: ${allLogs.length}`);
  console.log("Sending in batches of 10 with 100ms delay...");
  console.log("");

  const startTime = Date.now();
  await sendBatch(allLogs);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  console.log("==========================================================");
  console.log("  Seed Complete");
  console.log("==========================================================");
  console.log(`  Total     : ${allLogs.length}`);
  console.log(`  Succeeded : ${successCount}`);
  console.log(`  Failed    : ${failCount}`);
  console.log(`  Duration  : ${elapsed}s`);
  console.log("==========================================================");

  // Detail breakdown
  console.log("");
  console.log("  Breakdown:");
  console.log(`    Regular logs     : ${regularLogs.length}`);
  console.log(`    Error logs       : ${errorLogs.length}`);
  console.log(`    Web vitals       : ${webVitals.length}`);
  console.log(`    Traced logs      : ${tracedLogs.length}`);
  console.log(`    Network/Perf     : ${networkPerf.length}`);
  console.log(`    Other events     : ${otherEvents.length}`);
  console.log("");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
