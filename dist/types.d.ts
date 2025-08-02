/**
 * @file src/types.ts
 * @description Defines the core types and interfaces for the Monita SDK.
 */
/**
 * Enum for supported log levels.
 */
export declare enum LogLevel {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    FATAL = "fatal"
}
/**
 * Interface for the configuration options of the Monita SDK.
 */
export interface LoggerConfig {
    /**
     * Your unique API key for authentication with the LogHive service.
     * This is required.
     */
    apiKey: string;
    /**
     * Your project ID, used to categorize logs on the LogHive platform.
     * This is required.
     */
    projectId: string;
    /**
     * The URL of your Lo API endpoint where logs will be sent.
     * Default: 'https://api.yourlogger.com/v1/logs' (placeholder)
     */
    endpoint?: string;
    /**
     * The minimum log level to capture and send. Logs below this level will be ignored.
     * Default: LogLevel.INFO
     */
    minLogLevel?: LogLevel;
    /**
     * The maximum number of log entries to buffer before sending them in a single batch.
     * Default: 10
     */
    batchSize?: number;
    /**
     * The interval (in milliseconds) at which to flush the log buffer, even if batchSize is not reached.
     * Default: 5000 (5 seconds)
     */
    flushIntervalMs?: number;
    /**
     * The maximum number of times to retry sending a failed log request.
     * Default: 3
     */
    maxRetries?: number;
    /**
     * The initial delay (in milliseconds) before the first retry, used with exponential backoff.
     * Default: 1000 (1 second)
     */
    retryDelayMs?: number;
    /**
     * The environment where the application is running (e.g., 'development', 'production', 'staging').
     * Default: 'development'
     */
    environment?: string;
    /**
     * The name of the service or application sending the logs.
     * Default: 'unknown-service'
     */
    serviceName?: string;
    /**
     * The version of the service or application sending the logs.
     * Default: '1.0.0'
     */
    serviceVersion?: string;
}
/**
 * Interface representing a single log entry to be sent to LogHive.
 */
export interface LogEntry {
    /**
     * ISO 8601 timestamp of when the log occurred.
     */
    timestamp?: string;
    /**
     * The log level (e.g., 'info', 'error').
     */
    level: LogLevel;
    /**
     * The main log message.
     */
    message: string;
    /**
     * Optional structured data associated with the log.
     */
    data?: Record<string, any>;
    /**
     * Optional error details (name, message, stack).
     */
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    /**
     * The name of the service that generated the log.
     */
    service?: string;
    /**
     * The environment where the service is running.
     */
    environment?: string;
    /**
     * Additional context that applies to this specific log entry (merged with global context).
     */
    context?: Record<string, any>;
    /**
     * Optional metadata for additional information about the log entry.
     */
    metadata?: any;
}
