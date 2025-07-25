import { LogEntry, LogLevel } from './types';
import { DEFAULT_ENDPOINT } from './config';

export interface RemoteLoggerOptions {
  apiKey: string;
  source?: string;
  endpoint?: string;
}

export class RemoteLogger {
  private apiKey: string;
  private source?: string;
  private endpoint: string;

  constructor(options: RemoteLoggerOptions) {
    if (!options.apiKey) throw new Error("API key is required");

    this.apiKey = options.apiKey;
    this.source = options.source || 'custom-client';
    this.endpoint = options.endpoint || DEFAULT_ENDPOINT;
  }

  /**
   * Send a log entry to the RemoteLogger API
   */
  async log(entry: LogEntry) {
    const payload = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      source: this.source,
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to send log: ${err}`);
    }

    return await response.json();
  }

  /**
   * Helper methods
   */
  info(message: string, metadata?: object) {
    return this.log({ message, level: 'info' as LogLevel, metadata });
  }

  warn(message: string, metadata?: object) {
    return this.log({ message, level: 'warn' as LogLevel, metadata });
  }

  error(message: string, metadata?: object) {
    return this.log({ message, level: 'error' as LogLevel, metadata });
  }

  debug(message: string, metadata?: object) {
    return this.log({ message, level: 'debug' as LogLevel, metadata });
  }
}
