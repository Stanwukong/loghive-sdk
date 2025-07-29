/**
 * @file src/utils.ts
 * @description Contains utility functions for the Monita SDK.
 */
import { LogLevel } from './types';
/**
 * Delays execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to wait.
 * @returns A Promise that resolves after the specified delay.
 */
export declare const delay: (ms: number) => Promise<void>;
/**
 * Calculates the delay for exponential backoff with jitter.
 * @param retryCount The current retry attempt count (0-indexed).
 * @param initialDelayMs The initial delay in milliseconds.
 * @param maxDelayMs The maximum delay in milliseconds.
 * @returns The calculated delay for the current retry attempt.
 */
export declare const getExponentialBackoffDelay: (retryCount: number, initialDelayMs: number, maxDelayMs?: number) => number;
/**
 * Determines if a given log level should be processed based on the minimum log level.
 * @param currentLevel The level of the log being considered.
 * @param minLevel The minimum level configured for the logger.
 * @returns True if the current level is at or above the minimum level, false otherwise.
 */
export declare const shouldLog: (currentLevel: LogLevel, minLevel: LogLevel) => boolean;
/**
 * Extracts relevant information from an Error object.
 * @param error The Error object.
 * @returns An object containing the error's name, message, and stack trace.
 */
export declare const extractErrorDetails: (error: Error) => {
    name: string;
    message: string;
    stack?: string;
};
