"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withApperioMiddleware = withApperioMiddleware;
const apperio_1 = require("apperio");
/**
 * Generate a short unique request ID (UUID v4-like, without external deps).
 */
function generateRequestId() {
    const hex = "0123456789abcdef";
    let id = "";
    for (let i = 0; i < 32; i++) {
        id += hex[Math.floor(Math.random() * 16)];
        if (i === 7 || i === 11 || i === 15 || i === 19) {
            id += "-";
        }
    }
    return id;
}
/**
 * Check whether a pathname should be excluded from logging.
 */
function isExcluded(pathname, patterns) {
    return patterns.some((pattern) => {
        // Support simple glob: "/api/*" matches "/api/foo", "/_next/*" matches "/_next/static/..."
        if (pattern.endsWith("*")) {
            const prefix = pattern.slice(0, -1);
            return pathname.startsWith(prefix);
        }
        return pathname === pattern;
    });
}
// Module-level singleton so we don't recreate the logger on every request.
let middlewareLogger = null;
let lastConfigHash = "";
function getMiddlewareLogger(config) {
    const hash = `${config.apiKey}:${config.projectId}:${config.endpoint ?? ""}`;
    if (middlewareLogger && hash === lastConfigHash) {
        return middlewareLogger;
    }
    // Shut down previous instance if config changed
    if (middlewareLogger) {
        middlewareLogger.shutdown();
    }
    middlewareLogger = new apperio_1.Apperio({
        apiKey: config.apiKey,
        projectId: config.projectId,
        endpoint: config.endpoint,
        environment: config.environment ?? "production",
        serviceName: "nextjs-middleware",
        batchSize: 20,
        flushIntervalMs: 3000,
        autoCapture: {
            errors: false,
            performance: false,
            userInteractions: false,
            networkRequests: false,
            consoleMessages: false,
            pageViews: false,
        },
    });
    lastConfigHash = hash;
    return middlewareLogger;
}
/**
 * Wraps a Next.js middleware function to automatically log every request
 * passing through it. Adds an `X-Request-Id` header to each response.
 *
 * @param middleware - Your existing Next.js middleware function.
 * @param config    - Apperio configuration for the middleware logger.
 * @returns A new middleware function with Apperio instrumentation.
 *
 * @example
 * ```ts
 * // middleware.ts (at project root)
 * import { withApperioMiddleware } from "@apperio/nextjs";
 * import { NextResponse } from "next/server";
 *
 * function middleware(request) {
 *   return NextResponse.next();
 * }
 *
 * export default withApperioMiddleware(middleware, {
 *   apiKey: process.env.APPERIO_API_KEY!,
 *   projectId: process.env.APPERIO_PROJECT_ID!,
 *   environment: "production",
 *   excludePaths: ["/_next/*", "/favicon.ico"],
 * });
 * ```
 */
function withApperioMiddleware(middleware, config) {
    const excludePaths = config.excludePaths ?? [
        "/_next/*",
        "/favicon.ico",
        "/api/health",
    ];
    const addRequestId = config.addRequestId !== false;
    return async (request, event) => {
        const { pathname } = request.nextUrl;
        // Skip excluded paths
        if (isExcluded(pathname, excludePaths)) {
            return middleware(request, event);
        }
        const logger = getMiddlewareLogger(config);
        const requestId = generateRequestId();
        const startTime = Date.now();
        // Execute the original middleware
        let response;
        let error;
        try {
            response = await middleware(request, event);
        }
        catch (err) {
            error = err instanceof Error ? err : new Error(String(err));
            // Log the error and re-throw
            logger.error("Middleware error", error, {
                eventType: "error",
                requestId,
                method: request.method,
                path: pathname,
                url: request.url,
            });
            throw err;
        }
        const duration = Date.now() - startTime;
        // Attach X-Request-Id header to the response
        if (addRequestId && response && "headers" in response) {
            try {
                response.headers.set("X-Request-Id", requestId);
            }
            catch {
                // Some response types may not allow header mutation — ignore silently.
            }
        }
        // Log the request
        const userAgent = request.headers.get("user-agent") ?? "unknown";
        logger.info(`${request.method} ${pathname}`, {
            eventType: "network",
            requestId,
            method: request.method,
            path: pathname,
            url: request.url,
            duration,
            userAgent,
            geo: request.geo,
            ip: request.ip,
        });
        return response;
    };
}
//# sourceMappingURL=middleware.js.map