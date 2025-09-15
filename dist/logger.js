"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Monita = void 0;
// src/logger.ts
const axios_1 = __importDefault(require("axios"));
const types_1 = require("./types");
const utils_1 = require("./utils");
const auto_instrumentation_1 = require("./auto-instrumentation");
const data_sanitizer_1 = require("./data-sanitizer");
class Monita {
    constructor(config) {
        var _a;
        this._logBuffer = [];
        this._context = {};
        this._flushTimer = null;
        this._isFlushing = false;
        this._isShuttingDown = false;
        // Apply default values to the configuration
        this._config = {
            endpoint: 'https://loghive-server.vercel.app/api/v1',
            minLogLevel: types_1.LogLevel.INFO,
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
            if (typeof axios_1.default === 'undefined') {
                throw new Error('Axios is not available in this environment');
            }
            // Create Axios instance
            this._axiosInstance = axios_1.default.create({
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this._config.apiKey,
                },
            });
        }
        catch (error) {
            console.error('Monita: Failed to create HTTP client:', error);
            throw new Error('Axios is not available in this environment');
        }
        // Initialize auto-instrumentation
        this._autoInstrumentation = new auto_instrumentation_1.AutoInstrumentation(this);
        // Initialize data sanitizer
        const sanitizationConfig = ((_a = config.sanitization) === null || _a === void 0 ? void 0 : _a.config) || {};
        this._dataSanitizer = (0, data_sanitizer_1.createDataSanitizer)(sanitizationConfig);
        this.init();
    }
    init() {
        if (this._flushTimer) {
            clearInterval(this._flushTimer);
        }
        this._flushTimer = setInterval(() => {
            this.flush();
        }, this._config.flushIntervalMs);
        // Initialize auto-instrumentation if in browser
        if ((0, utils_1.isInBrowser)()) {
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
        }
        else {
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
    setContext(context) {
        this._context = { ...this._context, ...context };
    }
    getContext() {
        return { ...this._context };
    }
    _log(level, message, error, data) {
        var _a;
        if (this._isShuttingDown) {
            console.warn(`Monita: Attempted to log "${message}" during shutdown. Log ignored.`);
            return;
        }
        if (!(0, utils_1.shouldLog)(level, this._config.minLogLevel)) {
            return;
        }
        const logEntry = {
            projectId: this._config.projectId,
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data,
            error: error ? (0, utils_1.extractErrorDetails)(error) : undefined,
            service: this._config.serviceName,
            environment: this._config.environment,
            context: { ...this._context },
        };
        // Add browser-specific fields if available
        if ((0, utils_1.isInBrowser)()) {
            logEntry.userAgent = navigator.userAgent;
            logEntry.url = window.location.href;
            logEntry.referrer = document.referrer;
        }
        // Apply data sanitization if enabled
        const sanitizedEntry = ((_a = this._config.sanitization) === null || _a === void 0 ? void 0 : _a.enabled) !== false
            ? this._dataSanitizer.sanitizeLogEntry(logEntry)
            : logEntry;
        this._logBuffer.push(sanitizedEntry);
        if (this._logBuffer.length >= this._config.batchSize) {
            this.flush();
        }
    }
    trace(message, data) {
        this._log(types_1.LogLevel.TRACE, message, undefined, data);
    }
    debug(message, data) {
        this._log(types_1.LogLevel.DEBUG, message, undefined, data);
    }
    info(message, data) {
        this._log(types_1.LogLevel.INFO, message, undefined, data);
    }
    warn(message, data) {
        this._log(types_1.LogLevel.WARN, message, undefined, data);
    }
    error(message, error, data) {
        this._log(types_1.LogLevel.ERROR, message, error, data);
    }
    fatal(message, error, data) {
        this._log(types_1.LogLevel.FATAL, message, error, data);
    }
    // Enhanced methods for specific event types
    captureException(error, context) {
        this._log(types_1.LogLevel.ERROR, 'Exception captured', error, {
            eventType: 'error',
            ...context,
        });
    }
    captureMessage(message, level = types_1.LogLevel.INFO, context) {
        this._log(level, message, undefined, {
            eventType: 'message',
            ...context,
        });
    }
    addBreadcrumb(message, category, data) {
        this._log(types_1.LogLevel.DEBUG, message, undefined, {
            eventType: 'breadcrumb',
            category,
            ...data,
        });
    }
    async flush() {
        if (this._isFlushing || this._logBuffer.length === 0) {
            return;
        }
        this._isFlushing = true;
        const logsToSend = [...this._logBuffer];
        this._logBuffer = [];
        try {
            await this._sendLogs(logsToSend);
        }
        catch (err) {
            console.error('Monita: Failed to send logs after retries. Re-adding to buffer.', err);
            this._logBuffer.unshift(...logsToSend);
        }
        finally {
            this._isFlushing = false;
        }
    }
    async _sendLogs(logs) {
        if (logs.length === 0) {
            return;
        }
        const sendPromises = logs.map(log => this._sendSingleLog(log));
        try {
            await Promise.all(sendPromises);
            console.log(`Monita: Successfully sent ${logs.length} logs.`);
        }
        catch (error) {
            throw error;
        }
    }
    async _sendSingleLog(log) {
        for (let attempt = 0; attempt <= this._config.maxRetries; attempt++) {
            try {
                const fullUrl = `${this._config.endpoint}/${this._config.projectId}/logs`;
                const response = await this._axiosInstance.post(fullUrl, log);
                if (response.status >= 200 && response.status < 300) {
                    return;
                }
                else {
                    console.warn(`Monita: API returned status ${response.status} on attempt ${attempt + 1}.`);
                }
            }
            catch (error) {
                const axiosError = error;
                if (axiosError.response) {
                    console.error(`Monita: API Error ${axiosError.response.config.url} on attempt ${attempt + 1}`);
                    if (axiosError.response.status >= 400 && axiosError.response.status < 500) {
                        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                            console.error('Monita: Authentication/Authorization failed. Check API Key.');
                        }
                        throw new Error(`Monita: Non-retryable API error: ${axiosError.response.status}`);
                    }
                }
                else if (axiosError.request) {
                    console.error(`Monita: Network Error on attempt ${attempt + 1}: No response from server.`);
                }
                else {
                    console.error(`Monita: Request setup error on attempt ${attempt + 1}:`, axiosError.message);
                    throw new Error(`Monita: Non-retryable request error: ${axiosError.message}`);
                }
            }
            if (attempt < this._config.maxRetries) {
                const retryDelay = (0, utils_1.getExponentialBackoffDelay)(attempt, this._config.retryDelayMs);
                console.warn(`Monita: Retrying in ${retryDelay}ms... (Attempt ${attempt + 1} of ${this._config.maxRetries})`);
                await (0, utils_1.delay)(retryDelay);
            }
        }
        throw new Error(`Monita: Failed to send log after ${this._config.maxRetries} retries.`);
    }
    // Data sanitization methods
    getSanitizationConfig() {
        return this._dataSanitizer.getConfig();
    }
    updateSanitizationConfig(config) {
        this._dataSanitizer.updateConfig(config);
    }
    getAuditTrail() {
        return this._dataSanitizer.getAuditTrail();
    }
    clearAuditTrail() {
        this._dataSanitizer.clearAuditTrail();
    }
    cleanupExpiredData() {
        return this._dataSanitizer.cleanupExpiredData();
    }
    addCustomSanitizationRule(rule) {
        this._dataSanitizer.addCustomRule(rule);
    }
    removeCustomSanitizationRule(description) {
        return this._dataSanitizer.removeCustomRule(description);
    }
    async shutdown() {
        this._isShuttingDown = true;
        if (this._flushTimer) {
            clearInterval(this._flushTimer);
            this._flushTimer = null;
        }
        // Cleanup data sanitizer
        this.cleanupExpiredData();
        // Cleanup auto-instrumentation
        this._autoInstrumentation.destroy();
        console.log('Monita: Shutting down. Flushing remaining logs...');
        await this.flush();
        console.log('Monita: Shutdown complete.');
    }
}
exports.Monita = Monita;
