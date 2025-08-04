"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartAutoInstrumentation = exports.LogLevelDecisionEngine = void 0;
// src/log-level-logic.ts
const logger_1 = require("./logger");
const types_1 = require("./types");
/**
 * Log Level Decision Matrix for Auto-Generated Events
 *
 * The log level is determined by:
 * 1. Severity/Impact of the event
 * 2. Actionability (can developer act on this?)
 * 3. Frequency (how often does this occur?)
 * 4. Business value (how important for monitoring?)
 */
class LogLevelDecisionEngine {
    // ERROR EVENTS - Always LogLevel.ERROR
    static getErrorLogLevel(error) {
        // All uncaught errors are serious and require immediate attention
        return types_1.LogLevel.ERROR;
        // Future enhancement: Could differentiate based on error type
        // if (error.name === 'NetworkError') return LogLevel.WARN;
        // if (error.name === 'SyntaxError') return LogLevel.ERROR;
        // if (error.message.includes('Script error')) return LogLevel.WARN; // CORS errors
    }
    // NETWORK EVENTS - Based on HTTP status
    static getNetworkLogLevel(status, duration) {
        if (!status) {
            return types_1.LogLevel.ERROR; // Network failure, no response
        }
        if (status >= 500) {
            return types_1.LogLevel.ERROR; // Server errors are critical
        }
        if (status >= 400) {
            return types_1.LogLevel.WARN; // Client errors are warnings (might be expected)
        }
        // Performance-based escalation
        if (duration && duration > 5000) { // > 5 seconds
            return types_1.LogLevel.WARN; // Slow requests are concerning
        }
        return types_1.LogLevel.DEBUG; // Successful requests are debug info
    }
    // PERFORMANCE EVENTS - Based on metrics and thresholds
    static getPerformanceLogLevel(perfEntry) {
        const { type, duration, name } = perfEntry;
        switch (type) {
            case 'navigation':
                // Page load performance
                if (duration > 3000)
                    return types_1.LogLevel.WARN; // > 3s is concerning
                if (duration > 1000)
                    return types_1.LogLevel.INFO; // > 1s is noteworthy
                return types_1.LogLevel.DEBUG; // Fast loads are just debug info
            case 'paint':
                // First Paint, First Contentful Paint
                if (duration > 2000)
                    return types_1.LogLevel.WARN;
                if (duration > 1000)
                    return types_1.LogLevel.INFO;
                return types_1.LogLevel.DEBUG;
            case 'resource':
                // CSS, JS, Image loading
                if (duration > 3000)
                    return types_1.LogLevel.WARN; // Slow resource
                if (name.includes('.css') || name.includes('.js')) {
                    // Critical resources get more attention
                    if (duration > 1000)
                        return types_1.LogLevel.INFO;
                }
                return types_1.LogLevel.DEBUG;
            case 'measure':
                // Custom performance marks
                return types_1.LogLevel.INFO; // Developer-defined, probably important
            default:
                return types_1.LogLevel.DEBUG;
        }
    }
    // USER INTERACTION EVENTS - Generally low priority
    static getInteractionLogLevel(interactionType) {
        switch (interactionType) {
            case 'click':
                return types_1.LogLevel.DEBUG; // Clicks are debug info for user journey
            case 'scroll':
                return types_1.LogLevel.TRACE; // Very frequent, lowest priority
            case 'keypress':
                return types_1.LogLevel.TRACE; // Very frequent, lowest priority
            case 'focus':
            case 'blur':
                return types_1.LogLevel.TRACE; // Form interactions, low priority
            default:
                return types_1.LogLevel.DEBUG;
        }
    }
    // CONSOLE EVENTS - Based on original console method
    static getConsoleLogLevel(originalLevel) {
        // Map console methods to our log levels
        switch (originalLevel) {
            case 'error':
                return types_1.LogLevel.ERROR;
            case 'warn':
                return types_1.LogLevel.WARN;
            case 'log':
            case 'info':
                return types_1.LogLevel.INFO;
            default:
                return types_1.LogLevel.DEBUG;
        }
    }
    // PAGE VIEW EVENTS - Business important but not urgent
    static getPageViewLogLevel() {
        return types_1.LogLevel.INFO; // Page views are important for analytics
    }
    // CUSTOM BUSINESS EVENTS - Based on event name/type
    static getCustomEventLogLevel(eventName, properties) {
        // Business-critical events
        if (eventName.includes('purchase') ||
            eventName.includes('payment') ||
            eventName.includes('checkout')) {
            return types_1.LogLevel.INFO; // Business critical
        }
        // Error-related custom events
        if (eventName.includes('error') ||
            eventName.includes('fail') ||
            eventName.includes('exception')) {
            return types_1.LogLevel.ERROR;
        }
        // Warning-related events
        if (eventName.includes('warn') ||
            eventName.includes('timeout') ||
            eventName.includes('retry')) {
            return types_1.LogLevel.WARN;
        }
        // Default for custom events
        return types_1.LogLevel.INFO;
    }
}
exports.LogLevelDecisionEngine = LogLevelDecisionEngine;
// Enhanced auto-instrumentation with smart log levels
class SmartAutoInstrumentation {
    constructor(logger) {
        this.logger = logger;
    }
    logError(error, context) {
        const level = LogLevelDecisionEngine.getErrorLogLevel(error);
        this.logger._log(level, 'Uncaught Error', undefined, {
            eventType: 'error',
            error: this.extractErrorDetails(error),
            ...context,
        });
    }
    logNetworkRequest(request) {
        const level = LogLevelDecisionEngine.getNetworkLogLevel(request.status, request.duration);
        const message = level === types_1.LogLevel.ERROR ? 'Network Request Failed' :
            level === types_1.LogLevel.WARN ? 'Slow Network Request' :
                'Network Request';
        this.logger._log(level, message, undefined, {
            eventType: 'network',
            network: request,
        });
    }
    logPerformanceEntry(perfEntry) {
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);
        const message = level === types_1.LogLevel.WARN ? `Slow ${perfEntry.type}` :
            level === types_1.LogLevel.INFO ? `Performance ${perfEntry.type}` :
                'Performance Entry';
        this.logger._log(level, message, undefined, {
            eventType: 'performance',
            performance: perfEntry,
        });
    }
    logUserInteraction(interaction) {
        const level = LogLevelDecisionEngine.getInteractionLogLevel(interaction.type);
        this.logger._log(level, `User ${interaction.type}`, undefined, {
            eventType: 'interaction',
            interaction,
        });
    }
    logPageView() {
        const level = LogLevelDecisionEngine.getPageViewLogLevel();
        this.logger._log(level, 'Page View', undefined, {
            eventType: 'pageview',
            url: window.location.href,
            referrer: document.referrer,
            title: document.title,
        });
    }
    extractErrorDetails(error) {
        // Implementation details...
        return {};
    }
}
exports.SmartAutoInstrumentation = SmartAutoInstrumentation;
// Usage example with custom levels
const logger = new logger_1.Monita({
    apiKey: 'key',
    projectId: 'project',
    minLogLevel: types_1.LogLevel.INFO, // This still applies to auto-generated logs
    autoCapture: {
        errors: true,
        networkRequests: true,
        performance: true,
        // Override default log levels
        logLevels: {
            networkSuccess: types_1.LogLevel.TRACE, // Make successful requests very quiet
            performanceFast: types_1.LogLevel.TRACE, // Fast performance entries are trace
            interactions: types_1.LogLevel.DEBUG, // Keep interactions at debug
            pageViews: types_1.LogLevel.INFO, // Page views remain info
            console: {
                error: types_1.LogLevel.FATAL, // Escalate console errors
                warn: types_1.LogLevel.ERROR, // Escalate console warnings
            }
        }
    }
});
// The minLogLevel still applies - if set to WARN, DEBUG and INFO auto-logs won't be sent
// This gives users control over the volume of auto-generated logs
