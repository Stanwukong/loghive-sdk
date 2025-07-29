// src/log-level-logic.ts
import { Monita } from './logger';
import { LogLevel } from './types';

/**
 * Log Level Decision Matrix for Auto-Generated Events
 * 
 * The log level is determined by:
 * 1. Severity/Impact of the event
 * 2. Actionability (can developer act on this?)
 * 3. Frequency (how often does this occur?)
 * 4. Business value (how important for monitoring?)
 */

export class LogLevelDecisionEngine {
  
  // ERROR EVENTS - Always LogLevel.ERROR
  public static getErrorLogLevel(error: Error | ErrorEvent): LogLevel {
    // All uncaught errors are serious and require immediate attention
    return LogLevel.ERROR;
    
    // Future enhancement: Could differentiate based on error type
    // if (error.name === 'NetworkError') return LogLevel.WARN;
    // if (error.name === 'SyntaxError') return LogLevel.ERROR;
    // if (error.message.includes('Script error')) return LogLevel.WARN; // CORS errors
  }

  // NETWORK EVENTS - Based on HTTP status
  public static getNetworkLogLevel(status?: number, duration?: number): LogLevel {
    if (!status) {
      return LogLevel.ERROR; // Network failure, no response
    }

    if (status >= 500) {
      return LogLevel.ERROR; // Server errors are critical
    }
    
    if (status >= 400) {
      return LogLevel.WARN;  // Client errors are warnings (might be expected)
    }

    // Performance-based escalation
    if (duration && duration > 5000) { // > 5 seconds
      return LogLevel.WARN; // Slow requests are concerning
    }

    return LogLevel.DEBUG; // Successful requests are debug info
  }

  // PERFORMANCE EVENTS - Based on metrics and thresholds
  public static getPerformanceLogLevel(perfEntry: any): LogLevel {
    const { type, duration, name } = perfEntry;

    switch (type) {
      case 'navigation':
        // Page load performance
        if (duration > 3000) return LogLevel.WARN;  // > 3s is concerning
        if (duration > 1000) return LogLevel.INFO;  // > 1s is noteworthy
        return LogLevel.DEBUG; // Fast loads are just debug info
        
      case 'paint':
        // First Paint, First Contentful Paint
        if (duration > 2000) return LogLevel.WARN;
        if (duration > 1000) return LogLevel.INFO;
        return LogLevel.DEBUG;
        
      case 'resource':
        // CSS, JS, Image loading
        if (duration > 3000) return LogLevel.WARN;  // Slow resource
        if (name.includes('.css') || name.includes('.js')) {
          // Critical resources get more attention
          if (duration > 1000) return LogLevel.INFO;
        }
        return LogLevel.DEBUG;
        
      case 'measure':
        // Custom performance marks
        return LogLevel.INFO; // Developer-defined, probably important
        
      default:
        return LogLevel.DEBUG;
    }
  }

  // USER INTERACTION EVENTS - Generally low priority
  public static getInteractionLogLevel(interactionType: string): LogLevel {
    switch (interactionType) {
      case 'click':
        return LogLevel.DEBUG; // Clicks are debug info for user journey
        
      case 'scroll':
        return LogLevel.TRACE; // Very frequent, lowest priority
        
      case 'keypress':
        return LogLevel.TRACE; // Very frequent, lowest priority
        
      case 'focus':
      case 'blur':
        return LogLevel.TRACE; // Form interactions, low priority
        
      default:
        return LogLevel.DEBUG;
    }
  }

  // CONSOLE EVENTS - Based on original console method
  public static getConsoleLogLevel(originalLevel: 'error' | 'warn' | 'log' | 'info'): LogLevel {
    // Map console methods to our log levels
    switch (originalLevel) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'log':
      case 'info':
        return LogLevel.INFO;
      default:
        return LogLevel.DEBUG;
    }
  }

  // PAGE VIEW EVENTS - Business important but not urgent
  public static getPageViewLogLevel(): LogLevel {
    return LogLevel.INFO; // Page views are important for analytics
  }

  // CUSTOM BUSINESS EVENTS - Based on event name/type
  public static getCustomEventLogLevel(eventName: string, properties?: any): LogLevel {
    // Business-critical events
    if (eventName.includes('purchase') || 
        eventName.includes('payment') || 
        eventName.includes('checkout')) {
      return LogLevel.INFO; // Business critical
    }

    // Error-related custom events
    if (eventName.includes('error') || 
        eventName.includes('fail') || 
        eventName.includes('exception')) {
      return LogLevel.ERROR;
    }

    // Warning-related events
    if (eventName.includes('warn') || 
        eventName.includes('timeout') || 
        eventName.includes('retry')) {
      return LogLevel.WARN;
    }

    // Default for custom events
    return LogLevel.INFO;
  }
}

// Enhanced auto-instrumentation with smart log levels
export class SmartAutoInstrumentation {
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  private logError(error: Error | ErrorEvent, context: any): void {
    const level = LogLevelDecisionEngine.getErrorLogLevel(error);
    
    this.logger._log(level, 'Uncaught Error', undefined, {
      eventType: 'error',
      error: this.extractErrorDetails(error),
      ...context,
    });
  }

  private logNetworkRequest(request: any): void {
    const level = LogLevelDecisionEngine.getNetworkLogLevel(
      request.status, 
      request.duration
    );
    
    const message = level === LogLevel.ERROR ? 'Network Request Failed' :
                   level === LogLevel.WARN ? 'Slow Network Request' :
                   'Network Request';
    
    this.logger._log(level, message, undefined, {
      eventType: 'network',
      network: request,
    });
  }

  private logPerformanceEntry(perfEntry: any): void {
    const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);
    
    const message = level === LogLevel.WARN ? `Slow ${perfEntry.type}` :
                   level === LogLevel.INFO ? `Performance ${perfEntry.type}` :
                   'Performance Entry';
    
    this.logger._log(level, message, undefined, {
      eventType: 'performance',
      performance: perfEntry,
    });
  }

  private logUserInteraction(interaction: any): void {
    const level = LogLevelDecisionEngine.getInteractionLogLevel(interaction.type);
    
    this.logger._log(level, `User ${interaction.type}`, undefined, {
      eventType: 'interaction',
      interaction,
    });
  }

  private logPageView(): void {
    const level = LogLevelDecisionEngine.getPageViewLogLevel();
    
    this.logger._log(level, 'Page View', undefined, {
      eventType: 'pageview',
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,
    });
  }

  private extractErrorDetails(error: Error | ErrorEvent): any {
    // Implementation details...
    return {};
  }
}

// Configuration-based level overrides
export interface AutoCaptureConfig {
  errors?: boolean;
  performance?: boolean;
  userInteractions?: boolean;
  networkRequests?: boolean;
  consoleMessages?: boolean;
  pageViews?: boolean;
  
  // NEW: Custom log level overrides
  logLevels?: {
    errors?: LogLevel;
    networkSuccess?: LogLevel;
    networkError?: LogLevel;
    performanceSlow?: LogLevel;
    performanceFast?: LogLevel;
    interactions?: LogLevel;
    pageViews?: LogLevel;
    console?: {
      error?: LogLevel;
      warn?: LogLevel;
      info?: LogLevel;
    };
  };
}

// Usage example with custom levels
const logger = new Monita({
  apiKey: 'key',
  projectId: 'project',
  minLogLevel: LogLevel.INFO, // This still applies to auto-generated logs
  
  autoCapture: {
    errors: true,
    networkRequests: true,
    performance: true,
    
    // Override default log levels
    logLevels: {
      networkSuccess: LogLevel.TRACE,    // Make successful requests very quiet
      performanceFast: LogLevel.TRACE,   // Fast performance entries are trace
      interactions: LogLevel.DEBUG,      // Keep interactions at debug
      pageViews: LogLevel.INFO,          // Page views remain info
      console: {
        error: LogLevel.FATAL,           // Escalate console errors
        warn: LogLevel.ERROR,            // Escalate console warnings
      }
    }
  }
});

// The minLogLevel still applies - if set to WARN, DEBUG and INFO auto-logs won't be sent
// This gives users control over the volume of auto-generated logs