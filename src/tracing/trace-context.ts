// src/tracing/trace-context.ts

import { Span } from './span';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID() when available, falls back to Math.random()-based generation.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Manages the lifecycle of distributed traces.
 *
 * Holds the current trace context and a registry of active spans.
 * Provides methods to start/end traces, create child spans, and
 * produce HTTP headers for trace propagation.
 */
export class TraceContextManager {
  private currentTrace: TraceContext | null = null;
  private activeSpans: Map<string, Span> = new Map();

  /**
   * Starts a new trace with the given name.
   * Generates a fresh traceId and root spanId, marks the trace as sampled,
   * and stores it as the current trace context.
   */
  startTrace(name: string): TraceContext {
    const traceId = generateUUID();
    const spanId = generateUUID();

    this.currentTrace = {
      traceId,
      spanId,
      sampled: true,
    };

    // Create and register the root span
    const rootSpan = new Span(name, traceId);
    this.activeSpans.set(rootSpan.getData().spanId, rootSpan);

    return { ...this.currentTrace };
  }

  /**
   * Ends the current trace, clearing the context and all active spans.
   */
  endTrace(): void {
    this.currentTrace = null;
    this.activeSpans.clear();
  }

  /**
   * Returns a copy of the current trace context, or null if no trace is active.
   */
  getCurrentTrace(): TraceContext | null {
    if (!this.currentTrace) {
      return null;
    }
    return { ...this.currentTrace };
  }

  /**
   * Returns HTTP headers for trace propagation.
   * If no trace is active, returns an empty object.
   */
  getTraceHeaders(): Record<string, string> {
    if (!this.currentTrace) {
      return {};
    }
    return {
      'X-Trace-ID': this.currentTrace.traceId,
      'X-Span-ID': this.currentTrace.spanId,
    };
  }

  /**
   * Creates a child span under the current trace.
   * The child span's parentSpanId is set to the current trace's spanId.
   * Throws if no trace is active.
   */
  createChildSpan(name: string): Span {
    if (!this.currentTrace) {
      throw new Error('Cannot create child span: no active trace');
    }

    const child = new Span(name, this.currentTrace.traceId, this.currentTrace.spanId);
    this.activeSpans.set(child.getData().spanId, child);
    return child;
  }

  /**
   * Registers an externally-created span in the active spans registry.
   */
  addSpan(span: Span): void {
    const data = span.getData();
    this.activeSpans.set(data.spanId, span);
  }

  /**
   * Removes a span from the active spans registry by its ID.
   */
  removeSpan(spanId: string): void {
    this.activeSpans.delete(spanId);
  }
}
