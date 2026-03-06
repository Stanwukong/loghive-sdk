// src/pattern-detector.ts

/**
 * PatternDetector — Client-side error pattern recognition.
 * Detects recurring errors and error spikes without any external API.
 */

export interface DetectedPattern {
  type: "recurring_error" | "error_spike";
  message: string;
  count: number;
  windowMs: number;
  detectedAt: string;
}

interface ErrorEntry {
  message: string;
  timestamp: number;
}

export class PatternDetector {
  private _errors: ErrorEntry[] = [];
  private _maxWindowSize: number;
  private _recurringThreshold: number;
  private _recurringWindowMs: number;
  private _spikeMultiplier: number;
  private _spikeShortWindowMs: number;
  private _spikeLongWindowMs: number;
  private _lastPatternEmit: Map<string, number> = new Map();
  private _throttleMs: number;

  constructor(options?: {
    maxWindowSize?: number;
    recurringThreshold?: number;
    recurringWindowMs?: number;
    spikeMultiplier?: number;
    spikeShortWindowMs?: number;
    spikeLongWindowMs?: number;
    throttleMs?: number;
  }) {
    this._maxWindowSize = options?.maxWindowSize ?? 100;
    this._recurringThreshold = options?.recurringThreshold ?? 3;
    this._recurringWindowMs = options?.recurringWindowMs ?? 5 * 60 * 1000; // 5 minutes
    this._spikeMultiplier = options?.spikeMultiplier ?? 3;
    this._spikeShortWindowMs = options?.spikeShortWindowMs ?? 60 * 1000; // 1 minute
    this._spikeLongWindowMs = options?.spikeLongWindowMs ?? 10 * 60 * 1000; // 10 minutes
    this._throttleMs = options?.throttleMs ?? 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Feed an error into the pattern detector.
   */
  recordError(message: string): void {
    const now = Date.now();
    this._errors.push({ message, timestamp: now });

    // Trim to max window size
    if (this._errors.length > this._maxWindowSize) {
      this._errors = this._errors.slice(-this._maxWindowSize);
    }
  }

  /**
   * Detect recurring errors — groups by message similarity,
   * flags groups with threshold+ occurrences in the window.
   */
  detectRecurringErrors(): DetectedPattern[] {
    const now = Date.now();
    const cutoff = now - this._recurringWindowMs;
    const recent = this._errors.filter((e) => e.timestamp >= cutoff);

    // Group by normalized message (first 80 chars)
    const groups = new Map<string, number>();
    for (const entry of recent) {
      const key = entry.message.slice(0, 80);
      groups.set(key, (groups.get(key) || 0) + 1);
    }

    const patterns: DetectedPattern[] = [];
    for (const [msg, count] of groups) {
      if (count >= this._recurringThreshold) {
        patterns.push({
          type: "recurring_error",
          message: msg,
          count,
          windowMs: this._recurringWindowMs,
          detectedAt: new Date(now).toISOString(),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect error spike — compares last-minute error count
   * against rolling 10-minute average, flags if > multiplier.
   */
  detectErrorSpike(): DetectedPattern | null {
    const now = Date.now();
    const shortCutoff = now - this._spikeShortWindowMs;
    const longCutoff = now - this._spikeLongWindowMs;

    const shortCount = this._errors.filter((e) => e.timestamp >= shortCutoff).length;
    const longErrors = this._errors.filter((e) => e.timestamp >= longCutoff);

    // Average per short window over the long window
    const longWindowCount = Math.max(longErrors.length, 1);
    const windowsInLong = this._spikeLongWindowMs / this._spikeShortWindowMs;
    const avgPerShortWindow = longWindowCount / windowsInLong;

    if (shortCount > avgPerShortWindow * this._spikeMultiplier && shortCount >= 3) {
      return {
        type: "error_spike",
        message: `${shortCount} errors in the last ${Math.round(this._spikeShortWindowMs / 1000)}s (${this._spikeMultiplier}x above average)`,
        count: shortCount,
        windowMs: this._spikeShortWindowMs,
        detectedAt: new Date(now).toISOString(),
      };
    }

    return null;
  }

  /**
   * Run all detectors and return patterns that haven't been emitted recently.
   */
  getPatterns(): DetectedPattern[] {
    const now = Date.now();
    const allPatterns: DetectedPattern[] = [];

    // Recurring errors
    const recurring = this.detectRecurringErrors();
    allPatterns.push(...recurring);

    // Error spike
    const spike = this.detectErrorSpike();
    if (spike) {
      allPatterns.push(spike);
    }

    // Throttle: only emit each pattern key once per throttle window
    const newPatterns: DetectedPattern[] = [];
    for (const pattern of allPatterns) {
      const key = `${pattern.type}:${pattern.message.slice(0, 40)}`;
      const lastEmit = this._lastPatternEmit.get(key) || 0;
      if (now - lastEmit >= this._throttleMs) {
        this._lastPatternEmit.set(key, now);
        newPatterns.push(pattern);
      }
    }

    return newPatterns;
  }

  /**
   * Clear all tracked errors and pattern history.
   */
  reset(): void {
    this._errors = [];
    this._lastPatternEmit.clear();
  }
}
