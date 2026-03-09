import type { ApperioMiddlewareConfig } from "./types";
type NextRequest = {
    method: string;
    nextUrl: {
        pathname: string;
    };
    url: string;
    headers: {
        get(name: string): string | null;
    };
    geo?: {
        country?: string;
        city?: string;
        region?: string;
    };
    ip?: string;
};
type NextResponse = {
    headers: {
        set(name: string, value: string): void;
    };
};
type NextMiddleware = (request: NextRequest, event?: unknown) => Promise<NextResponse | Response | undefined | void> | NextResponse | Response | undefined | void;
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
export declare function withApperioMiddleware(middleware: NextMiddleware, config: ApperioMiddlewareConfig): NextMiddleware;
export {};
//# sourceMappingURL=middleware.d.ts.map