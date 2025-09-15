/**
 * @file example/index.ts
 * @description Comprehensive example usage of the Monita SDK.
 * This file demonstrates initialization, configuration, and various logging scenarios
 * to test the new version of the monita SDK.
 *
 * To run this example:
 * 1. Ensure you have Node.js and npm installed.
 * 2. Run `npm install` in the project root to install dependencies.
 * 3. Create a `.env` file in the project root (next to package.json)
 * and populate it with your API_KEY, PROJECT_ID, and ENDPOINT
 * (refer to .env.example).
 * 4. Run `npm run build` to compile the SDK.
 * 5. Run `npm run start-example` to execute this example.
 */

import dotenv from "dotenv";
import { Monita, LogLevel } from "../src"; // Adjust path if running from different directory

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
const API_KEY = process.env.REMOTE_LOGGER_API_KEY || "your-api-key";
const PROJECT_ID = process.env.REMOTE_LOGGER_PROJECT_ID || "your-project-id";
const ENDPOINT = process.env.REMOTE_LOGGER_ENDPOINT || "https://loghive-server.vercel.app/api/v1";

if (!API_KEY || !PROJECT_ID || !ENDPOINT) {
  console.error(
    "Missing environment variables. Please set REMOTE_LOGGER_API_KEY, REMOTE_LOGGER_PROJECT_ID, and REMOTE_LOGGER_ENDPOINT in your .env file."
  );
  process.exit(1);
}

// --- Initialize the logger with comprehensive configuration ---
const logger = new Monita({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  endpoint: ENDPOINT,
  minLogLevel: LogLevel.TRACE, // Changed to TRACE to match schema enum
  batchSize: 5, // Increased batch size for better testing
  flushIntervalMs: 3000, // Increased interval for testing
  maxRetries: 3, // Increased retries for better reliability
  retryDelayMs: 1000, // Retry delay
  environment: "testing", // Changed to testing environment
  serviceName: "monita-test-app", // Changed from serviceName to service
  autoCapture: {
    networkRequests: true,
    performance: true
  }
});

// --- Set comprehensive global context ---
logger.setContext({
  userId: "test-user-456",
  sessionId: `test-sess-${Math.random().toString(36).substring(2, 15)}`,
  appInstanceId: `test-inst-${Date.now()}`,
  buildVersion: process.env.npm_package_version || "1.0.0",
  nodeVersion: process.version,
  platform: process.platform,
  testRun: true,
  // Note: context will be stored in the 'context' field of the log document
});

console.log("🚀 Monita SDK Test Suite Started...");
console.log("📊 Configuration:", {
  environment: "testing",
  minLogLevel: "TRACE",
  batchSize: 5,
  flushInterval: "3s",
});

console.log(
  "⚠️  Note: Running in Node.js environment - some browser-specific features may not work"
);

// --- Test Suite Functions ---

async function testBasicLogging() {
  console.log("\n📝 Testing Basic Logging Levels...");

  // Test TRACE level (new in schema)
  logger.trace("Detailed trace information for debugging", {
    function: "authenticateUser",
    step: "token_validation",
    traceId: "trace-001",
  });

  logger.debug("Debug message for development testing", {
    feature: "user-auth",
    debugLevel: "verbose",
  });

  logger.info("User authentication successful", {
    username: "testuser@example.com",
    loginMethod: "oauth2",
    ipAddress: "192.168.1.100",
  });

  logger.warn("API rate limit approaching threshold", {
    currentRequests: 950,
    limit: 1000,
    timeWindow: "1hour",
    endpoint: "/api/v1/users",
  });
}

async function testErrorLogging() {
  console.log("\n❌ Testing Error Logging...");

  // Test with simple Error objects to avoid browser-specific ErrorEvent
  try {
    throw new Error("Database connection timeout");
  } catch (err) {
    // Use a simple error message instead of the full Error object to avoid ErrorEvent issues
    logger.error(
      "Database operation failed",
      {
        message: (err as Error).message,
        name: (err as Error).name,
        stack: (err as Error).stack,
      },
      {
        operation: "user_fetch",
        queryTime: 5000,
        database: "users_db",
        retryAttempt: 1,
      }
    );
  }

  try {
    const invalidData = JSON.parse('{"invalid": json}');
  } catch (err) {
    logger.error("JSON parsing error in configuration", undefined, {
      errorMessage: (err as Error).message,
      errorName: (err as Error).name,
      stack: (err as Error).stack,
      configFile: "app-config.json",
      configSection: "database",
    });
  }

  // Test fatal error with error data in the data field instead
  logger.fatal("System critical error detected", undefined, {
    errorMessage: "Critical system failure: Out of memory",
    errorType: "SystemError",
    memoryUsage: "95%",
    availableMemory: "256MB",
    systemLoad: "high",
  });
}

async function testContextualLogging() {
  console.log("\n🔍 Testing Contextual Logging...");

  // Update context for specific operation
  logger.setContext({
    operationId: `op-${Date.now()}`,
    requestId: `req-${Math.random().toString(36).substring(2, 10)}`,
    userRole: "admin",
  });

  logger.info("Starting batch processing operation", {
    batchSize: 1000,
    estimatedDuration: "5 minutes",
    priority: "high",
  });

  logger.info("Batch processing progress update", {
    processed: 250,
    remaining: 750,
    progressPercent: 25,
    errorsEncountered: 0,
  });

  logger.warn("Batch processing performance degradation", {
    processed: 600,
    remaining: 400,
    progressPercent: 60,
    processingRate: "slow",
    avgTimePerRecord: "500ms",
  });
}

async function testHighVolumeLogging() {
  console.log("\n⚡ Testing High Volume Logging (Batch Processing)...");

  // Generate multiple logs quickly to test batching
  for (let i = 1; i <= 8; i++) {
    logger.info(`Batch processing record ${i}`, {
      recordId: `rec-${i.toString().padStart(3, "0")}`,
      processingTime: Math.floor(Math.random() * 500) + 100,
      status: i % 3 === 0 ? "completed" : "processing",
    });

    // Add some variety in log levels including trace
    if (i % 4 === 0) {
      logger.warn(`Performance warning for record ${i}`, {
        recordId: `rec-${i.toString().padStart(3, "0")}`,
        processingTime: Math.floor(Math.random() * 1000) + 800,
        warningType: "slow_processing",
      });
    }

    if (i % 6 === 0) {
      logger.trace(`Detailed trace for record ${i}`, {
        recordId: `rec-${i.toString().padStart(3, "0")}`,
        memoryUsage: `${Math.floor(Math.random() * 100)}MB`,
        cpuTime: `${Math.floor(Math.random() * 50)}ms`,
      });
    }
  }
}

async function testAsyncOperations() {
  console.log("\n⏰ Testing Async Operations and Timing...");

  // Simulate async operations with proper logging
  const operations = [
    { name: "fetch_user_data", delay: 1000 },
    { name: "validate_permissions", delay: 500 },
    { name: "update_user_profile", delay: 1500 },
  ];

  for (const op of operations) {
    const startTime = Date.now();
    logger.trace(`Starting operation: ${op.name}`, { operation: op.name });

    await new Promise((resolve) => setTimeout(resolve, op.delay));

    const duration = Date.now() - startTime;
    logger.info(`Operation completed: ${op.name}`, {
      operation: op.name,
      duration: `${duration}ms`,
      success: true,
    });
  }
}

async function testErrorRecovery() {
  console.log("\n🔄 Testing Error Recovery Scenarios...");

  // Simulate retry scenarios without using Error objects directly
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt < 3) {
        // Simulate failure without throwing actual Error to avoid ErrorEvent issues
        logger.warn(`External API retry ${attempt}`, {
          errorMessage: `External API call failed (attempt ${attempt})`,
          errorType: "APIError",
          service: "payment-processor",
          attempt,
          willRetry: attempt < 3,
        });
      } else {
        logger.info("External API call succeeded after retries", {
          service: "payment-processor",
          attempt,
          totalRetries: attempt - 1,
        });
      }
    } catch (err) {
      // This shouldn't execute now, but kept for safety
      logger.warn(`External API retry ${attempt} - unexpected error`, {
        errorMessage: (err as Error).message,
        service: "payment-processor",
        attempt,
        willRetry: attempt < 3,
      });
    }
  }
}

// --- Main Test Execution ---
async function runTestSuite() {
  try {
    await testBasicLogging();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testErrorLogging();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testContextualLogging();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testHighVolumeLogging();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await testAsyncOperations();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testErrorRecovery();

    console.log("\n✅ All test scenarios completed successfully!");
    console.log("⏳ Waiting for final log flush...");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    // Log error without passing Error object directly
    logger.fatal(
      "Test suite execution failed",
      {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack,
      },
      {
        testSuite: "monita-comprehensive",
        timestamp: new Date().toISOString(),
      }
    );
  }
}

// --- Graceful Shutdown Handlers ---
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  console.log("📤 Flushing remaining logs...");

  try {
    await logger.shutdown();
    console.log("✅ Logger shutdown completed successfully.");
  } catch (error) {
    console.error("❌ Error during logger shutdown:", error);
  }

  process.exit(0);
}

// Register shutdown handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  // Log error details without passing Error object directly
  logger.fatal(
    "Uncaught exception in test suite",
    {
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
    {
      testSuite: "monita-comprehensive",
      timestamp: new Date().toISOString(),
    }
  );
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  // Handle the reason safely
  const errorData =
    reason instanceof Error
      ? {
          errorMessage: reason.message,
          errorName: reason.name,
          stack: reason.stack,
        }
      : {
          errorMessage: String(reason),
          errorType: "UnknownRejection",
        };

  logger.fatal("Unhandled promise rejection in test suite", undefined, {
    ...errorData,
    testSuite: "monita-comprehensive",
    timestamp: new Date().toISOString(),
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

// --- Start the test suite ---
runTestSuite().finally(() => {
  // Natural completion - wait a bit for final flushes then shutdown
  setTimeout(async () => {
    console.log("\n🏁 Test suite completed. Initiating final shutdown...");
    await gracefulShutdown("NATURAL_COMPLETION");
  }, 5000); // Wait 5 seconds for any remaining logs
});
