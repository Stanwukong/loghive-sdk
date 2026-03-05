// src/remote-config.ts

/**
 * Remote Configuration Manager
 *
 * Fetches SDK configuration from the backend at a configurable interval,
 * allowing runtime adjustments to logging behaviour without redeploying
 * the client application.
 *
 * Uses the native `fetch` API (not axios) to avoid circular dependency
 * issues with the logger module.
 */

import { LogLevel } from './types';

export interface RemoteConfigOptions {
  /** Enable remote configuration fetching. @default false */
  enabled?: boolean;
  /** Interval in milliseconds between config refreshes. @default 300000 (5 min) */
  refreshIntervalMs?: number;
  /** Override the config endpoint URL. Defaults to `${baseEndpoint}/sdk-config/${projectId}` */
  endpoint?: string;
  /** Called whenever a new configuration is successfully fetched. */
  onConfigUpdate?: (config: RemoteSDKConfig) => void;
}

export interface RemoteSDKConfig {
  minLogLevel?: LogLevel;
  batchSize?: number;
  flushIntervalMs?: number;
  autoCapture?: {
    errors?: boolean;
    performance?: boolean;
    userInteractions?: boolean;
    networkRequests?: boolean;
    consoleMessages?: boolean;
    pageViews?: boolean;
  };
  sanitization?: {
    preset?: 'STRICT' | 'BALANCED' | 'LENIENT';
  };
}

export class RemoteConfigManager {
  private projectId: string;
  private apiKey: string;
  private baseEndpoint: string;
  private options: Required<Pick<RemoteConfigOptions, 'enabled' | 'refreshIntervalMs'>> &
    Omit<RemoteConfigOptions, 'enabled' | 'refreshIntervalMs'>;
  private lastConfig: RemoteSDKConfig | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private applyCallback: ((config: RemoteSDKConfig) => void) | null = null;

  constructor(
    projectId: string,
    apiKey: string,
    baseEndpoint: string,
    options: RemoteConfigOptions = {}
  ) {
    this.projectId = projectId;
    this.apiKey = apiKey;
    this.baseEndpoint = baseEndpoint;
    this.options = {
      enabled: options.enabled ?? false,
      refreshIntervalMs: options.refreshIntervalMs ?? 300_000,
      endpoint: options.endpoint,
      onConfigUpdate: options.onConfigUpdate,
    };
  }

  /**
   * Registers a callback that the logger uses to apply fetched configuration.
   */
  public setApplyCallback(callback: (config: RemoteSDKConfig) => void): void {
    this.applyCallback = callback;
  }

  /**
   * Fetch the remote SDK configuration from the backend.
   *
   * Returns the parsed config on success, or `null` on any failure.
   * Failures are logged as warnings but never thrown.
   */
  public async fetchConfig(): Promise<RemoteSDKConfig | null> {
    const url = this.getEndpoint();

    try {
      if (typeof fetch === 'undefined') {
        console.warn('[Monita RemoteConfig] fetch API is not available in this environment.');
        return null;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(
          `[Monita RemoteConfig] Config fetch failed with status ${response.status}.`
        );
        return null;
      }

      const body = await response.json();

      // The backend may wrap the config in a `data` envelope or return it at the top level.
      const config: RemoteSDKConfig = body?.data ?? body;

      this.lastConfig = config;

      // Notify listeners
      this.options.onConfigUpdate?.(config);
      this.applyCallback?.(config);

      return config;
    } catch (error) {
      console.warn('[Monita RemoteConfig] Failed to fetch remote config:', error);
      return null;
    }
  }

  /**
   * Begin polling the backend for config updates at the configured interval.
   * Performs an initial fetch immediately.
   */
  public startPeriodicRefresh(): void {
    if (!this.options.enabled) {
      return;
    }

    // Stop any existing timer before starting a new one
    this.stopPeriodicRefresh();

    // Initial fetch
    this.fetchConfig();

    this.refreshTimer = setInterval(() => {
      this.fetchConfig();
    }, this.options.refreshIntervalMs);
  }

  /**
   * Stop the periodic refresh timer.
   */
  public stopPeriodicRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Returns the most recently fetched config, or `null` if none has been fetched yet.
   */
  public getLastConfig(): RemoteSDKConfig | null {
    return this.lastConfig;
  }

  /**
   * Clean up all resources held by the manager.
   */
  public destroy(): void {
    this.stopPeriodicRefresh();
    this.lastConfig = null;
    this.applyCallback = null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getEndpoint(): string {
    if (this.options.endpoint) {
      return this.options.endpoint;
    }
    return `${this.baseEndpoint}/sdk-config/${this.projectId}`;
  }
}
