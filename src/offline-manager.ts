// src/offline-manager.ts

/**
 * Offline Manager
 *
 * Provides in-memory offline log queuing for the Apperio SDK.
 * When the browser goes offline, logs are enqueued and automatically
 * flushed when connectivity is restored.
 *
 * IMPORTANT: Uses in-memory storage ONLY. No localStorage, sessionStorage,
 * or IndexedDB per SDK constraints.
 */

import { LogEntry, LogLevel } from './types';
import { isInBrowser } from './utils';

export interface OfflineManagerConfig {
  /** Maximum number of logs to hold in the offline queue. @default 500 */
  maxQueueSize?: number;
  /** When queue is full, prefer keeping ERROR/FATAL logs over lower-severity ones. @default true */
  prioritizeCritical?: boolean;
  /** Called after a successful sync of queued logs. */
  onSyncComplete?: (count: number) => void;
  /** Called when the browser transitions to offline. */
  onOffline?: () => void;
  /** Called when the browser transitions to online. */
  onOnline?: () => void;
}

/** Severity levels considered "critical" for prioritization purposes. */
const CRITICAL_LEVELS: Set<string> = new Set([LogLevel.ERROR, LogLevel.FATAL]);

export class OfflineManager {
  private config: Required<Pick<OfflineManagerConfig, 'maxQueueSize' | 'prioritizeCritical'>> &
    Omit<OfflineManagerConfig, 'maxQueueSize' | 'prioritizeCritical'>;
  private queue: LogEntry[] = [];
  private _isOnline: boolean = true;
  private flushCallback: ((logs: LogEntry[]) => Promise<void>) | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  private _isFlushing: boolean = false;

  constructor(config: OfflineManagerConfig = {}) {
    this.config = {
      maxQueueSize: config.maxQueueSize ?? 500,
      prioritizeCritical: config.prioritizeCritical ?? true,
      onSyncComplete: config.onSyncComplete,
      onOffline: config.onOffline,
      onOnline: config.onOnline,
    };

    // Determine initial online state
    if (isInBrowser() && typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      this._isOnline = navigator.onLine;
    }

    // Setup event listeners only in browser environments
    if (isInBrowser()) {
      this.setupListeners();
    }
  }

  /**
   * Returns the current online status.
   */
  public isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Registers the callback that sends queued logs through the logger's pipeline.
   * Must be called before logs can be flushed.
   */
  public setFlushCallback(callback: (logs: LogEntry[]) => Promise<void>): void {
    this.flushCallback = callback;
  }

  /**
   * Enqueue a log entry for later transmission.
   *
   * When the queue is full:
   * - If `prioritizeCritical` is enabled, the first non-critical (non ERROR/FATAL)
   *   log is found and evicted to make room. If all entries are critical, the oldest
   *   entry is dropped.
   * - Otherwise, the oldest entry is dropped unconditionally.
   */
  public enqueue(log: LogEntry): void {
    if (this.queue.length >= this.config.maxQueueSize) {
      if (this.config.prioritizeCritical) {
        // Find the first non-critical log to evict
        const evictIndex = this.queue.findIndex(
          (entry) => !CRITICAL_LEVELS.has(entry.level)
        );

        if (evictIndex !== -1) {
          this.queue.splice(evictIndex, 1);
        } else {
          // All entries are critical; drop the oldest one
          this.queue.shift();
        }
      } else {
        // Drop the oldest entry
        this.queue.shift();
      }
    }

    this.queue.push(log);
  }

  /**
   * Returns the number of logs currently queued.
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Flush all queued logs through the registered flush callback.
   * Called automatically when the browser comes back online.
   *
   * On flush failure, logs are re-queued (up to maxQueueSize).
   */
  public async flushOfflineQueue(): Promise<void> {
    if (this._isFlushing || this.queue.length === 0 || !this.flushCallback) {
      return;
    }

    this._isFlushing = true;

    // Take a snapshot and clear the queue
    const logsToFlush = [...this.queue];
    this.queue = [];

    try {
      await this.flushCallback(logsToFlush);
      this.config.onSyncComplete?.(logsToFlush.length);
    } catch (error) {
      // Flush failed: re-queue the logs respecting the size cap
      console.warn(
        `[Apperio OfflineManager] Failed to flush ${logsToFlush.length} queued logs. Re-queuing.`
      );

      // Prepend the failed logs back, then trim to maxQueueSize
      const combined = [...logsToFlush, ...this.queue];
      this.queue = combined.slice(0, this.config.maxQueueSize);

      if (combined.length > this.config.maxQueueSize) {
        console.warn(
          `[Apperio OfflineManager] Dropped ${combined.length - this.config.maxQueueSize} logs due to queue overflow during re-queue.`
        );
      }
    } finally {
      this._isFlushing = false;
    }
  }

  /**
   * Tear down listeners and clear internal state.
   */
  public destroy(): void {
    if (isInBrowser()) {
      if (this.onlineHandler) {
        window.removeEventListener('online', this.onlineHandler);
        this.onlineHandler = null;
      }
      if (this.offlineHandler) {
        window.removeEventListener('offline', this.offlineHandler);
        this.offlineHandler = null;
      }
    }

    this.queue = [];
    this.flushCallback = null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private setupListeners(): void {
    this.onlineHandler = () => {
      this._isOnline = true;
      this.config.onOnline?.();
      this.flushOfflineQueue();
    };

    this.offlineHandler = () => {
      this._isOnline = false;
      this.config.onOffline?.();
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }
}
