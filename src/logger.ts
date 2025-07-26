// src/logger.ts - Fixed to match your exact backend routes
import axios, { AxiosInstance, AxiosError } from 'axios';
import { LoggerConfig, LogEntry, LogLevel } from './types';
import { delay, getExponentialBackoffDelay, shouldLog, extractErrorDetails } from './utils';

export class RemoteLogger {
  private _config: Required<LoggerConfig>;
  private _logBuffer: LogEntry[] = [];
  private _context: Record<string, any> = {};
  private _flushTimer: ReturnType<typeof setInterval> | null = null;
  private _isFlushing: boolean = false;
  private _isShuttingDown: boolean = false;
  private _axiosInstance: AxiosInstance;

  constructor(config: LoggerConfig) {
    // Apply default values to the configuration
    this._config = {
      endpoint: 'http://localhost:3000/api/v1', // Your base API URL
      minLogLevel: LogLevel.INFO,
      batchSize: 10,
      flushIntervalMs: 5000,
      maxRetries: 3,
      retryDelayMs: 1000,
      environment: 'development',
      serviceName: 'unknown-service',
      serviceVersion: '1.0.0',
      ...config,
    };

    // Validate required configuration
    if (!this._config.apiKey) {
      throw new Error('RemoteLogger: API Key is required.');
    }
    if (!this._config.projectId) {
      throw new Error('RemoteLogger: Project ID is required.');
    }

    // Create Axios instance
    this._axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this._config.apiKey,
      },
    });

    this.init();
  }

  public init(): void {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
    }
    this._flushTimer = setInterval(() => {
      this.flush();
    }, this._config.flushIntervalMs);
  }

  public setContext(context: Record<string, any>): void {
    this._context = { ...this._context, ...context };
  }

  private _log(level: LogLevel, message: string, error?: Error, data?: Record<string, any>): void {
    if (this._isShuttingDown) {
      console.warn(`RemoteLogger: Attempted to log "${message}" during shutdown. Log ignored.`);
      return;
    }

    if (!shouldLog(level, this._config.minLogLevel)) {
      return;
    }

    const logEntry: LogEntry = {
      projectId: this._config.projectId, // Add projectId to the log entry
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data,
      error: error ? extractErrorDetails(error) : undefined,
      service: this._config.serviceName,
      environment: this._config.environment,
      context: { ...this._context },
    };

    this._logBuffer.push(logEntry);

    if (this._logBuffer.length >= this._config.batchSize) {
      this.flush();
    }
  }

  public trace(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.TRACE, message, undefined, data);
  }

  public debug(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.DEBUG, message, undefined, data);
  }

  public info(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.INFO, message, undefined, data);
  }

  public warn(message: string, data?: Record<string, any>): void {
    this._log(LogLevel.WARN, message, undefined, data);
  }

  public error(message: string, error?: Error, data?: Record<string, any>): void {
    this._log(LogLevel.ERROR, message, error, data);
  }

  public fatal(message: string, error?: Error, data?: Record<string, any>): void {
    this._log(LogLevel.FATAL, message, error, data);
  }

  public async flush(): Promise<void> {
    if (this._isFlushing || this._logBuffer.length === 0) {
      return;
    }

    this._isFlushing = true;
    const logsToSend = [...this._logBuffer];
    this._logBuffer = [];

    try {
      await this._sendLogs(logsToSend);
    } catch (err) {
      console.error('RemoteLogger: Failed to send logs after retries. Re-adding to buffer.', err);
      this._logBuffer.unshift(...logsToSend);
    } finally {
      this._isFlushing = false;
    }
  }

  private async _sendLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    // Send logs individually since server expects single log objects, not arrays
    const sendPromises = logs.map(log => this._sendSingleLog(log));
    
    try {
      await Promise.all(sendPromises);
      console.log(`RemoteLogger: Successfully sent ${logs.length} logs.`);
    } catch (error) {
      // If any log fails, the error will be thrown here
      throw error;
    }
  }

  private async _sendSingleLog(log: LogEntry): Promise<void> {
    for (let attempt = 0; attempt <= this._config.maxRetries; attempt++) {
      try {
        // Construct the full URL: /api/v1/:projectId/logs
        const fullUrl = `${this._config.endpoint}/${this._config.projectId}/logs`;
        console.log(`RemoteLogger: Sending log to ${fullUrl}`); // Debug log
        
        const response = await this._axiosInstance.post(fullUrl, log);
        
        if (response.status >= 200 && response.status < 300) {
          return; // Success
        } else {
          console.warn(`RemoteLogger: API returned status ${response.status} on attempt ${attempt + 1}.`);
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
          console.error(
            `RemoteLogger: API Error ${axiosError.response.status} on attempt ${attempt + 1}:`,
            axiosError.response.data
          );
          console.error(`RemoteLogger: Attempted URL: ${axiosError.config?.url}`); // Debug info
          
          // Don't retry 4xx errors
          if (axiosError.response.status >= 400 && axiosError.response.status < 500) {
            if (axiosError.response.status === 401 || axiosError.response.status === 403) {
              console.error('RemoteLogger: Authentication/Authorization failed. Check API Key.');
            }
            throw new Error(`RemoteLogger: Non-retryable API error: ${axiosError.response.status}`);
          }
        } else if (axiosError.request) {
          console.error(`RemoteLogger: Network Error on attempt ${attempt + 1}: No response from server.`);
        } else {
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
    
    throw new Error(`RemoteLogger: Failed to send log after ${this._config.maxRetries} retries.`);
  }

  public async shutdown(): Promise<void> {
    this._isShuttingDown = true;
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
    console.log('RemoteLogger: Shutting down. Flushing remaining logs...');
    await this.flush();
    console.log('RemoteLogger: Shutdown complete.');
  }
}