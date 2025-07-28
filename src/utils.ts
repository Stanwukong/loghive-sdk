// src/utils.ts
import { LogLevel } from './types';

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const getExponentialBackoffDelay = (
  retryCount: number,
  initialDelayMs: number,
  maxDelayMs: number = 60000
): number => {
  const baseDelay = initialDelayMs * Math.pow(2, retryCount);
  const jitter = Math.random() * baseDelay * 0.1;
  return Math.min(baseDelay + jitter, maxDelayMs);
};

export const shouldLog = (currentLevel: LogLevel, minLevel: LogLevel): boolean => {
  const levelOrder: Record<LogLevel, number> = {
    [LogLevel.TRACE]: 0,
    [LogLevel.DEBUG]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.WARN]: 3,
    [LogLevel.ERROR]: 4,
    [LogLevel.FATAL]: 5,
  };

  return levelOrder[currentLevel] >= levelOrder[minLevel];
};

export const extractErrorDetails = (error: Error | ErrorEvent): { 
  name: string; 
  message: string; 
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
} => {
  if (error instanceof ErrorEvent) {
    return {
      name: 'ErrorEvent',
      message: error.message,
      url: error.filename,
      lineNumber: error.lineno,
      columnNumber: error.colno,
    };
  }
  
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
};

export const getElementSelector = (element: Element): string => {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    const classes = element.className.toString().split(' ').filter(c => c);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }
  
  return element.tagName.toLowerCase();
};

export const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'password', 'secret', 'api_key'];
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.toString();
  } catch {
    return url;
  }
};

export const isInBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};