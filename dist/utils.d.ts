import { LogLevel } from './types';
export declare const delay: (ms: number) => Promise<void>;
export declare const getExponentialBackoffDelay: (retryCount: number, initialDelayMs: number, maxDelayMs?: number) => number;
export declare const shouldLog: (currentLevel: LogLevel, minLevel: LogLevel) => boolean;
export declare const getElementSelector: (element: Element) => string;
export declare const sanitizeUrl: (url: string) => string;
export declare const isInBrowser: () => boolean;
/**
 * Extracts error details from various error types
 * Compatible with both browser and Node.js environments
 */
export declare function extractErrorDetails(error: any): {
    name: string;
    message: string;
    stack?: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
};
/**
 * Checks if we're running in a Node.js environment
 */
export declare function isNode(): boolean;
/**
 * Gets environment-specific information
 */
export declare function getEnvironmentInfo(): {
    runtime: 'browser' | 'node' | 'unknown';
    version?: string;
    userAgent?: string;
};
/**
 * Safely gets the current URL
 * Returns undefined in Node.js environments
 */
export declare function getCurrentUrl(): string | undefined;
/**
 * Safely gets the referrer
 * Returns undefined in Node.js environments
 */
export declare function getReferrer(): string | undefined;
/**
 * Generates a timestamp in ISO format
 */
export declare function getTimestamp(): string;
/**
 * Safely stringifies an object, handling circular references
 */
export declare function safeStringify(obj: any, space?: number): string;
/**
 * Validates if a string is a valid UUID
 */
export declare function isValidUUID(uuid: string): boolean;
/**
 * Truncates a string to a maximum length
 */
export declare function truncateString(str: string, maxLength: number): string;
/**
 * Debounce function for performance optimization
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
