// src/breadcrumb-manager.ts

export interface Breadcrumb {
  timestamp: number;
  category: 'ui' | 'navigation' | 'network' | 'console' | 'custom';
  message: string;
  data?: Record<string, any>;
  level: 'debug' | 'info' | 'warning' | 'error';
}

export interface EnvironmentSnapshot {
  url: string;
  referrer: string;
  viewport: { width: number; height: number };
  scrollPosition: { x: number; y: number };
  networkState: { online: boolean; connectionType?: string };
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  timestamp: number;
}

export class BreadcrumbManager {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(maxBreadcrumbs: number = 50) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  /**
   * Add a breadcrumb to the trail.
   * If the trail exceeds maxBreadcrumbs, the oldest entry is removed.
   */
  add(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Returns a shallow copy of all breadcrumbs.
   */
  getAll(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clears all breadcrumbs.
   */
  clear(): void {
    this.breadcrumbs = [];
  }

  /**
   * Captures a snapshot of the current browser environment.
   * Gracefully handles missing APIs (e.g., navigator.connection, performance.memory).
   */
  captureEnvironment(): EnvironmentSnapshot {
    const snapshot: EnvironmentSnapshot = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      scrollPosition: {
        x: typeof window !== 'undefined' ? window.scrollX : 0,
        y: typeof window !== 'undefined' ? window.scrollY : 0,
      },
      networkState: {
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      },
      timestamp: Date.now(),
    };

    // navigator.connection is non-standard (Network Information API)
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      snapshot.networkState.connectionType = (navigator as any).connection.effectiveType;
    }

    // performance.memory is a Chrome-only non-standard API
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      snapshot.memory = {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      };
    }

    return snapshot;
  }
}
