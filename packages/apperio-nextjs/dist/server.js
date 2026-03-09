"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerLogger = createServerLogger;
exports.destroyServerLogger = destroyServerLogger;
exports.destroyAllServerLoggers = destroyAllServerLoggers;
const apperio_1 = require("apperio");
// Map of existing server logger instances keyed by projectId + apiKey hash.
// This avoids creating duplicate loggers when `createServerLogger` is called
// multiple times with the same config (common in serverless / edge runtimes
// where modules are re-evaluated).
const serverLoggers = new Map();
/**
 * Factory function that creates (or retrieves) a server-side Apperio logger
 * instance suitable for use in Next.js Route Handlers, Server Components,
 * Server Actions, and API Routes.
 *
 * The logger uses node-compatible features only (no browser APIs) and
 * disables all auto-capture instrumentation that requires a DOM.
 *
 * Instances are cached by `projectId + apiKey` so repeated calls with the
 * same config return the same logger (important for serverless environments
 * where the module may be re-evaluated).
 *
 * @param config - Server logger configuration.
 * @returns A configured Apperio instance.
 *
 * @example
 * ```ts
 * // app/api/users/route.ts
 * import { createServerLogger } from "@apperio/nextjs";
 *
 * const logger = createServerLogger({
 *   apiKey: process.env.APPERIO_API_KEY!,
 *   projectId: process.env.APPERIO_PROJECT_ID!,
 *   environment: "production",
 *   serviceName: "users-api",
 * });
 *
 * export async function GET() {
 *   logger.info("Fetching users");
 *   const users = await fetchUsers();
 *   return Response.json(users);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Server Component
 * import { createServerLogger } from "@apperio/nextjs";
 *
 * const logger = createServerLogger({
 *   apiKey: process.env.APPERIO_API_KEY!,
 *   projectId: process.env.APPERIO_PROJECT_ID!,
 * });
 *
 * export default async function Page() {
 *   logger.info("Rendering page");
 *   const data = await getData();
 *   return <div>{data.title}</div>;
 * }
 * ```
 */
function createServerLogger(config) {
    const cacheKey = `${config.projectId}:${config.apiKey}`;
    const existing = serverLoggers.get(cacheKey);
    if (existing) {
        return existing;
    }
    const logger = new apperio_1.Apperio({
        apiKey: config.apiKey,
        projectId: config.projectId,
        endpoint: config.endpoint,
        environment: config.environment ?? "production",
        serviceName: config.serviceName ?? "nextjs-server",
        serviceVersion: config.serviceVersion,
        release: config.release,
        minLogLevel: config.minLogLevel ?? apperio_1.LogLevel.INFO,
        batchSize: config.batchSize ?? 10,
        flushIntervalMs: config.flushIntervalMs ?? 5000,
        // Disable all browser auto-capture on the server
        autoCapture: {
            errors: false,
            performance: false,
            userInteractions: false,
            networkRequests: false,
            consoleMessages: false,
            pageViews: false,
        },
    });
    serverLoggers.set(cacheKey, logger);
    return logger;
}
/**
 * Shuts down and removes a cached server logger.
 * Useful for testing or graceful shutdown scenarios.
 */
async function destroyServerLogger(config) {
    const cacheKey = `${config.projectId}:${config.apiKey}`;
    const logger = serverLoggers.get(cacheKey);
    if (logger) {
        await logger.shutdown();
        serverLoggers.delete(cacheKey);
    }
}
/**
 * Shuts down and removes all cached server loggers.
 */
async function destroyAllServerLoggers() {
    const shutdowns = [];
    for (const [key, logger] of serverLoggers) {
        shutdowns.push(logger.shutdown());
        serverLoggers.delete(key);
    }
    await Promise.all(shutdowns);
}
//# sourceMappingURL=server.js.map