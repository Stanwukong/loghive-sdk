/**
 * @file src/utils.ts
 * @description Contains utility functions for the RemoteLogger SDK.
 */

import { LogLevel } from './types';

/**
 * Delays execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to wait.
 * @returns A Promise that resolves after the specified delay.
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculates the delay for exponential backoff with jitter.
 * @param retryCount The current retry attempt count (0-indexed).
 * @param initialDelayMs The initial delay in milliseconds.
 * @param maxDelayMs The maximum delay in milliseconds.
 * @returns The calculated delay for the current retry attempt.
 */
export const getExponentialBackoffDelay = (
  retryCount: number,
  initialDelayMs: number,
  maxDelayMs: number = 60000 // Cap at 1 minute
): number => {
  const baseDelay = initialDelayMs * Math.pow(2, retryCount);
  const jitter = Math.random() * baseDelay * 0.1; // Add up to 10% jitter
  return Math.min(baseDelay + jitter, maxDelayMs);
};

/**
 * Determines if a given log level should be processed based on the minimum log level.
 * @param currentLevel The level of the log being considered.
 * @param minLevel The minimum level configured for the logger.
 * @returns True if the current level is at or above the minimum level, false otherwise.
 */
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

/**
 * Extracts relevant information from an Error object.
 * @param error The Error object.
 * @returns An object containing the error's name, message, and stack trace.
 */
export const extractErrorDetails = (error: Error): { name: string; message: string; stack?: string } => {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
};
