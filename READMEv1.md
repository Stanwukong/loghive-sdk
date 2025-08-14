# Monita SDK

A powerful, easy-to-use TypeScript SDK for sending application logs to the LogHive logging platform. Features automatic instrumentation, smart log levels, performance monitoring, and comprehensive framework integrations for real-time application monitoring and debugging.

## 🚀 Quick Start

### Installation

```bash
npm install monita
```

### Basic Usage

```typescript
import { Monita } from "monita";

// Initialize the logger
const logger = new Monita({
  apiKey: "your-api-key-here",
  projectId: "your-project-id-here",
});

// Start logging!
logger.info("Application started successfully");
logger.error("Something went wrong", new Error("Database connection failed"));
```

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Logging](#basic-logging)
- [Auto-Instrumentation](#)
- [Advanced Features](#advanced-features)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## 🛠 Configuration

### Required Configuration

```typescript
const logger = new Monita({
  apiKey: "your-api-key-here", // Your API authentication key
  projectId: "your-project-id-here", // Your project identifier
});
```

### Full Configuration Options

```typescript
const logger = new Monita({
  // Required
  apiKey: 'your-api-key-here',
  projectId: 'your-project-id-here',
  endpoint: 'https://api.yourlogger.com/api/v1' // Your preferred log ingestion tool

  // Optional - Logging behavior
  minLogLevel: LogLevel.INFO,          // Minimum level to log (default: INFO)
  batchSize: 10,                       // Number of logs to batch together (default: 10)
  flushIntervalMs: 5000,               // How often to send logs in ms (default: 5000)

  // Optional - Retry configuration
  maxRetries: 3,                       // Max retry attempts (default: 3)
  retryDelayMs: 1000,                  // Initial retry delay in ms (default: 1000)

  // Optional - Metadata
  environment: 'production',           // Environment name (default: 'development')
  serviceName: 'my-awesome-app',       // Service name (default: 'unknown-service')
  serviceVersion: '2.1.0'              // Service version (default: '1.0.0')
});
```

## 📝 Basic Logging

### Log Levels

The SDK supports 6 log levels (from lowest to highest priority):

```typescript
import { LogLevel } from "monita-sdk";

logger.trace("Very detailed debug information"); // TRACE
logger.debug("Debug information for developers"); // DEBUG
logger.info("General information about app flow"); // INFO
logger.warn("Warning - something might be wrong"); // WARN
logger.error("Error occurred but app can continue"); // ERROR
logger.fatal("Critical error - app might crash"); // FATAL
```

### Simple Logging

```typescript
// Basic message logging
logger.info("User logged in successfully");
logger.warn("API rate limit approaching");
logger.error("Failed to process payment");
```

### Logging with Data

```typescript
// Add structured data to your logs
logger.info("User action performed", {
  userId: 12345,
  action: "file_upload",
  fileName: "document.pdf",
  fileSize: 2048576,
});

logger.error("Database query failed", {
  query: "SELECT * FROM users WHERE id = ?",
  parameters: [userId],
  executionTime: 1500,
});
```

### Logging Errors

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Log the actual error object for full stack trace
  logger.error("Operation failed", error, {
    operation: "user_registration",
    userId: 12345,
    timestamp: new Date().toISOString(),
  });
}
```

## 🎯 Advanced Features

### Global Context

Set information that will be included with every log:

```typescript
// Set global context once
logger.setContext({
  userId: 12345,
  sessionId: "abc-123-def",
  version: "1.2.3",
  environment: "production",
});

// All subsequent logs will include this context
logger.info("Page viewed"); // Will include userId, sessionId, etc.
logger.error("Error occurred"); // Will also include the global context

// Add more context (merges with existing)
logger.setContext({
  feature: "checkout",
  experimentGroup: "A",
});
```

### Manual Flushing

By default, logs are sent automatically based on `batchSize` and `flushIntervalMs`. You can also flush manually:

```typescript
// Send all buffered logs immediately
await logger.flush();

// Useful before application shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await logger.shutdown(); // Flushes logs and cleans up
  process.exit(0);
});
```

### Log Level Filtering

Control which logs are sent based on importance:

```typescript
const logger = new Monita({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  minLogLevel: LogLevel.WARN, // Only send WARN, ERROR, and FATAL logs
});

logger.debug("This will be ignored"); // Won't be sent
logger.info("This will be ignored"); // Won't be sent
logger.warn("This will be sent"); // Will be sent
logger.error("This will be sent"); // Will be sent
```

## ⚠️ Error Handling

The SDK handles errors gracefully and won't crash your application:

```typescript
// Network errors are handled automatically with retries
logger.info("This log will be retried if network fails");

// Authentication errors are logged but won't throw
// Check console for error messages like:
// "Monita: Authentication/Authorization failed. Check API Key."

// Failed logs are re-queued for later attempts
// You'll see: "Monita: Failed to send logs after retries. Re-adding to buffer."
```

### Monitoring SDK Health

```typescript
// Listen for SDK status (if you need custom error handling)
const logger = new Monita({
  apiKey: "your-api-key",
  projectId: "your-project-id",
});

// The SDK will log its own status to console:
// ✅ "Monita: Successfully sent 5 logs."
// ❌ "Monita: API Error 500 on attempt 1: ..."
// 🔄 "Monita: Retrying in 1000ms... (Attempt 1 of 3)"
```

## 💡 Best Practices

### 1. Initialize Once, Use Everywhere

```typescript
// logger.ts - Create a shared logger instance
import { Monita, LogLevel } from "monita-sdk";

export const logger = new Monita({
  apiKey: process.env.REMOTELOGGER_API_KEY!,
  projectId: process.env.REMOTELOGGER_PROJECT_ID!,
  environment: process.env.NODE_ENV || "development",
  serviceName: "my-api-server",
  minLogLevel:
    process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
});

// other-file.ts - Import and use
import { logger } from "./logger";
logger.info("Using shared logger instance");
```

### 2. Use Environment Variables

```bash
# .env file
REMOTELOGGER_API_KEY=your-secret-api-key
REMOTELOGGER_PROJECT_ID=your-project-id
NODE_ENV=production
```

### 3. Structure Your Log Data

```typescript
// ❌ Avoid unstructured logs
logger.info(
  "User John Doe (ID: 123) uploaded file document.pdf (2MB) at 2024-01-15"
);

// ✅ Use structured data instead
logger.info("File uploaded successfully", {
  user: {
    id: 123,
    name: "John Doe",
  },
  file: {
    name: "document.pdf",
    size_bytes: 2097152,
    type: "application/pdf",
  },
  timestamp: "2024-01-15T10:30:00Z",
});
```

### 4. Handle Application Shutdown

```typescript
// Ensure logs are sent before app closes
async function gracefulShutdown() {
  console.log("Shutting down application...");

  // Flush any remaining logs
  await logger.shutdown();

  // Close database connections, etc.
  await database.close();

  process.exit(0);
}

process.on("SIGINT", gracefulShutdown); // Ctrl+C
process.on("SIGTERM", gracefulShutdown); // Docker/K8s shutdown
```

### 5. Performance Considerations

```typescript
// For high-throughput applications
const logger = new Monita({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  batchSize: 50, // Send more logs per request
  flushIntervalMs: 2000, // Send more frequently
  maxRetries: 1, // Fewer retries for better performance
});

// Avoid logging in tight loops
for (let i = 0; i < 10000; i++) {
  // ❌ Don't do this - will overwhelm the logger
  // logger.debug(`Processing item ${i}`);
}

// ✅ Better approach
logger.info("Starting batch processing", { itemCount: 10000 });
// ... do your processing ...
logger.info("Batch processing completed", {
  itemCount: 10000,
  duration: endTime - startTime,
});
```

## 📖 API Reference

### Constructor Options

| Option            | Type     | Required | Default           | Description                 |
| ----------------- | -------- | -------- | ----------------- | --------------------------- |
| `apiKey`          | string   | ✅       | -                 | Your API authentication key |
| `projectId`       | string   | ✅       | -                 | Your project identifier     |
| `endpoint`        | string   | ✅       | -                 | Your logging platform URL   |
| `minLogLevel`     | LogLevel | ❌       | INFO              | Minimum log level to send   |
| `batchSize`       | number   | ❌       | 10                | Logs per batch request      |
| `flushIntervalMs` | number   | ❌       | 5000              | Auto-flush interval (ms)    |
| `maxRetries`      | number   | ❌       | 3                 | Max retry attempts          |
| `retryDelayMs`    | number   | ❌       | 1000              | Initial retry delay (ms)    |
| `environment`     | string   | ❌       | 'development'     | Environment name            |
| `serviceName`     | string   | ❌       | 'unknown-service' | Service name                |
| `serviceVersion`  | string   | ❌       | '1.0.0'           | Service version             |

### Logging Methods

```typescript
// All methods accept: (message: string, data?: object)
logger.trace(message, data?)   // TRACE level
logger.debug(message, data?)   // DEBUG level
logger.info(message, data?)    // INFO level
logger.warn(message, data?)    // WARN level

// Error methods accept: (message: string, error?: Error, data?: object)
logger.error(message, error?, data?)  // ERROR level
logger.fatal(message, error?, data?)  // FATAL level
```

### Utility Methods

```typescript
// Set global context
logger.setContext(context: Record<string, any>): void

// Manually flush logs
logger.flush(): Promise<void>

// Graceful shutdown
logger.shutdown(): Promise<void>
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "API Key is required" Error

```typescript
// ❌ Missing API key
const logger = new Monita({
  projectId: "my-project",
});

// ✅ Include API key
const logger = new Monita({
  apiKey: "your-api-key-here",
  projectId: "my-project",
  endpoint: "https://api.yourlogger.com/api/v1",
});
```

#### 2. "Failed to send logs" - Network Issues

- Check your internet connection
- Verify the endpoint URL is correct
- Ensure your logging platform is accessible
- Check firewall/proxy settings

#### 3. "Authentication/Authorization failed"

- Verify your API key is correct
- Check if your API key has expired
- Ensure your project ID matches your API key

#### 4. Logs Not Appearing

```typescript
// Make sure you're above the minimum log level
const logger = new Monita({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  endpoint: "https://api.yourlogger.com/api/v1",
  minLogLevel: LogLevel.ERROR, // Only ERROR and FATAL will be sent
});

logger.info("This will be ignored"); // Won't be sent
logger.error("This will be sent"); // Will be sent
```

#### 5. Performance Issues

```typescript
// Reduce batch size and increase flush frequency for faster delivery
const logger = new Monita({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  endpoint: "https://api.yourlogger.com/api/v1",
  batchSize: 1, // Send immediately
  flushIntervalMs: 100, // Check every 100ms
});
```

### Debug Mode

Enable debug logging to see what's happening:

```typescript
// The SDK automatically logs its status to console
// Look for messages like:
// "Monita: Successfully sent 3 logs."
// "Monita: API Error 401 on attempt 1: Unauthorized"
// "Monita: Retrying in 2000ms... (Attempt 2 of 3)"
```

## 📚 Examples

### Express.js API Server

```typescript
import express from "express";
import { Monita, LogLevel } from "monita-sdk";

const app = express();
const logger = new Monita({
  apiKey: process.env.REMOTELOGGER_API_KEY!,
  projectId: process.env.REMOTELOGGER_PROJECT_ID!,
  endpoint: process.env.REMOTELOGGER_ENDPOINT!,
  environment: process.env.NODE_ENV,
  serviceName: "api-server",
});

// Middleware to log all requests
app.use((req, res, next) => {
  logger.info("HTTP Request", {
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
  });
  next();
});

// API endpoint
app.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    logger.info("Fetching user", { userId });

    const user = await getUserById(userId);

    logger.info("User fetched successfully", {
      userId,
      userEmail: user.email,
    });

    res.json(user);
  } catch (error) {
    logger.error("Failed to fetch user", error, {
      userId: req.params.id,
      requestId: req.get("X-Request-ID"),
    });

    res.status(500).json({ error: "Internal server error" });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Server shutting down");
  await logger.shutdown();
  process.exit(0);
});

app.listen(3000, () => {
  logger.info("Server started", { port: 3000 });
});
```

### React Application

```typescript
// logger.ts
import { Monita, LogLevel } from "monita-sdk";

export const logger = new Monita({
  apiKey: process.env.REACT_APP_REMOTELOGGER_API_KEY!,
  projectId: process.env.REACT_APP_REMOTELOGGER_PROJECT_ID!,
  endpoint: process.env.REACT_APP_REMOTELOGGER_ENDPOINT!,
  environment: process.env.NODE_ENV,
  serviceName: "react-frontend",
  minLogLevel:
    process.env.NODE_ENV === "production" ? LogLevel.WARN : LogLevel.DEBUG,
});

// App.tsx
import React, { useEffect } from "react";
import { logger } from "./logger";

function App() {
  useEffect(() => {
    logger.info("App mounted", {
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Log errors
    window.addEventListener("error", (event) => {
      logger.error("Unhandled JavaScript error", event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    return () => {
      logger.info("App unmounting");
    };
  }, []);

  const handleButtonClick = () => {
    logger.info("Button clicked", {
      component: "App",
      action: "button_click",
    });
  };

  return (
    <div className="App">
      <button onClick={handleButtonClick}>Click me</button>
    </div>
  );
}

export default App;
```

### Background Job Processor

```typescript
import { Monita } from "monita-sdk";

const logger = new Monita({
  apiKey: process.env.REMOTELOGGER_API_KEY!,
  projectId: process.env.REMOTELOGGER_PROJECT_ID!,
  endpoint: process.env.REMOTELOGGER_ENDPOINT!,
  serviceName: "job-processor",
  environment: "production",
});

class EmailProcessor {
  async processEmailQueue() {
    logger.info("Starting email queue processing");

    try {
      const emails = await getEmailQueue();
      logger.info("Retrieved email queue", { emailCount: emails.length });

      for (const email of emails) {
        await this.sendEmail(email);
      }

      logger.info("Email queue processing completed", {
        emailCount: emails.length,
      });
    } catch (error) {
      logger.error("Email queue processing failed", error);
      throw error;
    }
  }

  private async sendEmail(email: Email) {
    const startTime = Date.now();

    try {
      logger.debug("Sending email", {
        emailId: email.id,
        recipient: email.to,
      });

      await emailService.send(email);

      logger.info("Email sent successfully", {
        emailId: email.id,
        recipient: email.to,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("Failed to send email", error, {
        emailId: email.id,
        recipient: email.to,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }
}

// Usage
const processor = new EmailProcessor();
processor
  .processEmailQueue()
  .then(() => logger.info("Job completed successfully"))
  .catch((error) => logger.fatal("Job failed completely", error))
  .finally(() => logger.shutdown());
```

## 🤝 Support

If you encounter any issues or need help:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review your configuration and API credentials
3. Check your network connectivity to the logging platform
4. Look at console output for SDK status messages

---

**Happy Logging!** 🎉

_This SDK makes it easy to monitor your applications and debug issues with structured, searchable logs sent directly to your logging platform._
