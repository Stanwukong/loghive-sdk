import type { eventWithTime } from '@rrweb/types';

export interface ReplayConfig {
  enabled: boolean;
  maskAllText?: boolean;
  maskAllInputs?: boolean;
  blockSelector?: string;
  ignoreSelector?: string;
  maxDurationMs?: number;
  batchSize?: number;
  flushIntervalMs?: number;
  sampling?: {
    mousemove?: boolean | number;
    mouseInteraction?: boolean;
    scroll?: number;
    media?: number;
    input?: 'last' | 'all';
  };
}

const DEFAULTS = {
  maskAllText: true,
  maskAllInputs: true,
  maxDurationMs: 10 * 60 * 1000, // 10 minutes
  batchSize: 50,
  flushIntervalMs: 10_000, // 10 seconds
};

export class ReplayRecorder {
  private _buffer: eventWithTime[] = [];
  private _stopFn: (() => void) | null = null;
  private _flushTimer: ReturnType<typeof setInterval> | null = null;
  private _maxTimer: ReturnType<typeof setTimeout> | null = null;
  private _config: Required<Pick<ReplayConfig, 'maskAllText' | 'maskAllInputs' | 'maxDurationMs' | 'batchSize' | 'flushIntervalMs'>> & ReplayConfig;
  private _onFlush: (events: eventWithTime[]) => void;
  private _recording = false;

  constructor(config: ReplayConfig, onFlush: (events: eventWithTime[]) => void) {
    this._config = { ...DEFAULTS, ...config };
    this._onFlush = onFlush;
  }

  async start(): Promise<void> {
    if (this._recording) return;
    if (typeof window === 'undefined') return;

    // Dynamic import -- rrweb only loaded when replay is enabled
    const rrweb = await import('rrweb');
    const recordFn = rrweb.record;

    // Build rrweb record options
    const opts: Record<string, unknown> = {
      emit: (event: eventWithTime) => {
        this._buffer.push(event);
        if (this._buffer.length >= this._config.batchSize) {
          this.flush();
        }
      },
      maskAllInputs: this._config.maskAllInputs,
      blockSelector: this._config.blockSelector ?? undefined,
    };

    // Apply text masking: rrweb uses maskTextSelector, not maskAllText
    if (this._config.maskAllText) {
      opts.maskTextSelector = '*';
    }

    // Apply ignoreSelector via ignoreClass (rrweb uses ignoreClass, not ignoreSelector)
    if (this._config.ignoreSelector) {
      opts.ignoreClass = this._config.ignoreSelector;
    }

    // Map sampling config to rrweb SamplingStrategy
    if (this._config.sampling) {
      opts.sampling = {
        mousemove: this._config.sampling.mousemove,
        scroll: this._config.sampling.scroll,
        media: this._config.sampling.media,
        input: this._config.sampling.input,
      };
    }

    this._stopFn = recordFn(opts as any) || null;
    this._recording = true;

    // Periodic flush
    this._flushTimer = setInterval(() => this.flush(), this._config.flushIntervalMs);

    // Max duration auto-stop
    this._maxTimer = setTimeout(() => this.stop(), this._config.maxDurationMs);
  }

  flush(): void {
    if (this._buffer.length === 0) return;
    const events = this._buffer.splice(0);
    this._onFlush(events);
  }

  stop(): void {
    if (!this._recording) return;
    this._recording = false;

    if (this._stopFn) {
      this._stopFn();
      this._stopFn = null;
    }
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
    if (this._maxTimer) {
      clearTimeout(this._maxTimer);
      this._maxTimer = null;
    }

    // Final flush
    this.flush();
  }

  get isRecording(): boolean {
    return this._recording;
  }
}
