import { Monita } from './logger';
export declare class ContextManager {
    private logger;
    private contextStack;
    constructor(logger: Monita);
    pushContext(context: Record<string, any>): void;
    popContext(): void;
    withContext<T>(context: Record<string, any>, fn: () => T): T;
}
export declare class RateLimiter {
    private events;
    private maxEvents;
    private timeWindow;
    private cleanupInterval;
    constructor(maxEvents?: number, timeWindowMs?: number);
    private cleanup;
    destroy(): void;
    shouldAllow(eventKey: string): boolean;
}
export declare class SessionManager {
    private sessionId;
    private sessionStart;
    private logger;
    constructor(logger: Monita);
    private generateSessionId;
    private initSession;
    renewSession(): void;
    endSession(): void;
}
export declare class CustomEventTracker {
    private logger;
    private rateLimiter;
    constructor(logger: Monita);
    trackEvent(eventName: string, properties?: Record<string, any>): void;
    trackUserAction(action: string, element?: string, timing?: {
        start: number;
        end: number;
    }): void;
    trackMetric(metricName: string, value: number, unit?: string): void;
    trackFunnelStep(funnelName: string, step: string, success: boolean, metadata?: Record<string, any>): void;
}
export declare class FeatureFlagLogger {
    private logger;
    private activeFlags;
    constructor(logger: Monita);
    logFlagEvaluation(flagName: string, value: any, userId?: string): void;
    logFlagImpact(flagName: string, impact: string, metrics?: Record<string, number>): void;
}
export declare class ABTestLogger {
    private logger;
    private activeTests;
    constructor(logger: Monita);
    logTestAssignment(testName: string, variant: string, userId?: string): void;
    logConversion(testName: string, conversionEvent: string, value?: number): void;
}
export declare class PerformanceMonitor {
    private logger;
    private marks;
    constructor(logger: Monita);
    mark(name: string): void;
    measure(name: string, startMark?: string): number;
    logWebVital(name: string, value: number, delta?: number): void;
}
export declare function createEnhancedLogger(config: any): {
    logger: Monita;
    contextManager: ContextManager;
    sessionManager: SessionManager;
    eventTracker: CustomEventTracker;
    featureFlagLogger: FeatureFlagLogger;
    abTestLogger: ABTestLogger;
    performanceMonitor: PerformanceMonitor;
};
