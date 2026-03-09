/**
 * Apperio SDK Phase 2 -- End-to-End Test Script
 *
 * Exercises ALL Phase 2 public APIs:
 *   - Distributed Tracing (startTrace, createChildSpan, endTrace, getCurrentTrace)
 *   - Breadcrumbs + Environment Snapshot
 *   - Standard logging at every level
 *   - Error handling with stack traces and recurring errors
 *   - Data sanitization (PII redaction)
 *   - Context management (setContext, getContext, clearContext)
 *   - Flush / Shutdown lifecycle
 *
 * Run:
 *   npx ts-node example/e2e-phase2-test.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import {
  Apperio,
  LogLevel,
  BreadcrumbManager,
  Breadcrumb,
  EnvironmentSnapshot,
} from "../src";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sectionHeader(title: string): void {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function sectionFooter(title: string): void {
  console.log(`-- ${title} complete --\n`);
}

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

const API_KEY = process.env.REMOTE_LOGGER_API_KEY;
const PROJECT_ID = process.env.REMOTE_LOGGER_PROJECT_ID;
const ENDPOINT = process.env.REMOTE_LOGGER_ENDPOINT;

if (!API_KEY || !PROJECT_ID || !ENDPOINT) {
  console.error(
    "Missing required environment variables: REMOTE_LOGGER_API_KEY, REMOTE_LOGGER_PROJECT_ID, REMOTE_LOGGER_ENDPOINT"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // -----------------------------------------------------------------------
  // Section 1: Initialization
  // -----------------------------------------------------------------------
  sectionHeader("Section 1: Initialization");

  const logger = new Apperio({
    apiKey: API_KEY!,
    projectId: PROJECT_ID!,
    endpoint: ENDPOINT!,
    minLogLevel: LogLevel.TRACE,
    batchSize: 3,
    flushIntervalMs: 2000,
    environment: "e2e-testing",
    serviceName: "apperio-e2e-test",
    release: "2.0.0-rc1",
    tracing: { enabled: true },
    remoteConfig: { enabled: true, refreshIntervalMs: 60000 },
    offline: { maxQueueSize: 100, prioritizeCritical: true },
    sanitization: { enabled: true },
  });

  console.log("Logger initialized:", logger.isInitialized());
  sectionFooter("Initialization");

  // -----------------------------------------------------------------------
  // Section 2: Distributed Tracing
  // -----------------------------------------------------------------------
  sectionHeader("Section 2: Distributed Tracing");

  // -- Trace 1: Successful checkout flow (4 spans) -----------------------
  console.log("Starting Trace 1: user-checkout");
  const trace1 = logger.startTrace("user-checkout");
  console.log("  traceId:", trace1?.traceId);

  logger.info("Checkout initiated", {
    eventType: "interaction",
    cartTotal: 149.99,
    itemCount: 3,
  });

  // Child span: process-payment
  const paymentSpan = logger.createChildSpan("process-payment");
  if (paymentSpan) {
    paymentSpan.setAttribute("payment.method", "credit_card");
    paymentSpan.setAttribute("payment.amount", 149.99);
    paymentSpan.setAttribute("payment.currency", "USD");
    logger.info("Payment processing started", {
      method: "credit_card",
      amount: 149.99,
    });
    logger.info("Payment authorized successfully", {
      transactionId: "txn_abc123xyz",
    });
    paymentSpan.end("ok");
  }

  // Child span: update-inventory
  const inventorySpan = logger.createChildSpan("update-inventory");
  if (inventorySpan) {
    inventorySpan.setAttribute("inventory.items", 3);
    logger.info("Inventory reservation created", {
      reservationId: "res_456def",
    });
    logger.info("Stock levels updated", {
      warehouse: "us-east-1",
      updatedSkus: ["SKU-001", "SKU-042", "SKU-118"],
    });
    inventorySpan.end("ok");
  }

  // Child span: send-confirmation
  const confirmSpan = logger.createChildSpan("send-confirmation");
  if (confirmSpan) {
    confirmSpan.setAttribute("notification.channel", "email");
    logger.info("Order confirmation sent", {
      orderId: "ORD-20260304-001",
      recipientEmail: "customer@example.com",
    });
    confirmSpan.end("ok");
  }

  logger.endTrace();
  console.log("Trace 1 ended");
  await logger.flush();
  await delay(2000);

  // -- Trace 2: Failed API request (3 spans, has errors) ------------------
  console.log("Starting Trace 2: api-request-flow");
  const trace2 = logger.startTrace("api-request-flow");
  console.log("  traceId:", trace2?.traceId);

  logger.info("API request received", {
    method: "GET",
    path: "/api/v2/users/profile",
    requestId: "req_789ghi",
  });

  // Child span: authenticate
  const authSpan = logger.createChildSpan("authenticate");
  if (authSpan) {
    authSpan.setAttribute("auth.method", "jwt");
    logger.info("JWT token validated", { userId: "usr_42", role: "admin" });
    authSpan.end("ok");
  }

  // Child span: database-query (fails)
  const dbSpan = logger.createChildSpan("database-query");
  if (dbSpan) {
    dbSpan.setAttribute("db.system", "mongodb");
    dbSpan.setAttribute("db.collection", "users");
    dbSpan.setAttribute("db.operation", "findOne");

    logger.warn("Slow query detected", {
      queryTimeMs: 4500,
      threshold: 2000,
      collection: "users",
    });

    try {
      throw new Error("MongoServerError: connection pool exhausted, no available connections");
    } catch (err) {
      logger.error(
        "Database query failed",
        err instanceof Error ? err : undefined,
        {
          eventType: "error",
          db: "mongodb",
          collection: "users",
          retryable: true,
        }
      );
    }

    dbSpan.end("error");
  }

  logger.endTrace();
  console.log("Trace 2 ended");
  await logger.flush();
  await delay(2000);

  // -- Trace 3: Multi-service chain (3 spans) ----------------------------
  console.log("Starting Trace 3: microservice-chain");
  const trace3 = logger.startTrace("microservice-chain");
  console.log("  traceId:", trace3?.traceId);

  // Gateway span
  logger.setContext({ currentService: "api-gateway" });
  const gatewaySpan = logger.createChildSpan("gateway");
  if (gatewaySpan) {
    gatewaySpan.setAttribute("gateway.route", "/api/orders");
    gatewaySpan.setAttribute("gateway.upstream", "order-service");
    logger.info("Request routed through gateway", {
      route: "/api/orders",
      method: "POST",
    });
    gatewaySpan.end("ok");
  }

  // Order service span
  logger.setContext({ currentService: "order-service" });
  const orderSpan = logger.createChildSpan("order-service");
  if (orderSpan) {
    orderSpan.setAttribute("order.action", "create");
    orderSpan.setAttribute("order.total", 299.5);
    logger.info("Order created in order-service", {
      orderId: "ORD-20260304-002",
      total: 299.5,
    });
    orderSpan.end("ok");
  }

  // Notification service span
  logger.setContext({ currentService: "notification-service" });
  const notifSpan = logger.createChildSpan("notification-service");
  if (notifSpan) {
    notifSpan.setAttribute("notification.type", "push");
    notifSpan.setAttribute("notification.recipients", 1);
    logger.info("Push notification dispatched", {
      channel: "push",
      template: "order_confirmed",
    });
    notifSpan.end("ok");
  }

  logger.endTrace();
  logger.clearContext();
  console.log("Trace 3 ended");
  await logger.flush();
  await delay(2000);

  sectionFooter("Distributed Tracing");

  // -----------------------------------------------------------------------
  // Section 3: Breadcrumbs + Environment Snapshot
  // -----------------------------------------------------------------------
  sectionHeader("Section 3: Breadcrumbs + Environment Snapshot");

  const breadcrumbManager = new BreadcrumbManager(50);
  const now = Date.now();

  // Simulate a user session leading to a payment error
  breadcrumbManager.add({
    timestamp: now - 30000,
    category: "navigation",
    message: "Navigated to /products",
    level: "info",
    data: { from: "/home", to: "/products" },
  });

  breadcrumbManager.add({
    timestamp: now - 25000,
    category: "ui",
    message: "Clicked 'Add to Cart' button",
    level: "info",
    data: { productId: "prod_abc", productName: "Wireless Headphones" },
  });

  breadcrumbManager.add({
    timestamp: now - 20000,
    category: "network",
    message: "POST /api/cart/add",
    level: "info",
    data: { status: 200, durationMs: 120 },
  });

  breadcrumbManager.add({
    timestamp: now - 15000,
    category: "navigation",
    message: "Navigated to /checkout",
    level: "info",
    data: { from: "/products", to: "/checkout" },
  });

  breadcrumbManager.add({
    timestamp: now - 10000,
    category: "ui",
    message: "Filled payment form",
    level: "info",
    data: { fieldsCompleted: ["cardNumber", "expiry", "cvv", "billingAddress"] },
  });

  breadcrumbManager.add({
    timestamp: now - 5000,
    category: "network",
    message: "POST /api/payment/process",
    level: "error",
    data: { status: 500, durationMs: 3200, responseBody: "Internal Server Error" },
  });

  breadcrumbManager.add({
    timestamp: now - 2000,
    category: "console",
    message: "TypeError: Cannot read property 'chargeId' of undefined",
    level: "error",
    data: { source: "console.error" },
  });

  console.log("Breadcrumbs added:", breadcrumbManager.getAll().length);

  // Environment snapshot
  const envSnapshot: EnvironmentSnapshot = {
    url: "https://myapp.com/checkout",
    referrer: "https://myapp.com/products",
    viewport: { width: 1920, height: 1080 },
    scrollPosition: { x: 0, y: 450 },
    networkState: { online: true, connectionType: "4g" },
    memory: {
      usedJSHeapSize: 45 * 1024 * 1024,
      totalJSHeapSize: 67 * 1024 * 1024,
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024,
    },
    timestamp: Date.now(),
  };

  // Error log with breadcrumbs + environment
  logger.error("Payment processing failed", undefined, {
    breadcrumbs: breadcrumbManager.getAll(),
    environment: envSnapshot,
    errorMessage: "TypeError: Cannot read property 'chargeId' of undefined",
    errorStack:
      "TypeError: Cannot read property 'chargeId' of undefined\n" +
      "    at processPayment (https://myapp.com/static/js/main.abc123.js:1:2345)\n" +
      "    at handleCheckout (https://myapp.com/static/js/main.abc123.js:1:6789)\n" +
      "    at onClick (https://myapp.com/static/js/main.abc123.js:1:9012)",
    eventType: "error",
    severity: "critical",
  });

  await logger.flush();
  await delay(1000);

  // Second error: profile load failure with different breadcrumbs
  const profileBreadcrumbs = new BreadcrumbManager(50);
  const now2 = Date.now();

  profileBreadcrumbs.add({
    timestamp: now2 - 12000,
    category: "navigation",
    message: "Navigated to /settings/profile",
    level: "info",
    data: { from: "/dashboard", to: "/settings/profile" },
  });

  profileBreadcrumbs.add({
    timestamp: now2 - 10000,
    category: "network",
    message: "GET /api/users/me",
    level: "info",
    data: { status: 200, durationMs: 85 },
  });

  profileBreadcrumbs.add({
    timestamp: now2 - 8000,
    category: "ui",
    message: "Clicked 'Edit Profile' button",
    level: "info",
    data: { section: "personal-info" },
  });

  profileBreadcrumbs.add({
    timestamp: now2 - 5000,
    category: "network",
    message: "GET /api/users/me/preferences",
    level: "error",
    data: { status: 503, durationMs: 15000 },
  });

  profileBreadcrumbs.add({
    timestamp: now2 - 3000,
    category: "console",
    message: "Error: Service Unavailable - preferences endpoint timeout",
    level: "error",
    data: { source: "console.error" },
  });

  logger.error("Failed to load user profile preferences", undefined, {
    breadcrumbs: profileBreadcrumbs.getAll(),
    environment: {
      ...envSnapshot,
      url: "https://myapp.com/settings/profile",
      referrer: "https://myapp.com/dashboard",
      timestamp: Date.now(),
    },
    errorMessage: "Error: Service Unavailable - preferences endpoint timeout",
    eventType: "error",
    severity: "high",
    userId: "usr_42",
  });

  await logger.flush();
  await delay(2000);

  sectionFooter("Breadcrumbs + Environment Snapshot");

  // -----------------------------------------------------------------------
  // Section 4: Mixed Log Levels and Event Types
  // -----------------------------------------------------------------------
  sectionHeader("Section 4: Mixed Log Levels and Event Types");

  logger.trace("Component render cycle completed", {
    eventType: "performance",
    component: "DashboardGrid",
    renderTimeMs: 4.2,
    reRenderCount: 3,
  });

  logger.debug("Cache lookup for user session", {
    eventType: "console",
    cacheKey: "session:usr_42",
    hit: true,
    ttlRemainingMs: 185000,
  });

  logger.info("Page viewed: Analytics Dashboard", {
    eventType: "pageview",
    page: "/dashboard/analytics",
    loadTimeMs: 1240,
    referrer: "/dashboard",
    sessionId: "sess_xyz789",
  });

  logger.warn("High memory usage detected", {
    eventType: "performance",
    heapUsedMB: 412,
    heapTotalMB: 512,
    percentUsed: 80.5,
    threshold: 75,
  });

  logger.error("Failed to fetch remote configuration", new Error("NetworkError: timeout after 10000ms"), {
    eventType: "network",
    url: "https://config.myapp.com/v1/flags",
    method: "GET",
    timeoutMs: 10000,
    retryCount: 3,
  });

  logger.fatal("Unrecoverable state corruption detected", new Error("StateError: store checksum mismatch"), {
    eventType: "error",
    storeId: "main",
    expectedChecksum: "a1b2c3d4",
    actualChecksum: "e5f6g7h8",
    recoveryAction: "full_reload",
  });

  await logger.flush();
  await delay(2000);

  sectionFooter("Mixed Log Levels and Event Types");

  // -----------------------------------------------------------------------
  // Section 5: Errors with Stack Traces
  // -----------------------------------------------------------------------
  sectionHeader("Section 5: Errors with Stack Traces");

  // Error with minified stack trace
  const minifiedError = new Error("Uncaught TypeError: a.map is not a function");
  minifiedError.stack =
    "TypeError: a.map is not a function\n" +
    "    at t.render (https://myapp.com/static/js/main.abc123.js:1:45678)\n" +
    "    at Wo (https://myapp.com/static/js/vendor.def456.js:2:12345)\n" +
    "    at Zo (https://myapp.com/static/js/vendor.def456.js:2:23456)\n" +
    "    at Ks (https://myapp.com/static/js/vendor.def456.js:2:34567)\n" +
    "    at Li (https://myapp.com/static/js/vendor.def456.js:2:45678)";

  logger.error("Minified production error caught", minifiedError, {
    eventType: "error",
    sourceMap: "available",
    buildId: "build_20260304_001",
    affectedComponent: "ProductList",
  });

  await logger.flush();
  await delay(1000);

  // 5 recurring errors with the same message (for error grouping)
  for (let i = 1; i <= 5; i++) {
    const recurringError = new Error("API response parsing failed");
    recurringError.stack =
      "Error: API response parsing failed\n" +
      "    at parseJSON (https://myapp.com/static/js/main.abc123.js:1:11111)\n" +
      `    at fetchData (https://myapp.com/static/js/main.abc123.js:1:${22222 + i * 10})\n` +
      "    at async loadDashboard (https://myapp.com/static/js/main.abc123.js:1:33333)";

    logger.error("API response parsing failed", recurringError, {
      eventType: "error",
      occurrenceIndex: i,
      endpoint: "/api/v2/dashboard/metrics",
      responseStatus: 200,
      responseContentType: "text/html",
      expectedContentType: "application/json",
    });

    if (i % 3 === 0) {
      await logger.flush();
      await delay(500);
    }
  }

  await logger.flush();
  await delay(1000);

  // Network timeout error
  const timeoutError = new Error("AbortError: The operation was aborted due to timeout");
  timeoutError.stack =
    "AbortError: The operation was aborted due to timeout\n" +
    "    at XMLHttpRequest.send (native)\n" +
    "    at fetchWithRetry (https://myapp.com/static/js/main.abc123.js:1:55555)\n" +
    "    at async syncData (https://myapp.com/static/js/main.abc123.js:1:66666)";

  logger.error("Network request timed out", timeoutError, {
    eventType: "network",
    url: "https://api.myapp.com/v2/sync",
    method: "POST",
    timeoutMs: 30000,
    payloadSizeBytes: 245000,
    networkType: "4g",
    retryAttempt: 3,
    maxRetries: 3,
  });

  await logger.flush();
  await delay(2000);

  sectionFooter("Errors with Stack Traces");

  // -----------------------------------------------------------------------
  // Section 6: Data Sanitization
  // -----------------------------------------------------------------------
  sectionHeader("Section 6: Data Sanitization");

  logger.warn("User submitted form with sensitive data", {
    formData: {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "+1-555-867-5309",
      ssn: "123-45-6789",
      creditCard: "4111-1111-1111-1111",
      apiKey: "sk_live_FAKE_KEY_FOR_TESTING_ONLY",
      address: "123 Main St, Springfield, IL 62704",
    },
    submissionSource: "checkout-form",
    eventType: "interaction",
  });

  console.log("PII log sent (should be sanitized by SDK before transmission)");
  await logger.flush();
  await delay(2000);

  sectionFooter("Data Sanitization");

  // -----------------------------------------------------------------------
  // Section 7: Shutdown
  // -----------------------------------------------------------------------
  sectionHeader("Section 7: Shutdown");

  console.log("Waiting 5 seconds before shutdown to ensure all logs are delivered...");
  await delay(5000);

  await logger.shutdown();
  console.log("Logger shutdown complete. Initialized:", logger.isInitialized());

  sectionFooter("Shutdown");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main()
  .then(() => {
    console.log("\n" + "=".repeat(70));
    console.log("  E2E Phase 2 Test -- ALL SECTIONS COMPLETE");
    console.log("=".repeat(70) + "\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("E2E Phase 2 test failed with error:", err);
    process.exit(1);
  });
