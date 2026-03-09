import type { RouteWrapperConfig } from "./types";
/**
 * Minimal Request shape used by Next.js Route Handlers.
 * We declare this locally so the package compiles without requiring `next`
 * as a build-time dependency.
 */
interface RouteRequest {
    method: string;
    url: string;
    headers: {
        get(name: string): string | null;
    };
}
/**
 * A Next.js App Router route handler function signature.
 */
type RouteHandler = (request: RouteRequest, context?: {
    params?: Record<string, string | string[]>;
}) => Promise<Response> | Response;
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
export declare function withApperio(handler: RouteHandler, config: RouteWrapperConfig): RouteHandler;
export {};
//# sourceMappingURL=route-wrapper.d.ts.map