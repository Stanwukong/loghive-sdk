import { RemoteLogger } from './logger';
import { LoggerConfig } from './types';

// src/index.ts
export { RemoteLogger } from './logger';
export { 
  LoggerConfig, 
  LogEntry, 
  LogLevel, 
  PerformanceEntry, 
  UserInteraction, 
  NetworkRequest 
} from './types';
export { AutoInstrumentation } from './auto-instrumentation';

// Convenience function for quick setup
export const createLogger = (config: LoggerConfig) => {
  return new RemoteLogger(config);
};