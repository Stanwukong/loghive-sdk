// src/tracing/span.ts

export interface SpanData {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'pending';
  attributes: Record<string, any>;
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
 * Returns a high-resolution timestamp when available, otherwise falls back to Date.now().
 */
function getHighResTime(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Represents a single unit of work within a distributed trace.
 *
 * A span tracks the start time, end time, duration, status, and arbitrary
 * attributes of an operation. Spans can be nested via parentSpanId to form
 * a tree structure within a trace.
 */
export class Span {
  private data: SpanData;

  constructor(name: string, traceId: string, parentSpanId?: string) {
    this.data = {
      spanId: generateUUID(),
      traceId,
      parentSpanId,
      name,
      startTime: getHighResTime(),
      status: 'pending',
      attributes: {},
    };
  }

  /**
   * Sets a key-value attribute on this span.
   */
  setAttribute(key: string, value: any): void {
    this.data.attributes[key] = value;
  }

  /**
   * Ends the span, recording the end time and calculating duration.
   * Returns a frozen copy of the span data.
   */
  end(status: 'ok' | 'error' = 'ok'): SpanData {
    this.data.endTime = getHighResTime();
    this.data.duration = this.data.endTime - this.data.startTime;
    this.data.status = status;
    return { ...this.data, attributes: { ...this.data.attributes } };
  }

  /**
   * Returns a copy of the current span data without ending the span.
   */
  getData(): SpanData {
    return { ...this.data, attributes: { ...this.data.attributes } };
  }
}
