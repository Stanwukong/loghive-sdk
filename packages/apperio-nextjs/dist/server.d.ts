import { Apperio } from "apperio";
import type { ServerLoggerConfig } from "./types";
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
export declare function createServerLogger(config: ServerLoggerConfig): Apperio;
/**
 * Shuts down and removes a cached server logger.
 * Useful for testing or graceful shutdown scenarios.
 */
export declare function destroyServerLogger(config: {
    apiKey: string;
    projectId: string;
}): Promise<void>;
/**
 * Shuts down and removes all cached server loggers.
 */
export declare function destroyAllServerLoggers(): Promise<void>;
//# sourceMappingURL=server.d.ts.map