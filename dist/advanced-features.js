"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.ABTestLogger = exports.FeatureFlagLogger = exports.CustomEventTracker = exports.SessionManager = exports.RateLimiter = exports.ContextManager = void 0;
exports.createEnhancedLogger = createEnhancedLogger;
// src/advanced-features.ts
const logger_1 = require("./logger");
// Context Manager for dynamic context updates
class ContextManager {
    constructor(logger) {
        this.contextStack = [];
        this.logger = logger;
    }
    // Push context onto stack
    pushContext(context) {
        this.contextStack.push({ ...this.logger['_context'] });
        this.logger.setContext(context);
    }
    // Pop context from stack
    popContext() {
        const previousContext = this.contextStack.pop();
        if (previousContext) {
            this.logger['_context'] = previousContext;
        }
    }
    // Execute function with temporary context
    withContext(context, fn) {
        this.pushContext(context);
        try {
            return fn();
        }
        finally {
            this.popContext();
        }
    }
}
exports.ContextManager = ContextManager;
// Rate Limiting for noisy events
class RateLimiter {
    constructor(maxEvents = 10, timeWindowMs = 60000) {
        this.events = new Map();
        this.maxEvents = maxEvents;
        this.timeWindow = timeWindowMs;
    }
    shouldAllow(eventKey) {
        const now = Date.now();
        const events = this.events.get(eventKey) || [];
        // Remove old events outside time window
        const recentEvents = events.filter(time => now - time < this.timeWindow);
        if (recentEvents.length >= this.maxEvents) {
            return false;
        }
        recentEvents.push(now);
        this.events.set(eventKey, recentEvents);
        return true;
    }
}
exports.RateLimiter = RateLimiter;
// Session Management
class SessionManager {
    constructor(logger) {
        this.logger = logger;
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.initSession();
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    initSession() {
        this.logger.setContext({
            sessionId: this.sessionId,
            sessionStart: this.sessionStart,
        });
        this.logger.info('Session started', {
            eventType: 'session',
            sessionId: this.sessionId,
            timestamp: this.sessionStart,
        });
    }
    renewSession() {
        const oldSessionId = this.sessionId;
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.logger.info('Session renewed', {
            eventType: 'session',
            oldSessionId,
            newSessionId: this.sessionId,
            timestamp: this.sessionStart,
        });
        this.logger.setContext({
            sessionId: this.sessionId,
            sessionStart: this.sessionStart,
        });
    }
    endSession() {
        const sessionDuration = Date.now() - this.sessionStart;
        this.logger.info('Session ended', {
            eventType: 'session',
            sessionId: this.sessionId,
            duration: sessionDuration,
            timestamp: Date.now(),
        });
    }
}
exports.SessionManager = SessionManager;
// Custom Event Tracker
class CustomEventTracker {
    constructor(logger) {
        this.logger = logger;
        this.rateLimiter = new RateLimiter(50, 60000); // 50 events per minute
    }
    // Track custom business events
    trackEvent(eventName, properties) {
        const eventKey = `custom_event_${eventName}`;
        if (!this.rateLimiter.shouldAllow(eventKey)) {
            return; // Rate limited
        }
        this.logger.info(`Custom event: ${eventName}`, {
            eventType: 'custom',
            eventName,
            properties,
            timestamp: Date.now(),
        });
    }
    // Track user actions with timing
    trackUserAction(action, element, timing) {
        this.trackEvent('user_action', {
            action,
            element,
            duration: timing ? timing.end - timing.start : undefined,
        });
    }
    // Track business metrics
    trackMetric(metricName, value, unit) {
        this.logger.info(`Metric: ${metricName}`, {
            eventType: 'metric',
            metricName,
            value,
            unit,
            timestamp: Date.now(),
        });
    }
    // Track conversion funnel steps
    trackFunnelStep(funnelName, step, success, metadata) {
        this.trackEvent('funnel_step', {
            funnel: funnelName,
            step,
            success,
            ...metadata,
        });
    }
}
exports.CustomEventTracker = CustomEventTracker;
// Feature Flag Integration
class FeatureFlagLogger {
    constructor(logger) {
        this.activeFlags = new Map();
        this.logger = logger;
    }
    logFlagEvaluation(flagName, value, userId) {
        this.activeFlags.set(flagName, value);
        this.logger.debug(`Feature flag evaluated: ${flagName}`, {
            eventType: 'feature_flag',
            flagName,
            value,
            userId,
            timestamp: Date.now(),
        });
        // Update context with active flags
        this.logger.setContext({
            featureFlags: Object.fromEntries(this.activeFlags),
        });
    }
    logFlagImpact(flagName, impact, metrics) {
        this.logger.info(`Feature flag impact: ${flagName}`, {
            eventType: 'feature_flag_impact',
            flagName,
            impact,
            metrics,
            timestamp: Date.now(),
        });
    }
}
exports.FeatureFlagLogger = FeatureFlagLogger;
// A/B Test Integration
class ABTestLogger {
    constructor(logger) {
        this.activeTests = new Map();
        this.logger = logger;
    }
    logTestAssignment(testName, variant, userId) {
        this.activeTests.set(testName, variant);
        this.logger.info(`A/B test assignment: ${testName}`, {
            eventType: 'ab_test',
            testName,
            variant,
            userId,
            timestamp: Date.now(),
        });
        // Update context with active tests
        this.logger.setContext({
            abTests: Object.fromEntries(this.activeTests),
        });
    }
    logConversion(testName, conversionEvent, value) {
        const variant = this.activeTests.get(testName);
        this.logger.info(`A/B test conversion: ${testName}`, {
            eventType: 'ab_test_conversion',
            testName,
            variant,
            conversionEvent,
            value,
            timestamp: Date.now(),
        });
    }
}
exports.ABTestLogger = ABTestLogger;
// Performance Monitoring Extensions
class PerformanceMonitor {
    constructor(logger) {
        this.marks = new Map();
        this.logger = logger;
    }
    // Start performance measurement
    mark(name) {
        const timestamp = performance.now();
        this.marks.set(name, timestamp);
        if (performance.mark) {
            performance.mark(name);
        }
    }
    // End performance measurement and log
    measure(name, startMark) {
        const endTime = performance.now();
        const startTime = startMark ? this.marks.get(startMark) : this.marks.get(name);
        if (!startTime) {
            console.warn(`PerformanceMonitor: No start mark found for ${name}`);
            return 0;
        }
        const duration = endTime - startTime;
        if (performance.measure && startMark) {
            performance.measure(name, startMark);
        }
        this.logger.info(`Performance measurement: ${name}`, {
            eventType: 'performance',
            measurementName: name,
            duration,
            startTime,
            endTime,
            timestamp: Date.now(),
        });
        return duration;
    }
    // Log Core Web Vitals
    logWebVital(name, value, delta) {
        this.logger.info(`Web Vital: ${name}`, {
            eventType: 'web_vital',
            vitalName: name,
            value,
            delta,
            timestamp: Date.now(),
        });
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
// Export enhanced logger factory
function createEnhancedLogger(config) {
    const logger = new logger_1.Monita(config);
    return {
        logger,
        contextManager: new ContextManager(logger),
        sessionManager: new SessionManager(logger),
        eventTracker: new CustomEventTracker(logger),
        featureFlagLogger: new FeatureFlagLogger(logger),
        abTestLogger: new ABTestLogger(logger),
        performanceMonitor: new PerformanceMonitor(logger),
    };
}
