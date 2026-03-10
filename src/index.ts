import { Apperio } from './logger';
import { LoggerConfig } from './types';

// src/index.ts
export { Apperio } from './logger';
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
  PII_PATTERNS,
  type SanitizationConfig,
  type SanitizationRule,
  type RetentionPolicy,
  type AuditEntry
} from './data-sanitizer';
export {
  CircuitBreaker,
  CircuitBreakerState,
  type CircuitBreakerConfig
} from './circuit-breaker';
export {
  compressPayload,
  preparePayloadForTransmission,
  uint8ArrayToBase64,
  type CompressionResult
} from './compression';
export {
  HealthMetricsCollector,
  type HealthMetrics
} from './health-metrics';

// Phase 2: Offline Support
export {
  OfflineManager,
  type OfflineManagerConfig
} from './offline-manager';

// Phase 2: Remote Configuration
export {
  RemoteConfigManager,
  type RemoteConfigOptions,
  type RemoteSDKConfig
} from './remote-config';

// Phase 2: Enhanced Error Context
export {
  BreadcrumbManager,
  type Breadcrumb,
  type EnvironmentSnapshot
} from './breadcrumb-manager';

// Phase 2: Distributed Tracing
export {
  TraceContextManager,
  type TraceContext,
  Span,
  type SpanData,
  TracePropagator
} from './tracing';

// Phase 3: Pattern Detection
export {
  PatternDetector,
  type DetectedPattern
} from './pattern-detector';

// Session Replay
export {
  ReplayRecorder,
  type ReplayConfig
} from './replay-recorder';

// Convenience function for quick setup
export const createLogger = (config: LoggerConfig) => {
  return new Apperio(config);
};
