// src/health-metrics.ts

/**
 * SDK Health Metrics
 *
 * Tracks internal SDK performance and reliability metrics
 * for monitoring and debugging purposes.
 */

export interface HealthMetrics {
  // Buffer metrics
  logsBuffered: number;
  logsFlushed: number;
  logsDropped: number;
  logsRetried: number;
  bufferHighWatermark: number;
  currentBufferSize: number;

  // Flush metrics
  totalFlushes: number;
  successfulFlushes: number;
  failedFlushes: number;
  flushSuccessRate: number; // Percentage

  // Performance metrics
  averageFlushDurationMs: number;
  minFlushDurationMs: number;
  maxFlushDurationMs: number;
  totalFlushDurationMs: number;

  // Circuit breaker metrics
  circuitBreakerState: string;
  circuitBreakerStateChanges: number;
  circuitBreakerOpenCount: number;
  circuitBreakerHalfOpenCount: number;

  // Sanitization metrics
  sanitizationOperations: number;
  piiPatternsDetected: number;

  // Timestamps
  sdkInitializedAt: Date;
  lastFlushAt?: Date;
  lastSuccessfulFlushAt?: Date;
  uptime: number; // Seconds

  // Error tracking
  lastError?: {
    message: string;
    timestamp: Date;
    count: number; // Number of times this error occurred
  };
}

export class HealthMetricsCollector {
  private metrics: HealthMetrics;
  private flushDurations: number[] = [];
  private errorCounts: Map<string, number> = new Map();

  constructor() {
    this.metrics = {
      logsBuffered: 0,
      logsFlushed: 0,
      logsDropped: 0,
      logsRetried: 0,
      bufferHighWatermark: 0,
      currentBufferSize: 0,

      totalFlushes: 0,
      successfulFlushes: 0,
      failedFlushes: 0,
      flushSuccessRate: 100,

      averageFlushDurationMs: 0,
      minFlushDurationMs: 0,
      maxFlushDurationMs: 0,
      totalFlushDurationMs: 0,

      circuitBreakerState: "CLOSED",
      circuitBreakerStateChanges: 0,
      circuitBreakerOpenCount: 0,
      circuitBreakerHalfOpenCount: 0,

      sanitizationOperations: 0,
      piiPatternsDetected: 0,

      sdkInitializedAt: new Date(),
      uptime: 0,
    };
  }

  /**
   * Record a log being added to the buffer
   */
  public recordLogBuffered(): void {
    this.metrics.logsBuffered++;
    this.metrics.currentBufferSize++;
    this.updateBufferHighWatermark(this.metrics.currentBufferSize);
  }

  /**
   * Record logs being flushed
   */
  public recordLogsFlushed(count: number): void {
    this.metrics.logsFlushed += count;
    this.metrics.currentBufferSize = Math.max(
      0,
      this.metrics.currentBufferSize - count
    );
  }

  /**
   * Record a log being dropped (buffer full)
   */
  public recordLogDropped(): void {
    this.metrics.logsDropped++;
  }

  /**
   * Record a log being retried
   */
  public recordLogRetried(): void {
    this.metrics.logsRetried++;
  }

  /**
   * Update buffer high watermark
   */
  private updateBufferHighWatermark(currentSize: number): void {
    if (currentSize > this.metrics.bufferHighWatermark) {
      this.metrics.bufferHighWatermark = currentSize;
    }
  }

  /**
   * Record a flush attempt
   */
  public recordFlushStart(): number {
    this.metrics.totalFlushes++;
    return Date.now();
  }

  /**
   * Record a successful flush
   */
  public recordFlushSuccess(startTime: number): void {
    this.metrics.successfulFlushes++;
    this.metrics.lastSuccessfulFlushAt = new Date();
    this.recordFlushDuration(startTime);
    this.updateFlushSuccessRate();
  }

  /**
   * Record a failed flush
   */
  public recordFlushFailure(error: Error): void {
    this.metrics.failedFlushes++;
    this.updateFlushSuccessRate();
    this.recordError(error);
  }

  /**
   * Record flush duration
   */
  private recordFlushDuration(startTime: number): void {
    const duration = Date.now() - startTime;
    this.flushDurations.push(duration);

    // Keep only last 100 flush durations to avoid memory growth
    if (this.flushDurations.length > 100) {
      this.flushDurations.shift();
    }

    this.metrics.totalFlushDurationMs += duration;
    this.metrics.averageFlushDurationMs =
      this.metrics.totalFlushDurationMs / this.metrics.totalFlushes;

    if (
      this.metrics.minFlushDurationMs === 0 ||
      duration < this.metrics.minFlushDurationMs
    ) {
      this.metrics.minFlushDurationMs = duration;
    }

    if (duration > this.metrics.maxFlushDurationMs) {
      this.metrics.maxFlushDurationMs = duration;
    }

    this.metrics.lastFlushAt = new Date();
  }

  /**
   * Update flush success rate
   */
  private updateFlushSuccessRate(): void {
    if (this.metrics.totalFlushes === 0) {
      this.metrics.flushSuccessRate = 100;
      return;
    }

    this.metrics.flushSuccessRate =
      (this.metrics.successfulFlushes / this.metrics.totalFlushes) * 100;
  }

  /**
   * Record circuit breaker state change
   */
  public recordCircuitBreakerStateChange(newState: string): void {
    this.metrics.circuitBreakerState = newState;
    this.metrics.circuitBreakerStateChanges++;

    if (newState === "OPEN") {
      this.metrics.circuitBreakerOpenCount++;
    } else if (newState === "HALF_OPEN") {
      this.metrics.circuitBreakerHalfOpenCount++;
    }
  }

  /**
   * Record sanitization operation
   */
  public recordSanitization(piiDetected: boolean): void {
    this.metrics.sanitizationOperations++;
    if (piiDetected) {
      this.metrics.piiPatternsDetected++;
    }
  }

  /**
   * Record an error
   */
  private recordError(error: Error): void {
    const message = error.message;
    const count = (this.errorCounts.get(message) || 0) + 1;
    this.errorCounts.set(message, count);

    this.metrics.lastError = {
      message,
      timestamp: new Date(),
      count,
    };
  }

  /**
   * Update current buffer size (called externally)
   */
  public updateBufferSize(size: number): void {
    this.metrics.currentBufferSize = size;
    this.updateBufferHighWatermark(size);
  }

  /**
   * Get current health metrics snapshot
   */
  public getMetrics(): HealthMetrics {
    // Update uptime
    const now = Date.now();
    const initTime = this.metrics.sdkInitializedAt.getTime();
    this.metrics.uptime = Math.floor((now - initTime) / 1000);

    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    this.flushDurations = [];
    this.errorCounts.clear();
    this.metrics = {
      logsBuffered: 0,
      logsFlushed: 0,
      logsDropped: 0,
      logsRetried: 0,
      bufferHighWatermark: 0,
      currentBufferSize: 0,

      totalFlushes: 0,
      successfulFlushes: 0,
      failedFlushes: 0,
      flushSuccessRate: 100,

      averageFlushDurationMs: 0,
      minFlushDurationMs: 0,
      maxFlushDurationMs: 0,
      totalFlushDurationMs: 0,

      circuitBreakerState: "CLOSED",
      circuitBreakerStateChanges: 0,
      circuitBreakerOpenCount: 0,
      circuitBreakerHalfOpenCount: 0,

      sanitizationOperations: 0,
      piiPatternsDetected: 0,

      sdkInitializedAt: new Date(),
      uptime: 0,
    };
  }

  /**
   * Get a human-readable health summary
   */
  public getHealthSummary(): string {
    const metrics = this.getMetrics();

    return `
Monita SDK Health Metrics
==========================
Uptime: ${metrics.uptime}s
Buffer: ${metrics.currentBufferSize} logs (peak: ${metrics.bufferHighWatermark})

Logs:
  Buffered: ${metrics.logsBuffered}
  Flushed: ${metrics.logsFlushed}
  Dropped: ${metrics.logsDropped}
  Retried: ${metrics.logsRetried}

Flushes:
  Total: ${metrics.totalFlushes}
  Success Rate: ${metrics.flushSuccessRate.toFixed(2)}%
  Avg Duration: ${metrics.averageFlushDurationMs.toFixed(2)}ms
  Min/Max: ${metrics.minFlushDurationMs}ms / ${metrics.maxFlushDurationMs}ms

Circuit Breaker:
  State: ${metrics.circuitBreakerState}
  State Changes: ${metrics.circuitBreakerStateChanges}
  Times Opened: ${metrics.circuitBreakerOpenCount}

Sanitization:
  Operations: ${metrics.sanitizationOperations}
  PII Detected: ${metrics.piiPatternsDetected}

${metrics.lastError ? `Last Error: ${metrics.lastError.message} (occurred ${metrics.lastError.count} times)` : "No errors"}
    `.trim();
  }
}
