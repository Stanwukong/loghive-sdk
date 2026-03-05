// src/logger.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { LoggerConfig, LogEntry, LogLevel } from './types';
import { delay, getExponentialBackoffDelay, shouldLog, extractErrorDetails, isInBrowser } from './utils';
import { AutoInstrumentation } from './auto-instrumentation';
import { DataSanitizer, SanitizationConfig, createDataSanitizer } from './data-sanitizer';
import { OfflineManager } from './offline-manager';
import { RemoteConfigManager, RemoteSDKConfig } from './remote-config';
import { TraceContextManager, TraceContext } from './tracing/trace-context';
import { Span } from './tracing/span';

export class Monita {
  private static readonly MAX_BUFFER_SIZE = 1000;

  private _config: Required<LoggerConfig>;
  private _logBuffer: LogEntry[] = [];
  private _context: Record<string, any> = {};
  private _flushTimer: ReturnType<typeof setInterval> | null = null;
  private _isFlushing: boolean = false;
  private _isShuttingDown: boolean = false;
  private _initialized: boolean = false;
  private _axiosInstance: AxiosInstance;
  private _autoInstrumentation: AutoInstrumentation;
  private _dataSanitizer: DataSanitizer;
  private _beforeUnloadHandler: (() => void) | null = null;
  private _offlineManager: OfflineManager | null = null;
  private _remoteConfigManager: RemoteConfigManager | null = null;
  private _traceContextManager: TraceContextManager | null = null;

  constructor(config: LoggerConfig) {
    // Apply default values to the configuration
    this._config = {
      endpoint: 'https://loghive-server.vercel.app/api/v1',
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
      // Merge sanitization with defaults
      sanitization: {
        enabled: true,
        ...(config.sanitization || {}),
      },
      // Phase 2 defaults
      release: config.release || '',
      offline: config.offline || {},
      remoteConfig: config.remoteConfig || {},
      tracing: {
        enabled: false,
        autoTraceNetworkRequests: false,
        ...(config.tracing || {}),
      },
    } as Required<LoggerConfig>;

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

    // Initialize data sanitizer
    const sanitizationConfig = config.sanitization?.config || {};
    this._dataSanitizer = createDataSanitizer(sanitizationConfig);

    this.init();
  }

  public isInitialized(): boolean {
    return this._initialized;
  }

  public init(): void {
    if (this._initialized) {
      console.warn('Monita: Already initialized. Call shutdown() first to re-initialize.');
      return;
    }

    this._initialized = true;

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

      // Add beforeunload handler to flush logs (store reference for cleanup)
      this._beforeUnloadHandler = () => {
        this.flush();
      };
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
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

    // --- Phase 2: Offline Support ---
    if (this._config.offline) {
      this._offlineManager = new OfflineManager(this._config.offline);
      this._offlineManager.setFlushCallback(async (logs) => {
        await this._sendLogs(logs);
      });
    }

    // --- Phase 2: Distributed Tracing ---
    if (this._config.tracing?.enabled) {
      this._traceContextManager = new TraceContextManager();
    }

    // --- Phase 2: Remote Configuration ---
    if (this._config.remoteConfig?.enabled) {
      this._remoteConfigManager = new RemoteConfigManager(
        this._config.projectId,
        this._config.apiKey,
        this._config.endpoint,
        this._config.remoteConfig,
      );
      this._remoteConfigManager.setApplyCallback((config) => {
        this._applyRemoteConfig(config);
      });
      this._remoteConfigManager.startPeriodicRefresh();
    }
  }

  public setContext(context: Record<string, any>): void {
    this._context = { ...this._context, ...context };
  }

  public getContext(): Record<string, any> {
    return { ...this._context }
  }

  public clearContext(): void {
    this._context = {};
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

    // Attach release version if configured
    if (this._config.release) {
      logEntry.release = this._config.release;
    }

    // Attach trace context if tracing is active
    if (this._traceContextManager) {
      const trace = this._traceContextManager.getCurrentTrace();
      if (trace) {
        logEntry.traceId = trace.traceId;
        logEntry.spanId = trace.spanId;
      }
    }

    // Add browser-specific fields if available
    if (isInBrowser()) {
      logEntry.userAgent = navigator.userAgent;
      logEntry.url = window.location.href;
      logEntry.referrer = document.referrer;
    }

    // Apply data sanitization if enabled
    const sanitizedEntry = this._config.sanitization?.enabled !== false
      ? this._dataSanitizer.sanitizeLogEntry(logEntry)
      : logEntry;

    // Route to offline queue when offline
    if (this._offlineManager && !this._offlineManager.isOnline()) {
      this._offlineManager.enqueue(sanitizedEntry);
      return;
    }

    this._logBuffer.push(sanitizedEntry);

    // Prevent unbounded buffer growth
    if (this._logBuffer.length > Monita.MAX_BUFFER_SIZE) {
      const dropped = this._logBuffer.length - Monita.MAX_BUFFER_SIZE;
      this._logBuffer = this._logBuffer.slice(-Monita.MAX_BUFFER_SIZE);
      console.warn(`Monita: Dropped ${dropped} oldest logs due to buffer overflow.`);
    }

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
    const previousContext = { ...this._context };
    if (context) {
      this._context = { ...this._context, ...context };
    }
    this._log(LogLevel.ERROR, 'Exception captured', error, {
      eventType: 'error',
    });
    if (context) {
      this._context = previousContext;
    }
  }

  public captureMessage(message: string, level: LogLevel = LogLevel.INFO, context?: Record<string, any>): void {
    const previousContext = { ...this._context };
    if (context) {
      this._context = { ...this._context, ...context };
    }
    this._log(level, message, undefined, {
      eventType: 'message',
    });
    if (context) {
      this._context = previousContext;
    }
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
      // Prevent unbounded buffer growth
      if (this._logBuffer.length > Monita.MAX_BUFFER_SIZE) {
        const dropped = this._logBuffer.length - Monita.MAX_BUFFER_SIZE;
        this._logBuffer = this._logBuffer.slice(0, Monita.MAX_BUFFER_SIZE);
        console.warn(`Monita: Dropped ${dropped} oldest logs due to buffer overflow.`);
      }
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
      // Silent in production — only log in debug mode
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
            `Monita: API Error ${axiosError.response.config.url} on attempt ${attempt + 1}`);
          
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

  // Data sanitization methods
  public getSanitizationConfig(): import('./data-sanitizer').SanitizationConfig {
    return this._dataSanitizer.getConfig();
  }

  public updateSanitizationConfig(config: Partial<import('./data-sanitizer').SanitizationConfig>): void {
    this._dataSanitizer.updateConfig(config);
  }

  public getAuditTrail(): import('./data-sanitizer').AuditEntry[] {
    return this._dataSanitizer.getAuditTrail();
  }

  public clearAuditTrail(): void {
    this._dataSanitizer.clearAuditTrail();
  }

  public cleanupExpiredData(): number {
    return this._dataSanitizer.cleanupExpiredData();
  }

  public addCustomSanitizationRule(rule: import('./data-sanitizer').SanitizationRule): void {
    this._dataSanitizer.addCustomRule(rule);
  }

  public removeCustomSanitizationRule(description: string): boolean {
    return this._dataSanitizer.removeCustomRule(description);
  }

  // --- Distributed Tracing API ---

  public startTrace(name: string): TraceContext | null {
    if (!this._traceContextManager) {
      return null;
    }
    return this._traceContextManager.startTrace(name);
  }

  public endTrace(): void {
    this._traceContextManager?.endTrace();
  }

  public getCurrentTrace(): TraceContext | null {
    return this._traceContextManager?.getCurrentTrace() ?? null;
  }

  public createChildSpan(name: string): Span | null {
    if (!this._traceContextManager) {
      return null;
    }
    return this._traceContextManager.createChildSpan(name);
  }

  // --- Remote Configuration ---

  private _applyRemoteConfig(config: RemoteSDKConfig): void {
    if (config.minLogLevel) {
      this._config.minLogLevel = config.minLogLevel;
    }
    if (config.batchSize !== undefined) {
      this._config.batchSize = config.batchSize;
    }
    if (config.flushIntervalMs !== undefined) {
      this._config.flushIntervalMs = config.flushIntervalMs;
      // Restart flush timer with new interval
      if (this._flushTimer) {
        clearInterval(this._flushTimer);
        this._flushTimer = setInterval(() => {
          this.flush();
        }, this._config.flushIntervalMs);
      }
    }
    if (config.autoCapture) {
      this._config.autoCapture = { ...this._config.autoCapture, ...config.autoCapture };
    }
  }

  public async shutdown(): Promise<void> {
    this._isShuttingDown = true;

    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }

    // Cleanup data sanitizer
    this.cleanupExpiredData();

    // Cleanup auto-instrumentation
    this._autoInstrumentation.destroy();

    // Cleanup Phase 2 managers
    if (this._offlineManager) {
      this._offlineManager.destroy();
      this._offlineManager = null;
    }
    if (this._remoteConfigManager) {
      this._remoteConfigManager.destroy();
      this._remoteConfigManager = null;
    }
    if (this._traceContextManager) {
      this._traceContextManager.endTrace();
      this._traceContextManager = null;
    }

    // Remove beforeunload handler
    if (isInBrowser() && this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
      this._beforeUnloadHandler = null;
    }

    console.log('Monita: Shutting down. Flushing remaining logs...');
    await this.flush();
    console.log('Monita: Shutdown complete.');

    this._initialized = false;
    this._isShuttingDown = false;
  }
}