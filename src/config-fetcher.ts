export interface RemoteConfig {
  minLogLevel?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  environment?: string;
  serviceName?: string;
  autoCapture?: {
    errors?: boolean;
    performance?: boolean;
    userInteractions?: boolean;
    networkRequests?: boolean;
    consoleMessages?: boolean;
    pageViews?: boolean;
  };
  sanitization?: {
    enabled?: boolean;
    strictMode?: "STRICT" | "BALANCED" | "LENIENT";
    presetConfig?: {
      auditEnabled?: boolean;
      anonymizationEnabled?: boolean;
      sensitiveFields?: string[];
      retentionPolicy?: {
        maxAge?: number;
        maxSize?: number;
        autoDelete?: boolean;
        archiveBeforeDelete?: boolean;
      };
    };
    customRules?: Array<{
      pattern: string;
      replacement: string;
      description: string;
      severity?: string;
      category?: string;
    }>;
  };
}

export class ConfigFetcher {
  private cache: RemoteConfig | null = null;
  private lastFetch: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    private endpoint: string,
    private apiKey: string,
    private projectId: string
  ) {}

  async fetch(): Promise<RemoteConfig> {
    const now = Date.now();
    if (this.cache && now - this.lastFetch < this.cacheDuration) {
      return this.cache;
    }

    try {
      const response = await fetch(
        `${this.endpoint}/${this.projectId}/config`,
        {
          headers: { "X-API-Key": this.apiKey },
        }
      );

      if (response.ok) {
        const config = await response.json();
        this.cache = config;
        this.lastFetch = now;
        return config;
      }
    } catch (error) {
      console.warn("Failed to fetch remote config, using cached/defaults");
    }

    return this.cache || {};
  }
}
