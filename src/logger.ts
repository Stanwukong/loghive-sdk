/**
 * @file src/logger.ts
 * @description Implements the main RemoteLogger class for sending logs to a remote service.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { LoggerConfig, LogEntry, LogLevel } from './types';
import { delay, getExponentialBackoffDelay, shouldLog, extractErrorDetails } from './utils';

/**
 * The main class for the RemoteLogger SDK.
 * Provides methods to log messages at different levels and handles sending them to a remote endpoint.
 */
export class RemoteLogger {
  private _config: Required<LoggerConfig>;
  private _logBuffer: LogEntry[] = [];
  private _context: Record<string, any> = {};
  private _flushTimer: ReturnType<typeof setInterval> | null = null;
  private _isFlushing: boolean = false;
  private _isShuttingDown: boolean = false;
  private _axiosInstance: AxiosInstance;

  /**
   * Initializes a new instance of the RemoteLogger.
   * @param config Configuration options for the logger.
   */
  constructor(config: LoggerConfig) {
    // Apply default values to the configuration
    this._config = {
      endpoint: 'https://api.yourlogger.com/v1/logs', // Placeholder, replace with your actual API
      minLogLevel: LogLevel.INFO,
      batchSize: 10,
      flushIntervalMs: 5000, // 5 seconds
      maxRetries: 3,
      retryDelayMs: 1000, // 1 second
      environment: 'development',
      serviceName: 'unknown-service',
      serviceVersion: '1.0.0',
      ...config, // Override defaults with provided config
    };

    // Validate required configuration
    if (!this._config.apiKey) {
      console.error('RemoteLogger: API Key is required.');
      throw new Error('RemoteLogger: API Key is required.');
    }
    if (!this._config.projectId) {
      console.error('RemoteLogger: Project ID is required.');
      throw new Error('RemoteLogger: Project ID is required.');
    }

    // Create an Axios instance for HTTP requests
    this._axiosInstance = axios.create({
      baseURL: this._config.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this._config.apiKey, // Custom header for API key authentication
        'X-Project-ID': this._config.projectId, // Custom header for project ID
      },
      timeout: 10000, // 10 seconds timeout for requests
    });

    // Start the automatic flushing timer
    this.init();
  }

  /**
   * Initializes the logger by starting the periodic flush timer.
   * This is called automatically by the constructor but can be called manually if needed.
   */
  public init(): void {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
    }
    this._flushTimer = setInterval(() => {
      this.flush();
    }, this._config.flushIntervalMs);
  }

  /**
   * Sets or merges global context that will be included with every log entry.
   * @param context An object containing key-value pairs for global context.
   */
  public setContext(context: Record<string, any>): void {
    this._context = { ...this._context, ...context };
  }

  /**
   * Internal method to process and buffer log entries.
   * @param level The log level.
   * @param message The log message.
   * @param error Optional Error object.
   * @param data Optional structured data.
   */
  private _log(level: LogLevel, message: string, error?: Error, data?: Record<string, any>): void {
    if (this._isShuttingDown) {
      console.warn(`RemoteLogger: Attempted to log "${message}" during shutdown. Log ignored.`);
      return;
    }

    if (!shouldLog(level, this._config.minLogLevel)) {
      // Log level is below the configured minimum, so ignore it.
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data,
      error: error ? extractErrorDetails(error) : undefined,
      service: this._config.serviceName,
      environment: this._config.environment,
      context: { ...this._context }, // Merge global context
    };

    this._logBuffer.push(logEntry);

    // If batch size is reached, trigger an immediate flush
    if (this._logBuffer.length >= this._config.batchSize) {
      this.flush();
    }
  }

  /**
   * Logs a message at the TRACE level.
   * @param message The log message.
   * @param data Optional structured data.
   */
  public trace(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.TRACE, message, undefined, data);
  }

  /**
   * Logs a message at the DEBUG level.
   * @param message The log message.
   * @param data Optional structured data.
   */
  public debug(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.DEBUG, message, undefined, data);
  }

  /**
   * Logs a message at the INFO level.
   * @param message The log message.
   * @param data Optional structured data.
   */
  public info(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.INFO, message, undefined, data);
  }

  /**
   * Logs a message at the WARN level.
   * @param message The log message.
   * @param data Optional structured data.
   */
  public warn(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.WARN, message, undefined, data);
  }

  /**
   * Logs a message at the ERROR level.
   * @param message The log message.
   * @param error Optional Error object.
   * @param data Optional structured data.
   */
  public error(message: string, error?: Error, data?: Record<string, any>): void {
    this._log(LogLevel.ERROR, message, error, data);
  }

  /**
   * Logs a message at the FATAL level.
   * @param message The log message.
   * @param error Optional Error object.
   * @param data Optional structured data.
   */
  public fatal(message: string, error?: Error, data?: Record<string, any>): void {
    this._log(LogLevel.FATAL, message, error, data);
  }

  /**
   * Forces an immediate flush of the log buffer.
   * This method is asynchronous and returns a Promise that resolves when flushing is complete.
   */
  public async flush(): Promise<void> {
    if (this._isFlushing || this._logBuffer.length === 0) {
      return; // Already flushing or nothing to send
    }

    this._isFlushing = true;
    const logsToSend = [...this._logBuffer]; // Take a snapshot of the current buffer
    this._logBuffer = []; // Clear the buffer immediately

    try {
      await this._sendLogs(logsToSend);
      // If successful, logs are cleared.
    } catch (err) {
      // If sending fails after retries, re-add logs to the buffer for a future attempt.
      // This might lead to duplicate logs if the server processed them but failed to respond.
      // For mission-critical logging, a persistent queue (e.g., local storage) might be needed.
      console.error('RemoteLogger: Failed to send logs after retries. Re-adding to buffer.', err);
      this._logBuffer.unshift(...logsToSend); // Add failed logs back to the front of the buffer
    } finally {
      this._isFlushing = false;
    }
  }

  /**
   * Sends a batch of logs to the remote endpoint with retry logic.
   * @param logs The array of log entries to send.
   * @private
   */
  private async _sendLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    for (let attempt = 0; attempt <= this._config.maxRetries; attempt++) {
      try {
        const response = await this._axiosInstance.post('/', logs); // Send to base URL
        if (response.status >= 200 && response.status < 300) {
          // console.log(`RemoteLogger: Successfully sent ${logs.length} logs.`);
          return; // Success
        } else {
          console.warn(`RemoteLogger: API returned status ${response.status} on attempt ${attempt + 1}.`);
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error(
            `RemoteLogger: API Error ${axiosError.response.status} on attempt ${attempt + 1}:`,
            axiosError.response.data
          );
          // For 4xx errors (e.g., 401, 403, 400), don't retry as it's likely a persistent client error.
          if (axiosError.response.status >= 400 && axiosError.response.status < 500) {
            if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                console.error('RemoteLogger: Authentication/Authorization failed. Check API Key and Project ID.');
            }
            throw new Error(`RemoteLogger: Non-retryable API error: ${axiosError.response.status}`);
          }
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error(`RemoteLogger: Network Error on attempt ${attempt + 1}: No response from server.`);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error(`RemoteLogger: Request setup error on attempt ${attempt + 1}:`, axiosError.message);
          throw new Error(`RemoteLogger: Non-retryable request error: ${axiosError.message}`);
        }
      }

      if (attempt < this._config.maxRetries) {
        const retryDelay = getExponentialBackoffDelay(attempt, this._config.retryDelayMs);
        console.warn(`RemoteLogger: Retrying in ${retryDelay}ms... (Attempt ${attempt + 1} of ${this._config.maxRetries})`);
        await delay(retryDelay);
      }
    }
    throw new Error(`RemoteLogger: Failed to send logs after ${this._config.maxRetries} retries.`);
  }

  /**
   * Shuts down the logger, clearing the flush timer and attempting to send any remaining logs.
   * This should be called before your application exits to ensure all logs are sent.
   */
  public async shutdown(): Promise<void> {
    this._isShuttingDown = true;
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
    console.log('RemoteLogger: Shutting down. Flushing remaining logs...');
    await this.flush(); // Attempt to send any remaining logs
    console.log('RemoteLogger: Shutdown complete.');
  }
}
