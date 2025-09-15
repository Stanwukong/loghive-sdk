import { Monita } from './logger';
import { LoggerConfig } from './types';

// src/index.ts
export { Monita } from './logger';
export { 
  LoggerConfig, 
  LogEntry, 
  LogLevel, 
  PerformanceEntry, 
  UserInteraction, 
  NetworkRequest 
} from './types';
export { AutoInstrumentation } from './auto-instrumentation';
export { 
  DataSanitizer, 
  createDataSanitizer, 
  SANITIZATION_PRESETS,
  type SanitizationConfig,
  type SanitizationRule,
  type RetentionPolicy,
  type AuditEntry
} from './data-sanitizer';

// Convenience function for quick setup
export const createLogger = (config: LoggerConfig) => {
  return new Monita(config);
};