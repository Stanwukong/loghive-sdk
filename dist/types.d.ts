import { SanitizationConfig } from "./data-sanitizer";
export declare enum LogLevel {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    FATAL = "fatal"
}
export interface LoggerConfig {
    apiKey: string;
    projectId: string;
    endpoint?: string;
    minLogLevel?: LogLevel;
    batchSize?: number;
    flushIntervalMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    environment?: string;
    serviceName?: string;
    serviceVersion?: string;
    autoCapture?: {
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
    };
    sanitization?: {
        enabled?: boolean;
        config?: SanitizationConfig;
    };
}
export interface LogEntry {
    projectId: string;
    timestamp?: string;
    level: LogLevel;
    message: string;
    data?: Record<string, any>;
    error?: {
        name: string;
        message: string;
        stack?: string;
        url?: string;
        lineNumber?: number;
        columnNumber?: number;
    };
    service?: string;
    environment?: string;
    context?: Record<string, any>;
    metadata?: any;
    eventType?: 'error' | 'performance' | 'interaction' | 'network' | 'console' | 'pageview';
    userAgent?: string;
    url?: string;
    referrer?: string;
}
export interface PerformanceEntry {
    name: string;
    type: string;
    startTime: number;
    duration: number;
    size?: number;
}
export interface UserInteraction {
    type: 'click' | 'scroll' | 'keypress' | 'focus' | 'blur';
    target: string;
    timestamp: number;
    coordinates?: {
        x: number;
        y: number;
    };
}
export interface NetworkRequest {
    url: string;
    method: string;
    status?: number;
    duration: number;
    size?: number;
    timestamp: number;
}
