// src/logger.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { LoggerConfig, LogEntry, LogLevel } from './types';
import { delay, getExponentialBackoffDelay, shouldLog, extractErrorDetails, isInBrowser } from './utils';
import { AutoInstrumentation } from './auto-instrumentation';

export class Monita {
  private _config: Required<LoggerConfig>;
  private _logBuffer: LogEntry[] = [];
  private _context: Record<string, any> = {};
  private _flushTimer: ReturnType<typeof setInterval> | null = null;
  private _isFlushing: boolean = false;
  private _isShuttingDown: boolean = false;
  private _axiosInstance: AxiosInstance;
  private _autoInstrumentation: AutoInstrumentation;

  constructor(config: LoggerConfig) {
    // Apply default values to the configuration
    this._config = {
      endpoint: 'http://localhost:5000/api/v1',
      minLogLevel: LogLevel.INFO,
      batchSize: 10,
      flushIntervalMs: 5000,
      maxRetries: 3,
      retryDelayMs: 1000,
      environment: 'development',
      serviceName: 'unknown-service',
      serviceVersion: '1.0.0',
      ...config,
      // Merge autoCapture with defaults
      autoCapture: {
        errors: true,
        performance: true,
        userInteractions: false,
        networkRequests: true,
        consoleMessages: false,
        pageViews: true,
        ...(config.autoCapture || {}),
      },
    };

    // Validate required configuration
    if (!this._config.apiKey) {
      throw new Error('Monita: API Key is required.');
    }
    if (!this._config.projectId) {
      throw new Error('Monita: Project ID is required.');
    }

    // Axios instance creation with error handling
    try {
      if (typeof axios === 'undefined') {
        throw new Error('Axios is not available in this environment')
      }

      // Create Axios instance
    this._axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this._config.apiKey,
      },
    });
    } catch (error) {
      console.error('Monita: Failed to create HTTP client:', error)
      throw new Error('Axios is not available in this environment')
    } 

    

    // Initialize auto-instrumentation
    this._autoInstrumentation = new AutoInstrumentation(this);

    this.init();
  }

  public init(): void {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
    }
    
    this._flushTimer = setInterval(() => {
      this.flush();
    }, this._config.flushIntervalMs);

    // Initialize auto-instrumentation if in browser
    if (isInBrowser()) {
      this._autoInstrumentation.init(this._config.autoCapture);
      
      // Add browser context
      this.setContext({
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      });

      // Add beforeunload handler to flush logs
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    } else {
      // Add Node.js context
      this.setContext({
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });

      // Add process exit handlers
      process.on('exit', () => {
        this.flush();
      });

      process.on('SIGINT', async () => {
        await this.shutdown();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await this.shutdown();
        process.exit(0);
      });
    }
  }

  public setContext(context: Record<string, any>): void {
    this._context = { ...this._context, ...context };
  }

  public getContext(): Record<string, any> {
    return { ...this._context }
  }

  public _log(level: LogLevel, message: string, error?: Error, data?: Record<string, any>): void {
    if (this._isShuttingDown) {
      console.warn(`Monita: Attempted to log "${message}" during shutdown. Log ignored.`);
      return;
    }

    if (!shouldLog(level, this._config.minLogLevel)) {
      return;
    }

    const logEntry: LogEntry = {
      projectId: this._config.projectId,
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data,
      error: error ? extractErrorDetails(error) : undefined,
      service: this._config.serviceName,
      environment: this._config.environment,
      context: { ...this._context },
    };

    // Add browser-specific fields if available
    if (isInBrowser()) {
      logEntry.userAgent = navigator.userAgent;
      logEntry.url = window.location.href;
      logEntry.referrer = document.referrer;
    }

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

  // Enhanced methods for specific event types
  public captureException(error: Error, context?: Record<string, any>): void {
    this._log(LogLevel.ERROR, 'Exception captured', error, {
      eventType: 'error',
      ...context,
    });
  }

  public captureMessage(message: string, level: LogLevel = LogLevel.INFO, context?: Record<string, any>): void {
    this._log(level, message, undefined, {
      eventType: 'message',
      ...context,
    });
  }

  public addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
    this._log(LogLevel.DEBUG, message, undefined, {
      eventType: 'breadcrumb',
      category,
      ...data,
    });
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
      console.error('Monita: Failed to send logs after retries. Re-adding to buffer.', err);
      this._logBuffer.unshift(...logsToSend);
    } finally {
      this._isFlushing = false;
    }
  }

  private async _sendLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    const sendPromises = logs.map(log => this._sendSingleLog(log));
    
    try {
      await Promise.all(sendPromises);
      console.log(`Monita: Successfully sent ${logs.length} logs.`);
    } catch (error) {
      throw error;
    }
  }

  private async _sendSingleLog(log: LogEntry): Promise<void> {
    for (let attempt = 0; attempt <= this._config.maxRetries; attempt++) {
      try {
        const fullUrl = `${this._config.endpoint}/${this._config.projectId}/logs`;
        
        const response = await this._axiosInstance.post(fullUrl, log);
        
        if (response.status >= 200 && response.status < 300) {
          return;
        } else {
          console.warn(`Monita: API returned status ${response.status} on attempt ${attempt + 1}.`);
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
          console.error(
            `Monita: API Error ${axiosError.response.status} on attempt ${attempt + 1}`);
          
          if (axiosError.response.status >= 400 && axiosError.response.status < 500) {
            if (axiosError.response.status === 401 || axiosError.response.status === 403) {
              console.error('Monita: Authentication/Authorization failed. Check API Key.');
            }
            throw new Error(`Monita: Non-retryable API error: ${axiosError.response.status}`);
          }
        } else if (axiosError.request) {
          console.error(`Monita: Network Error on attempt ${attempt + 1}: No response from server.`);
        } else {
          console.error(`Monita: Request setup error on attempt ${attempt + 1}:`, axiosError.message);
          throw new Error(`Monita: Non-retryable request error: ${axiosError.message}`);
        }
      }

      if (attempt < this._config.maxRetries) {
        const retryDelay = getExponentialBackoffDelay(attempt, this._config.retryDelayMs);
        console.warn(`Monita: Retrying in ${retryDelay}ms... (Attempt ${attempt + 1} of ${this._config.maxRetries})`);
        await delay(retryDelay);
      }
    }
    
    throw new Error(`Monita: Failed to send log after ${this._config.maxRetries} retries.`);
  }

  public async shutdown(): Promise<void> {
    this._isShuttingDown = true;
    
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }

    // Cleanup auto-instrumentation
    this._autoInstrumentation.destroy();
    
    console.log('Monita: Shutting down. Flushing remaining logs...');
    await this.flush();
    console.log('Monita: Shutdown complete.');
  }
}