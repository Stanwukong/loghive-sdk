import { Monita } from './logger';
import { LoggerConfig } from './types';
export { Monita } from './logger';
export { LoggerConfig, LogEntry, LogLevel, PerformanceEntry, UserInteraction, NetworkRequest } from './types';
export { AutoInstrumentation } from './auto-instrumentation';
export declare const createLogger: (config: LoggerConfig) => Monita;
