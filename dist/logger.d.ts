/**
 * @file src/logger.ts
 * @description Implements the main RemoteLogger class for sending logs to a remote service.
 */
import { LoggerConfig } from './types';
/**
 * The main class for the RemoteLogger SDK.
 * Provides methods to log messages at different levels and handles sending them to a remote endpoint.
 */
export declare class RemoteLogger {
    private _config;
    private _logBuffer;
    private _context;
    private _flushTimer;
    private _isFlushing;
    private _isShuttingDown;
    private _axiosInstance;
    /**
     * Initializes a new instance of the RemoteLogger.
     * @param config Configuration options for the logger.
     */
    constructor(config: LoggerConfig);
    /**
     * Initializes the logger by starting the periodic flush timer.
     * This is called automatically by the constructor but can be called manually if needed.
     */
    init(): void;
    /**
     * Sets or merges global context that will be included with every log entry.
     * @param context An object containing key-value pairs for global context.
     */
    setContext(context: Record<string, any>): void;
    /**
     * Internal method to process and buffer log entries.
     * @param level The log level.
     * @param message The log message.
     * @param error Optional Error object.
     * @param data Optional structured data.
     */
    private _log;
    /**
     * Logs a message at the TRACE level.
     * @param message The log message.
     * @param data Optional structured data.
     */
    trace(message: string, data?: Record<string, any>): void;
    /**
     * Logs a message at the DEBUG level.
     * @param message The log message.
     * @param data Optional structured data.
     */
    debug(message: string, data?: Record<string, any>): void;
    /**
     * Logs a message at the INFO level.
     * @param message The log message.
     * @param data Optional structured data.
     */
    info(message: string, data?: Record<string, any>): void;
    /**
     * Logs a message at the WARN level.
     * @param message The log message.
     * @param data Optional structured data.
     */
    warn(message: string, data?: Record<string, any>): void;
    /**
     * Logs a message at the ERROR level.
     * @param message The log message.
     * @param error Optional Error object.
     * @param data Optional structured data.
     */
    error(message: string, error?: Error, data?: Record<string, any>): void;
    /**
     * Logs a message at the FATAL level.
     * @param message The log message.
     * @param error Optional Error object.
     * @param data Optional structured data.
     */
    fatal(message: string, error?: Error, data?: Record<string, any>): void;
    /**
     * Forces an immediate flush of the log buffer.
     * This method is asynchronous and returns a Promise that resolves when flushing is complete.
     */
    flush(): Promise<void>;
    /**
     * Sends a batch of logs to the remote endpoint with retry logic.
     * @param logs The array of log entries to send.
     * @private
     */
    private _sendLogs;
    /**
     * Shuts down the logger, clearing the flush timer and attempting to send any remaining logs.
     * This should be called before your application exits to ensure all logs are sent.
     */
    shutdown(): Promise<void>;
}
