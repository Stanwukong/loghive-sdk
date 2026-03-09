// @apperio/nextjs — Next.js integration for the Apperio observability SDK

// Middleware
export { withApperioMiddleware } from "./middleware";

// Server-side logger
export { createServerLogger, destroyServerLogger, destroyAllServerLoggers } from "./server";

// Route handler wrapper
export { withApperio } from "./route-wrapper";

// Types
export type {
  ServerLoggerConfig,
  ApperioMiddlewareConfig,
  RouteWrapperConfig,
  ApperioErrorResponse,
} from "./types";

// Re-export commonly used types from the core SDK for convenience
export { LogLevel } from "apperio";
export type { LoggerConfig, LogEntry } from "apperio";
