/**
 * Configuration for the server-side Apperio logger.
 * Extends the core LoggerConfig but makes browser-only options irrelevant.
 */
export interface ServerLoggerConfig {
    /** Apperio API key for log ingestion. */
    apiKey: string;
    /** Apperio project ID. */
    projectId: string;
    /** API endpoint. Defaults to the Apperio production endpoint. */
    endpoint?: string;
    /** Environment name (e.g. "production", "staging"). */
    environment?: string;
    /** Service name attached to log entries. */
    serviceName?: string;
    /** Service version string. */
    serviceVersion?: string;
    /** Release version string. */
    release?: string;
    /** Minimum log level. Defaults to "info". */
    minLogLevel?: import("apperio").LogLevel;
    /** Batch size before auto-flush. Defaults to 10. */
    batchSize?: number;
    /** Auto-flush interval in milliseconds. Defaults to 5000. */
    flushIntervalMs?: number;
}
/**
 * Configuration for the Apperio Next.js middleware wrapper.
 */
export interface ApperioMiddlewareConfig {
    /** Apperio API key. */
    apiKey: string;
    /** Apperio project ID. */
    projectId: string;
    /** API endpoint. */
    endpoint?: string;
    /** Environment name. */
    environment?: string;
    /** Paths to exclude from logging (glob patterns). */
    excludePaths?: string[];
    /** Whether to add an X-Request-Id header. Defaults to true. */
    addRequestId?: boolean;
}
/**
 * Configuration for the route handler wrapper.
 */
export interface RouteWrapperConfig {
    /** Apperio API key. */
    apiKey: string;
    /** Apperio project ID. */
    projectId: string;
    /** API endpoint. */
    endpoint?: string;
    /** Environment name. */
    environment?: string;
    /** Service name. */
    serviceName?: string;
}
/**
 * Standard JSON error response returned by withApperio on unhandled errors.
 */
export interface ApperioErrorResponse {
    error: string;
    message: string;
    requestId?: string;
}
//# sourceMappingURL=types.d.ts.map