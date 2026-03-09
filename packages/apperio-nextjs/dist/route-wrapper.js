"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withApperio = withApperio;
const apperio_1 = require("apperio");
const server_1 = require("./server");
/**
 * Generate a short unique request ID.
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
 * Higher-order function that wraps a Next.js Route Handler with automatic
 * error catching, request/response timing, and Apperio logging.
 *
 * When the wrapped handler throws an error, `withApperio` catches it, logs
 * it to Apperio with full context (method, path, duration, user-agent), and
 * returns a JSON error response with a 500 status code.
 *
 * @param handler - The route handler function to wrap.
 * @param config  - Apperio configuration for the server logger.
 * @returns A new route handler with Apperio instrumentation.
 *
 * @example
 * ```ts
 * // app/api/users/route.ts
 * import { withApperio } from "@apperio/nextjs";
 *
 * const config = {
 *   apiKey: process.env.APPERIO_API_KEY!,
 *   projectId: process.env.APPERIO_PROJECT_ID!,
 *   environment: "production",
 *   serviceName: "users-api",
 * };
 *
 * export const GET = withApperio(async (request) => {
 *   const users = await getUsers();
 *   return Response.json(users);
 * }, config);
 *
 * export const POST = withApperio(async (request) => {
 *   const body = await request.json();
 *   const user = await createUser(body);
 *   return Response.json(user, { status: 201 });
 * }, config);
 * ```
 *
 * @example
 * ```ts
 * // Pages Router API Route (pages/api/users.ts)
 * // For Pages Router, use createServerLogger directly instead.
 * ```
 */
function withApperio(handler, config) {
    const logger = (0, server_1.createServerLogger)({
        apiKey: config.apiKey,
        projectId: config.projectId,
        endpoint: config.endpoint,
        environment: config.environment,
        serviceName: config.serviceName ?? "nextjs-route",
    });
    return async (request, context) => {
        const requestId = generateRequestId();
        const startTime = Date.now();
        const method = request.method;
        // Extract pathname from full URL
        let pathname;
        try {
            pathname = new URL(request.url).pathname;
        }
        catch {
            pathname = request.url;
        }
        const userAgent = request.headers.get("user-agent") ?? "unknown";
        try {
            const response = await handler(request, context);
            const duration = Date.now() - startTime;
            // Determine status from the Response
            const status = response instanceof Response ? response.status : 200;
            // Log successful requests
            const logLevel = status >= 400 ? apperio_1.LogLevel.WARN : apperio_1.LogLevel.INFO;
            logger._log(logLevel, `${method} ${pathname} ${status}`, undefined, {
                eventType: "network",
                requestId,
                method,
                path: pathname,
                status,
                duration,
                userAgent,
                params: context?.params,
            });
            // Clone the response to add the request ID header
            if (response instanceof Response) {
                const cloned = new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: new Headers(response.headers),
                });
                cloned.headers.set("X-Request-Id", requestId);
                return cloned;
            }
            return response;
        }
        catch (err) {
            const duration = Date.now() - startTime;
            const error = err instanceof Error ? err : new Error(String(err));
            // Log the error
            logger.error(`${method} ${pathname} 500`, error, {
                eventType: "error",
                requestId,
                method,
                path: pathname,
                status: 500,
                duration,
                userAgent,
                params: context?.params,
            });
            // Return a structured JSON error response
            const body = {
                error: "Internal Server Error",
                message: process.env.NODE_ENV === "production"
                    ? "An unexpected error occurred"
                    : error.message,
                requestId,
            };
            return new Response(JSON.stringify(body), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "X-Request-Id": requestId,
                },
            });
        }
    };
}
//# sourceMappingURL=route-wrapper.js.map