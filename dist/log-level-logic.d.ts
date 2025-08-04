import { LogLevel } from './types';
/**
 * Log Level Decision Matrix for Auto-Generated Events
 *
 * The log level is determined by:
 * 1. Severity/Impact of the event
 * 2. Actionability (can developer act on this?)
 * 3. Frequency (how often does this occur?)
 * 4. Business value (how important for monitoring?)
 */
export declare class LogLevelDecisionEngine {
    static getErrorLogLevel(error: Error | ErrorEvent): LogLevel;
    static getNetworkLogLevel(status?: number, duration?: number): LogLevel;
    static getPerformanceLogLevel(perfEntry: any): LogLevel;
    static getInteractionLogLevel(interactionType: string): LogLevel;
    static getConsoleLogLevel(originalLevel: 'error' | 'warn' | 'log' | 'info'): LogLevel;
    static getPageViewLogLevel(): LogLevel;
    static getCustomEventLogLevel(eventName: string, properties?: any): LogLevel;
}
export declare class SmartAutoInstrumentation {
    private logger;
    constructor(logger: any);
    private logError;
    private logNetworkRequest;
    private logPerformanceEntry;
    private logUserInteraction;
    private logPageView;
    private extractErrorDetails;
}
export interface AutoCaptureConfig {
    errors?: boolean;
    performance?: boolean;
    userInteractions?: boolean;
    networkRequests?: boolean;
    consoleMessages?: boolean;
    pageViews?: boolean;
    logLevels?: {
        errors?: LogLevel;
        networkSuccess?: LogLevel;
        networkError?: LogLevel;
        performanceSlow?: LogLevel;
        performanceFast?: LogLevel;
        interactions?: LogLevel;
        pageViews?: LogLevel;
        console?: {
            error?: LogLevel;
            warn?: LogLevel;
            info?: LogLevel;
        };
    };
}
