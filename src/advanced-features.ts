// src/advanced-features.ts
import { Monita } from './logger';

// Context Manager for dynamic context updates
export class ContextManager {
  private logger: Monita;
  private contextStack: Record<string, any>[] = [];

  constructor(logger: Monita) {
    this.logger = logger;
  }

  // Push context onto stack
  pushContext(context: Record<string, any>): void {
    this.contextStack.push(this.logger.getContext());
    this.logger.setContext({ ...this.logger.getContext(), ...context });
  }

  // Pop context from stack
  popContext(): void {
    const previousContext = this.contextStack.pop();
    if (previousContext) {
      this.logger.setContext(previousContext)
    }
  }

  // Execute function with temporary context
  withContext<T>(context: Record<string, any>, fn: () => T): T {
    this.pushContext(context);
    try {
      return fn();
    } finally {
      this.popContext();
    }
  }
}

// Rate Limiting for noisy events
export class RateLimiter {
  private events: Map<string, number[]> = new Map();
  private maxEvents: number;
  private timeWindow: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(maxEvents: number = 10, timeWindowMs: number = 60000) {
    this.maxEvents = maxEvents;
    this.timeWindow = timeWindowMs;

    // Periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, timeWindowMs)
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, events] of this.events.entries()) {
      const recentEvents = events.filter(time => now - time < this.timeWindow);
      if (recentEvents.length === 0) {
        this.events.delete(key)
      } else {
        this.events.set(key, recentEvents)
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null
    }
  }

  shouldAllow(eventKey: string): boolean {
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

// Session Management
export class SessionManager {
  private sessionId: string;
  private sessionStart: number;
  private logger: Monita;

  constructor(logger: Monita) {
    this.logger = logger;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.initSession();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initSession(): void {
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

  renewSession(): void {
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

  endSession(): void {
    const sessionDuration = Date.now() - this.sessionStart;
    
    this.logger.info('Session ended', {
      eventType: 'session',
      sessionId: this.sessionId,
      duration: sessionDuration,
      timestamp: Date.now(),
    });
  }
}

// Custom Event Tracker
export class CustomEventTracker {
  private logger: Monita;
  private rateLimiter: RateLimiter;

  constructor(logger: Monita) {
    this.logger = logger;
    this.rateLimiter = new RateLimiter(50, 60000); // 50 events per minute
  }

  // Track custom business events
  trackEvent(eventName: string, properties?: Record<string, any>): void {
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
  trackUserAction(action: string, element?: string, timing?: { start: number; end: number }): void {
    this.trackEvent('user_action', {
      action,
      element,
      duration: timing ? timing.end - timing.start : undefined,
    });
  }

  // Track business metrics
  trackMetric(metricName: string, value: number, unit?: string): void {
    this.logger.info(`Metric: ${metricName}`, {
      eventType: 'metric',
      metricName,
      value,
      unit,
      timestamp: Date.now(),
    });
  }

  // Track conversion funnel steps
  trackFunnelStep(funnelName: string, step: string, success: boolean, metadata?: Record<string, any>): void {
    this.trackEvent('funnel_step', {
      funnel: funnelName,
      step,
      success,
      ...metadata,
    });
  }
}

// Feature Flag Integration
export class FeatureFlagLogger {
  private logger: Monita;
  private activeFlags: Map<string, any> = new Map();

  constructor(logger: Monita) {
    this.logger = logger;
  }

  logFlagEvaluation(flagName: string, value: any, userId?: string): void {
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

  logFlagImpact(flagName: string, impact: string, metrics?: Record<string, number>): void {
    this.logger.info(`Feature flag impact: ${flagName}`, {
      eventType: 'feature_flag_impact',
      flagName,
      impact,
      metrics,
      timestamp: Date.now(),
    });
  }
}

// A/B Test Integration
export class ABTestLogger {
  private logger: Monita;
  private activeTests: Map<string, string> = new Map();

  constructor(logger: Monita) {
    this.logger = logger;
  }

  logTestAssignment(testName: string, variant: string, userId?: string): void {
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

  logConversion(testName: string, conversionEvent: string, value?: number): void {
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

// Performance Monitoring Extensions
export class PerformanceMonitor {
  private logger: Monita;
  private marks: Map<string, number> = new Map();

  constructor(logger: Monita) {
    this.logger = logger;
  }

  // Start performance measurement
  mark(name: string): void {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    
    if (performance.mark) {
      performance.mark(name);
    }
  }

  // End performance measurement and log
  measure(name: string, startMark?: string): number {
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
  logWebVital(name: string, value: number, delta?: number): void {
    this.logger.info(`Web Vital: ${name}`, {
      eventType: 'web_vital',
      vitalName: name,
      value,
      delta,
      timestamp: Date.now(),
    });
  }
}

// Export enhanced logger factory
export function createEnhancedLogger(config: any) {
  const logger = new Monita(config);
  
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