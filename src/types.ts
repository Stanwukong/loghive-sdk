// src/types.ts - Updated to match backend expectations
export enum LogLevel {
  TRACE = "trace",
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
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
}

export interface LogEntry {
  projectId: string; // Required field that matches backend expectation
  timestamp?: string;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  service?: string;
  environment?: string;
  context?: Record<string, any>;
  metadata?: any;
}