// src/logger.ts
import axios, { AxiosInstance, AxiosError } from "axios";
import { LoggerConfig, LogEntry, LogLevel } from "./types";
import {
  delay,
  getExponentialBackoffDelay,
  shouldLog,
  extractErrorDetails,
  isInBrowser,
} from "./utils";
import { AutoInstrumentation } from "./auto-instrumentation";
import {
  DataSanitizer,
  SanitizationConfig,
  createDataSanitizer,
} from "./data-sanitizer";
import { ConfigFetcher, RemoteConfig } from "./config-fetcher";

export class Monita {
  private _config: Required<LoggerConfig>;
  private _logBuffer: LogEntry[] = [];
  private _context: Record<string, any> = {};
  private _flushTimer: ReturnType<typeof setInterval> | null = null;
  private _isFlushing: boolean = false;
  private _isShuttingDown: boolean = false;
  private _axiosInstance: AxiosInstance;
  private _autoInstrumentation: AutoInstrumentation;
  private _dataSanitizer: DataSanitizer;
  private _configFetcher?: ConfigFetcher;
  private _configRefreshTimer?: ReturnType<typeof setInterval>;

  constructor(config: LoggerConfig) {
    // Apply default values to the configuration
    this._config = {
      endpoint: "https://loghive-server.vercel.app/api/v1",
      minLogLevel: LogLevel.INFO,
      batchSize: 10,
      flushIntervalMs: 5000,
      maxRetries: 3,
      retryDelayMs: 1000,
      enableRemoteConfig: false,
      configRefreshIntervalMs: 5 * 60 * 1000, // 5 minutes
      environment: "development",
      serviceName: "unknown-service",
      serviceVersion: "1.0.0",
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
    } as Required<LoggerConfig>;

    // Validate required configuration
    if (!this._config.apiKey) {
      throw new Error("Monita: API Key is required.");
    }
    if (!this._config.projectId) {
      throw new Error("Monita: Project ID is required.");
    }

    // Axios instance creation with error handling
    try {
      if (typeof axios === "undefined") {
        throw new Error("Axios is not available in this environment");
      }

      // Create Axios instance
      this._axiosInstance = axios.create({
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this._config.apiKey,
        },
      });
    } catch (error) {
      console.error("Monita: Failed to create HTTP client:", error);
      throw new Error("Axios is not available in this environment");
    }

    // Initialize auto-instrumentation
    this._autoInstrumentation = new AutoInstrumentation(this);

    // Initialize data sanitizer
    const sanitizationConfig = config.sanitization?.config || {};
    this._dataSanitizer = createDataSanitizer(sanitizationConfig);

    // Initialize remote config fetcher if enabled
    if (this._config.enableRemoteConfig) {
      this._configFetcher = new ConfigFetcher(
        this._config.endpoint,
        this._config.apiKey,
        this._config.projectId
      );
    }

    this.init();
  }

  public async init(): Promise<void> {
    // Fetch remote config first if enabled (before setting up timers)
    if (this._config.enableRemoteConfig && this._configFetcher) {
      await this.initRemoteConfig();
    }

    // Set up log flush timer
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
      window.addEventListener("beforeunload", () => {
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
      process.on("exit", () => {
        this.flush();
      });

      process.on("SIGINT", async () => {
        await this.shutdown();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await this.shutdown();
        process.exit(0);
      });
    }
  }

  /**
   * Initialize remote configuration system
   * Fetches initial config and sets up periodic refresh
   */
  private async initRemoteConfig(): Promise<void> {
    if (!this._configFetcher) return;

    try {
      // Fetch initial remote config
      await this.refreshRemoteConfig();

      // Set up periodic config refresh
      this._configRefreshTimer = setInterval(
        () => this.refreshRemoteConfig(),
        this._config.configRefreshIntervalMs
      );
    } catch (error) {
      console.warn("Monita: Failed to initialize remote config:", error);
      // Continue with local config on failure
    }
  }

  /**
   * Fetch and apply remote configuration
   * This is called periodically to keep config in sync with platform
   */
  private async refreshRemoteConfig(): Promise<void> {
    if (!this._configFetcher) return;

    try {
      const remoteConfig = await this._configFetcher.fetch();
      this.applyRemoteConfig(remoteConfig);
    } catch (error) {
      console.warn("Monita: Failed to refresh remote config:", error);
      // Continue with current config on failure
    }
  }

  /**
   * Apply remote configuration updates
   * Remote settings override local settings but preserve local fallbacks
   */
  private applyRemoteConfig(remote: RemoteConfig): void {
    // Update log level if specified
    if (remote.minLogLevel) {
      this._config.minLogLevel = remote.minLogLevel as LogLevel;
    }

    // Update batch size if specified
    if (remote.batchSize !== undefined) {
      this._config.batchSize = remote.batchSize;
    }

    // Update flush interval and restart timer if changed
    if (remote.flushIntervalMs !== undefined) {
      const previousInterval = this._config.flushIntervalMs;
      this._config.flushIntervalMs = remote.flushIntervalMs;

      // Restart flush timer with new interval if it changed
      if (previousInterval !== remote.flushIntervalMs && this._flushTimer) {
        clearInterval(this._flushTimer);
        this._flushTimer = setInterval(() => {
          this.flush();
        }, remote.flushIntervalMs);
      }
    }

    // Update auto-capture settings if specified
    if (remote.autoCapture) {
      const previousAutoCapture = { ...this._config.autoCapture };
      Object.assign(this._config.autoCapture, remote.autoCapture);

      // Reinitialize auto-instrumentation if settings changed
      const hasChanged = Object.keys(remote.autoCapture).some(
        (key) =>
          previousAutoCapture[key as keyof typeof previousAutoCapture] !==
          remote.autoCapture![key as keyof typeof remote.autoCapture]
      );

      if (hasChanged && isInBrowser()) {
        this._autoInstrumentation.destroy();
        this._autoInstrumentation = new AutoInstrumentation(this);
        this._autoInstrumentation.init(this._config.autoCapture);
      }
    }

    // Update sanitization settings if specified
    if (remote.sanitization) {
      Object.assign(this._config.sanitization, remote.sanitization);

      // Build complete sanitization config from platform settings
      const sanitizationUpdate: Partial<SanitizationConfig> = {};

      // Apply strictMode preset as base
      if (remote.sanitization.strictMode) {
        const presetConfig = this.getBuiltInSanitizationPreset(
          remote.sanitization.strictMode
        );
        if (presetConfig) {
          Object.assign(sanitizationUpdate, presetConfig);
        }
      }

      // Override with platform-specific config
      if (remote.sanitization.presetConfig) {
        // Merge preset config, ensuring categories are always set for retention policy
        Object.assign(sanitizationUpdate, remote.sanitization.presetConfig);
        if (sanitizationUpdate.retentionPolicy) {
          (sanitizationUpdate.retentionPolicy as any).categories = [
            "pii",
            "financial",
            "authentication",
          ];
        }
      }

      // Apply custom rules from platform
      if (remote.sanitization.customRules) {
        sanitizationUpdate.customRules = remote.sanitization.customRules.map(
          (rule) => ({
            pattern: new RegExp(rule.pattern, "g"),
            replacement: rule.replacement,
            description: rule.description,
            severity: rule.severity as any,
            category: rule.category as any,
          })
        );
      }

      // Apply all updates to data sanitizer
      if (Object.keys(sanitizationUpdate).length > 0) {
        this._dataSanitizer.updateConfig(sanitizationUpdate);
      }
    }
  }

  /**
   * Get built-in sanitization preset configuration
   * These are the baseline presets, platform can override specific settings
   */
  private getBuiltInSanitizationPreset(
    mode: "STRICT" | "BALANCED" | "LENIENT"
  ): Partial<SanitizationConfig> {
    const presets = {
      STRICT: {
        auditEnabled: true,
        anonymizationEnabled: true,
        sensitiveFields: [
          "password",
          "secret",
          "token",
          "key",
          "ssn",
          "email",
          "phone",
          "address",
        ],
        retentionPolicy: {
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          maxSize: 50 * 1024 * 1024, // 50MB
          autoDelete: true,
          archiveBeforeDelete: true,
          categories: ["pii", "financial", "authentication"],
        },
      },
      BALANCED: {
        auditEnabled: true,
        anonymizationEnabled: true,
        sensitiveFields: ["password", "secret", "token", "key", "ssn", "email"],
        retentionPolicy: {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          maxSize: 100 * 1024 * 1024, // 100MB
          autoDelete: true,
          archiveBeforeDelete: true,
          categories: ["pii", "financial", "authentication"],
        },
      },
      LENIENT: {
        auditEnabled: false,
        anonymizationEnabled: false,
        sensitiveFields: ["password", "secret"],
        retentionPolicy: {
          maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
          maxSize: 500 * 1024 * 1024, // 500MB
          autoDelete: false,
          archiveBeforeDelete: false,
          categories: ["pii", "financial"],
        },
      },
    };

    return presets[mode] || presets.BALANCED;
  }

  /**
   * Get sanitization preset configuration based on strictness level
   */
  private getSanitizationPreset(
    mode: "STRICT" | "BALANCED" | "LENIENT"
  ): Partial<SanitizationConfig> | null {
    // Import SANITIZATION_PRESETS if available
    try {
      const { SANITIZATION_PRESETS } = require("./data-sanitizer");
      return SANITIZATION_PRESETS[mode] || null;
    } catch {
      return null;
    }
  }

  public setContext(context: Record<string, any>): void {
    this._context = { ...this._context, ...context };
  }

  public getContext(): Record<string, any> {
    return { ...this._context };
  }

  public _log(
    level: LogLevel,
    message: string,
    error?: Error,
    data?: Record<string, any>
  ): void {
    if (this._isShuttingDown) {
      console.warn(
        `Monita: Attempted to log "${message}" during shutdown. Log ignored.`
      );
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

    // Apply data sanitization if enabled
    const sanitizedEntry =
      this._config.sanitization?.enabled !== false
        ? this._dataSanitizer.sanitizeLogEntry(logEntry)
        : logEntry;

    this._logBuffer.push(sanitizedEntry);

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

  public error(
    message: string,
    error?: Error,
    data?: Record<string, any>
  ): void {
    this._log(LogLevel.ERROR, message, error, data);
  }

  public fatal(
    message: string,
    error?: Error,
    data?: Record<string, any>
  ): void {
    this._log(LogLevel.FATAL, message, error, data);
  }

  // Enhanced methods for specific event types
  public captureException(error: Error, context?: Record<string, any>): void {
    this._log(LogLevel.ERROR, "Exception captured", error, {
      eventType: "error",
      ...context,
    });
  }

  public captureMessage(
    message: string,
    level: LogLevel = LogLevel.INFO,
    context?: Record<string, any>
  ): void {
    this._log(level, message, undefined, {
      eventType: "message",
      ...context,
    });
  }

  public addBreadcrumb(
    message: string,
    category?: string,
    data?: Record<string, any>
  ): void {
    this._log(LogLevel.DEBUG, message, undefined, {
      eventType: "breadcrumb",
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
      console.error(
        "Monita: Failed to send logs after retries. Re-adding to buffer.",
        err
      );
      this._logBuffer.unshift(...logsToSend);
    } finally {
      this._isFlushing = false;
    }
  }

  private async _sendLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    const sendPromises = logs.map((log) => this._sendSingleLog(log));

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
          console.warn(
            `Monita: API returned status ${response.status} on attempt ${
              attempt + 1
            }.`
          );
        }
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          console.error(
            `Monita: API Error ${axiosError.response.config.url} on attempt ${
              attempt + 1
            }`
          );

          if (
            axiosError.response.status >= 400 &&
            axiosError.response.status < 500
          ) {
            if (
              axiosError.response.status === 401 ||
              axiosError.response.status === 403
            ) {
              console.error(
                "Monita: Authentication/Authorization failed. Check API Key."
              );
            }
            throw new Error(
              `Monita: Non-retryable API error: ${axiosError.response.status}`
            );
          }
        } else if (axiosError.request) {
          console.error(
            `Monita: Network Error on attempt ${
              attempt + 1
            }: No response from server.`
          );
        } else {
          console.error(
            `Monita: Request setup error on attempt ${attempt + 1}:`,
            axiosError.message
          );
          throw new Error(
            `Monita: Non-retryable request error: ${axiosError.message}`
          );
        }
      }

      if (attempt < this._config.maxRetries) {
        const retryDelay = getExponentialBackoffDelay(
          attempt,
          this._config.retryDelayMs
        );
        console.warn(
          `Monita: Retrying in ${retryDelay}ms... (Attempt ${attempt + 1} of ${
            this._config.maxRetries
          })`
        );
        await delay(retryDelay);
      }
    }

    throw new Error(
      `Monita: Failed to send log after ${this._config.maxRetries} retries.`
    );
  }

  // Data sanitization methods
  public getSanitizationConfig(): import("./data-sanitizer").SanitizationConfig {
    return this._dataSanitizer.getConfig();
  }

  public updateSanitizationConfig(
    config: Partial<import("./data-sanitizer").SanitizationConfig>
  ): void {
    this._dataSanitizer.updateConfig(config);
  }

  public getAuditTrail(): import("./data-sanitizer").AuditEntry[] {
    return this._dataSanitizer.getAuditTrail();
  }

  public clearAuditTrail(): void {
    this._dataSanitizer.clearAuditTrail();
  }

  public cleanupExpiredData(): number {
    return this._dataSanitizer.cleanupExpiredData();
  }

  public addCustomSanitizationRule(
    rule: import("./data-sanitizer").SanitizationRule
  ): void {
    this._dataSanitizer.addCustomRule(rule);
  }

  public removeCustomSanitizationRule(description: string): boolean {
    return this._dataSanitizer.removeCustomRule(description);
  }

  // Remote configuration methods
  /**
   * Manually trigger a remote config refresh
   * Useful for forcing an immediate config update
   */
  public async refreshConfig(): Promise<void> {
    if (!this._config.enableRemoteConfig || !this._configFetcher) {
      console.warn("Monita: Remote config is not enabled");
      return;
    }

    await this.refreshRemoteConfig();
  }

  /**
   * Get current effective configuration (merged local + remote)
   */
  public getEffectiveConfig(): Required<LoggerConfig> {
    return { ...this._config };
  }

  public async shutdown(): Promise<void> {
    this._isShuttingDown = true;

    // Stop config refresh timer
    if (this._configRefreshTimer) {
      clearInterval(this._configRefreshTimer);
      this._configRefreshTimer = undefined;
    }

    // Stop flush timer
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }

    // Cleanup data sanitizer
    this.cleanupExpiredData();

    // Cleanup auto-instrumentation
    this._autoInstrumentation.destroy();

    console.log("Monita: Shutting down. Flushing remaining logs...");
    await this.flush();
    console.log("Monita: Shutdown complete.");
  }
}
