/**
 * @file example/index.ts
 * @description Example usage of the RemoteLogger SDK.
 * This file demonstrates how to initialize, configure, and use the logger.
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

import dotenv from 'dotenv';
import { RemoteLogger, LogLevel } from '../src'; // Adjust path if running from different directory

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
const API_KEY = process.env.REMOTE_LOGGER_API_KEY;
const PROJECT_ID = process.env.REMOTE_LOGGER_PROJECT_ID;
const ENDPOINT = process.env.REMOTE_LOGGER_ENDPOINT;

if (!API_KEY || !PROJECT_ID || !ENDPOINT) {
  console.error('Missing environment variables. Please set REMOTE_LOGGER_API_KEY, REMOTE_LOGGER_PROJECT_ID, and REMOTE_LOGGER_ENDPOINT in your .env file.');
  process.exit(1);
}

// --- Initialize the logger ---
const logger = new RemoteLogger({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  endpoint: ENDPOINT,
  minLogLevel: LogLevel.INFO, // Only send INFO, WARN, ERROR, FATAL logs
  batchSize: 3,              // Send logs in batches of 3
  flushIntervalMs: 2000,     // Or every 2 seconds
  maxRetries: 2,             // Max 2 retries
  retryDelayMs: 500,         // Initial retry delay of 0.5 seconds
  environment: 'development',
  serviceName: 'example-node-app',
  serviceVersion: '1.0.0-beta',
});

// --- Set global context ---
logger.setContext({
  userId: 'user-abc-123',
  sessionId: `sess-${Math.random().toString(36).substring(2, 11)}`,
  appInstanceId: `inst-${Date.now()}`,
});

console.log('RemoteLogger Example Started...');
console.log('Sending logs...');

// --- Log various messages ---

logger.trace('This trace message should NOT be sent.', { detail: 'Trace level' }); // Ignored by minLogLevel
logger.debug('This debug message should also NOT be sent.', { detail: 'Debug level' }); // Ignored by minLogLevel

logger.info('User logged in successfully.', { username: 'Alice', ipAddress: '192.168.1.1' });
logger.warn('High CPU usage detected on server.', { cpuPercent: 85, serverId: 'prod-web-01' });

// Simulate an error
try {
  throw new Error('Failed to connect to external service.');
} catch (err) {
  logger.error('External service connection failed.', err as Error, { service: 'payment-gateway', attempt: 3 });
}

// Log a few more to trigger batching
logger.info('Processing data batch 1.', { records: 100 });
logger.info('Processing data batch 2.', { records: 150 });
logger.info('Processing data batch 3.', { records: 200 }); // This should trigger a flush due to batchSize

// Simulate another error
setTimeout(() => {
  try {
    const data = JSON.parse('{"invalid json"'); // This will throw a syntax error
  } catch (err) {
    logger.fatal('Critical application error: JSON parsing failed!', err as Error, { file: 'config.json' });
  }
}, 3000); // After 3 seconds

// Log some messages that will be caught by the flushIntervalMs
setTimeout(() => {
  logger.info('Background task completed.', { taskName: 'cleanup', durationMs: 50 });
  logger.warn('Low disk space warning.', { diskFreeGB: 5 });
}, 6000); // After 6 seconds

// --- Graceful shutdown ---
// In a real application, you'd hook this into process exit signals.
// For this example, we'll wait a bit and then manually shut down.
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Shutting down logger...');
  await logger.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM. Shutting down logger...');
  await logger.shutdown();
  process.exit(0);
});

// Ensure all logs are sent before the process exits naturally
// In a real server, you might use 'beforeExit' or specific server shutdown hooks.
setTimeout(async () => {
  console.log('\nExample run complete. Initiating graceful shutdown...');
  await logger.shutdown();
  console.log('Example process exiting.');
  process.exit(0);
}, 10000); // Wait 10 seconds to allow logs to be sent
