// src/tracing/propagator.ts

import { TraceContext } from './trace-context';

/**
 * Handles injection and extraction of trace context into/from HTTP headers.
 *
 * All methods are static since the propagator is stateless -- it simply
 * maps between TraceContext objects and header key-value pairs.
 *
 * Header names used:
 *   - `X-Trace-ID`   -- the trace identifier
 *   - `X-Span-ID`    -- the current span identifier
 *   - `X-Parent-Span-ID` -- the parent span identifier (optional)
 */
export class TracePropagator {
  /**
   * Injects trace context fields into a headers object.
   * Returns a new headers object with the trace headers merged in.
   */
  static inject(
    headers: Record<string, string>,
    context: TraceContext,
  ): Record<string, string> {
    const result: Record<string, string> = { ...headers };
    result['X-Trace-ID'] = context.traceId;
    result['X-Span-ID'] = context.spanId;
    if (context.parentSpanId) {
      result['X-Parent-Span-ID'] = context.parentSpanId;
    }
    return result;
  }

  /**
   * Extracts a TraceContext from incoming HTTP headers.
   * Header lookup is case-insensitive.
   * Returns null if the required headers (X-Trace-ID, X-Span-ID) are missing.
   */
  static extract(headers: Record<string, string>): TraceContext | null {
    // Build a lowercase-keyed lookup for case-insensitive access
    const normalized: Record<string, string> = {};
    for (const key of Object.keys(headers)) {
      normalized[key.toLowerCase()] = headers[key];
    }

    const traceId = normalized['x-trace-id'];
    const spanId = normalized['x-span-id'];

    if (!traceId || !spanId) {
      return null;
    }

    const parentSpanId = normalized['x-parent-span-id'] || undefined;

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled: true,
    };
  }
}
