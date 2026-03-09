// @apperio/react — React bindings for the Apperio observability SDK

// Provider
export { ApperioProvider, ApperioContext } from "./provider";

// Hooks
export { useApperio, useLogError, useTrackEvent, usePerformance } from "./hooks";

// Error Boundary
export { ApperioErrorBoundary } from "./error-boundary";

// Types
export type {
  ApperioProviderProps,
  UseApperioReturn,
  ApperioErrorBoundaryProps,
  ApperioErrorBoundaryState,
} from "./types";

// Re-export commonly used types from the core SDK for convenience
export { LogLevel } from "apperio";
export type { LoggerConfig, LogEntry } from "apperio";
