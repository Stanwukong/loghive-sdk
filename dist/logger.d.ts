import { LoggerConfig, LogLevel } from './types';
export declare class Monita {
    private _config;
    private _logBuffer;
    private _context;
    private _flushTimer;
    private _isFlushing;
    private _isShuttingDown;
    private _axiosInstance;
    private _autoInstrumentation;
    constructor(config: LoggerConfig);
    init(): void;
    setContext(context: Record<string, any>): void;
    _log(level: LogLevel, message: string, error?: Error, data?: Record<string, any>): void;
    trace(message: string, data?: Record<string, any>): void;
    debug(message: string, data?: Record<string, any>): void;
    info(message: string, data?: Record<string, any>): void;
    warn(message: string, data?: Record<string, any>): void;
    error(message: string, error?: Error, data?: Record<string, any>): void;
    fatal(message: string, error?: Error, data?: Record<string, any>): void;
    captureException(error: Error, context?: Record<string, any>): void;
    captureMessage(message: string, level?: LogLevel, context?: Record<string, any>): void;
    addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void;
    flush(): Promise<void>;
    private _sendLogs;
    private _sendSingleLog;
    shutdown(): Promise<void>;
}
