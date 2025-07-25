"use strict";
/**
 * @file src/utils.ts
 * @description Contains utility functions for the RemoteLogger SDK.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractErrorDetails = exports.shouldLog = exports.getExponentialBackoffDelay = exports.delay = void 0;
const types_1 = require("./types");
/**
 * Delays execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to wait.
 * @returns A Promise that resolves after the specified delay.
 */
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.delay = delay;
/**
 * Calculates the delay for exponential backoff with jitter.
 * @param retryCount The current retry attempt count (0-indexed).
 * @param initialDelayMs The initial delay in milliseconds.
 * @param maxDelayMs The maximum delay in milliseconds.
 * @returns The calculated delay for the current retry attempt.
 */
const getExponentialBackoffDelay = (retryCount, initialDelayMs, maxDelayMs = 60000 // Cap at 1 minute
) => {
    const baseDelay = initialDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * baseDelay * 0.1; // Add up to 10% jitter
    return Math.min(baseDelay + jitter, maxDelayMs);
};
exports.getExponentialBackoffDelay = getExponentialBackoffDelay;
/**
 * Determines if a given log level should be processed based on the minimum log level.
 * @param currentLevel The level of the log being considered.
 * @param minLevel The minimum level configured for the logger.
 * @returns True if the current level is at or above the minimum level, false otherwise.
 */
const shouldLog = (currentLevel, minLevel) => {
    const levelOrder = {
        [types_1.LogLevel.TRACE]: 0,
        [types_1.LogLevel.DEBUG]: 1,
        [types_1.LogLevel.INFO]: 2,
        [types_1.LogLevel.WARN]: 3,
        [types_1.LogLevel.ERROR]: 4,
        [types_1.LogLevel.FATAL]: 5,
    };
    return levelOrder[currentLevel] >= levelOrder[minLevel];
};
exports.shouldLog = shouldLog;
/**
 * Extracts relevant information from an Error object.
 * @param error The Error object.
 * @returns An object containing the error's name, message, and stack trace.
 */
const extractErrorDetails = (error) => {
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
    };
};
exports.extractErrorDetails = extractErrorDetails;
