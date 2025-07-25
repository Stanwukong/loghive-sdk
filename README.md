# Remote Logger SDK
A robust and easy-to-use Software Development Kit (SDK) for integrating with the Remote Logger Platform. This SDK allows you to send structured log data from your applications to a centralized logging service with minimal effort, offering features like batching, retries, and contextual logging.

## ✨ Features
- Structured Logging: Send messages with associated data objects for richer insights.

- Multiple Log Levels: Support for `trace`, `debug`, `info`,`warn`, `error`, and `fatal` log levels.

- Configurable Minimum Log Level: Control which log levels are actually sent to the remote service.

- Automatic Batching: Efficiently send logs in configurable batches to reduce network overhead.

- Time-based Flushing: Automatically flush logs at a set interval, even if batch size isn't met.

- Retry Mechanism: Built-in exponential backoff and retry logic for transient network failures.

- Global Context: Attach common metadata (e.g., `userId`, `sessionId`) to all logs.

- Error Object Handling: Automatically extracts `name`, `message`, and `stack` from `Error` objects.

- Graceful Shutdown: Ensures all pending logs are sent before application exit.

- TypeScript Support: Fully typed for better developer experience.

## 🚀 Installation
Install the SDK using npm or yarn:
```
npm install remote-logger-sdk axios
# or
yarn add remote-logger-sdk axios
```

Note: `axios` is a peer dependency and must be installed separately.

🛠️ Configuration
Before using the logger, you need to initialize it with your API key, project ID, and the remote endpoint.

```javascript
import { RemoteLogger, LogLevel } from 'remote-logger-sdk';

const logger = new RemoteLogger({
  apiKey: 'YOUR_API_KEY_HERE',           // Required: Get this from your Remote Logger Platform dashboard
  projectId: 'YOUR_PROJECT_ID_HERE',     // Required: Your project identifier
  endpoint: 'https://api.yourlogger.com/v1/logs', // Required: Your Remote Logger API endpoint
  minLogLevel: LogLevel.INFO,            // Optional: Default is LogLevel.INFO
  batchSize: 10,                         // Optional: Default is 10 logs per batch
  flushIntervalMs: 5000,                 // Optional: Default is 5000ms (5 seconds)
  maxRetries: 3,                         // Optional: Default is 3 retries
  retryDelayMs: 1000,                    // Optional: Default is 1000ms (1 second)
  environment: 'production',             // Optional: Default is 'development'
  serviceName: 'my-awesome-app',         // Optional: Default is 'unknown-service'
  serviceVersion: '1.0.0',               // Optional: Default is '1.0.0'
});
```

**Important**: For production environments, it's highly recommended to load your `apiKey` and `projectId` from environment variables (e.g., using `dotenv` in Node.js) rather than hardcoding them.

Environment Variables Example (`.env`)
```
REMOTE_LOGGER_API_KEY=your_super_secret_api_key_here
REMOTE_LOGGER_PROJECT_ID=your_project_id_here
REMOTE_LOGGER_ENDPOINT=https://api.yourlogger.com/v1/logs
```

Then in your application:

```javascript
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

import { RemoteLogger } from 'remote-logger-sdk';

const logger = new RemoteLogger({
  apiKey: process.env.REMOTE_LOGGER_API_KEY!,
  projectId: process.env.REMOTE_LOGGER_PROJECT_ID!,
  endpoint: process.env.REMOTE_LOGGER_ENDPOINT!,
  // ... other optional configurations
});
```

## ✍️ Usage
**Logging Messages**
The SDK provides methods for each log level:

```javascript
// Log an informational message
logger.info('User logged in successfully.', { userId: '123', ipAddress: '192.168.1.100' });

// Log a warning
logger.warn('Database connection is slow.', { durationMs: 1200 });

// Log an error with an Error object and additional data
try {
  throw new Error('File not found at path: /app/data/config.json');
} catch (error) {
  logger.error('Configuration file missing.', error as Error, { filePath: '/app/data/config.json' });
}

// Log a fatal error (critical application failure)
try {
  // Simulate a critical failure
  const result = JSON.parse('invalid json');
} catch (error) {
  logger.fatal('Application crashed due to malformed JSON.', error as Error);
}

// Debug and Trace logs (only sent if minLogLevel is set to DEBUG or TRACE respectively)
logger.debug('Debugging a specific function call.', { functionName: 'calculateTax', input: 150 });
logger.trace('Entering function: processOrder.', { orderId: 'ORD-456' });
```

**Setting Global Context**
You can set global context that will be automatically included with every log entry. This is useful for common identifiers like user IDs, session IDs, or request IDs.

```javascript
// Set initial global context
logger.setContext({
  userId: 'current-user-id',
  sessionId: 'active-session-id',
});

// Later, update or add more context
logger.setContext({
  transactionId: 'txn-789',
});

// All subsequent logs will include userId, sessionId, and transactionId
logger.info('Transaction processed.');
```

**Manual Flushing**
Logs are automatically flushed based on `batchSize` or `flushIntervalMs`. However, you can force an immediate flush:


```javascript
// Send any buffered logs immediately
await logger.flush();
```

**Graceful Shutdown**
It's crucial to call shutdown() before your application exits (especially in Node.js applications) to ensure all pending logs are sent.

```javascript
// Example for a Node.js application
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down logger...');
  await logger.shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Rejection at:', reason, { promise });
  // Optionally, trigger shutdown after a short delay to ensure log is sent
  setTimeout(async () => { await logger.shutdown(); process.exit(1); }, 1000);
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception:', error);
  // Optionally, trigger shutdown after a short delay to ensure log is sent
  setTimeout(async () => { await logger.shutdown(); process.exit(1); }, 1000);
});

// At the very end of your application's lifecycle, or before process.exit()
// await logger.shutdown();
```

## ⚙️ Advanced Configuration
Here's a detailed look at the optional configuration parameters:

- `minLogLevel`: (`LogLevel` enum, default: `LogLevel.INFO`)

    - Sets the minimum severity level for logs to be processed and sent. Logs below this level are discarded client-side.

    - Options: `LogLevel.TRACE`, `LogLevel.DEBUG`, `LogLevel.INFO`, `LogLevel.WARN`, `LogLevel.ERROR`, `LogLevel.FATAL`.

- `batchSize`: (`number`, default: `10`)

    - The number of log entries to collect in an internal buffer before automatically sending them as a single batch to the remote endpoint.

- `flushIntervalMs`: (`number`, default: `5000`)

    - The time interval (in milliseconds) at which the log buffer is automatically flushed, regardless of whether `batchSize` has been reached. This ensures logs are sent even during periods of low activity.

- `maxRetries`: (`number`, default: `3`)

    - The maximum number of times the SDK will attempt to resend a failed log batch.

- `retryDelayMs`: (`number`, default: `1000`)

    - The initial delay (in milliseconds) before the first retry attempt. Subsequent retries use an exponential backoff strategy with jitter.

- `environment`: (`string`, default: `'development'`)

    - A string identifying the deployment environment (e.g., `production`, `staging`, `development`). This is included in each log entry.

- `serviceName`: (`string`, default: `'unknown-service'`)

    - A string identifying the name of the application or service sending the logs.

- `serviceVersion`: (`string`, default: `'1.0.0'`)

    - A string representing the version of the application or service sending the logs.

## 🤝 Contributing
Contributions are welcome! If you find a bug or have a feature request, please open an issue. If you'd like to contribute code, please fork the repository and submit a pull request.

## 📄 License
This project is licensed under the MIT License - see the LICENSE(./LICENSE) file for details.