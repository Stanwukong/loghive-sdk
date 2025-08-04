"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInBrowser = exports.sanitizeUrl = exports.getElementSelector = exports.shouldLog = exports.getExponentialBackoffDelay = exports.delay = void 0;
exports.extractErrorDetails = extractErrorDetails;
exports.isNode = isNode;
exports.getEnvironmentInfo = getEnvironmentInfo;
exports.getCurrentUrl = getCurrentUrl;
exports.getReferrer = getReferrer;
exports.getTimestamp = getTimestamp;
exports.safeStringify = safeStringify;
exports.isValidUUID = isValidUUID;
exports.truncateString = truncateString;
exports.debounce = debounce;
// src/utils.ts
const types_1 = require("./types");
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.delay = delay;
const getExponentialBackoffDelay = (retryCount, initialDelayMs, maxDelayMs = 60000) => {
    const baseDelay = initialDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * baseDelay * 0.1;
    return Math.min(baseDelay + jitter, maxDelayMs);
};
exports.getExponentialBackoffDelay = getExponentialBackoffDelay;
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
const getElementSelector = (element) => {
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
exports.getElementSelector = getElementSelector;
const sanitizeUrl = (url) => {
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
    }
    catch {
        return url;
    }
};
exports.sanitizeUrl = sanitizeUrl;
const isInBrowser = () => {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
};
exports.isInBrowser = isInBrowser;
/**
 * Extracts error details from various error types
 * Compatible with both browser and Node.js environments
 */
function extractErrorDetails(error) {
    var _a;
    // Handle null/undefined
    if (!error) {
        return {
            name: 'UnknownError',
            message: 'Unknown error occurred'
        };
    }
    // Handle string errors
    if (typeof error === 'string') {
        return {
            name: 'StringError',
            message: error
        };
    }
    // Handle standard Error objects (works in both browser and Node.js)
    if (error instanceof Error) {
        const result = {
            name: error.name || 'Error',
            message: error.message || 'Unknown error',
        };
        // Add stack trace if available
        if (error.stack) {
            result.stack = error.stack;
        }
        return result;
    }
    // Handle browser-specific ErrorEvent (only available in browser)
    if (typeof ErrorEvent !== 'undefined' && error instanceof ErrorEvent) {
        return {
            name: 'ErrorEvent',
            message: error.message || 'Unknown error event',
            url: error.filename,
            lineNumber: error.lineno,
            columnNumber: error.colno,
        };
    }
    // Handle objects with error-like properties
    if (typeof error === 'object') {
        return {
            name: error.name || ((_a = error.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'ObjectError',
            message: error.message || error.toString() || 'Unknown object error',
            stack: error.stack,
            url: error.url || error.filename,
            lineNumber: error.lineNumber || error.lineno,
            columnNumber: error.columnNumber || error.colno,
        };
    }
    // Fallback for any other type
    return {
        name: 'UnknownError',
        message: String(error)
    };
}
// Alias for compatibility
const isBrowser = exports.isInBrowser;
/**
 * Checks if we're running in a Node.js environment
 */
function isNode() {
    return typeof process !== 'undefined' && !!process.versions && !!process.versions.node;
}
/**
 * Gets environment-specific information
 */
function getEnvironmentInfo() {
    if (isBrowser()) {
        return {
            runtime: 'browser',
            userAgent: navigator.userAgent
        };
    }
    if (isNode()) {
        return {
            runtime: 'node',
            version: process.version
        };
    }
    return {
        runtime: 'unknown'
    };
}
/**
 * Safely gets the current URL
 * Returns undefined in Node.js environments
 */
function getCurrentUrl() {
    if (isBrowser() && typeof window !== 'undefined' && window.location) {
        return window.location.href;
    }
    return undefined;
}
/**
 * Safely gets the referrer
 * Returns undefined in Node.js environments
 */
function getReferrer() {
    if (isBrowser() && typeof document !== 'undefined') {
        return document.referrer || undefined;
    }
    return undefined;
}
/**
 * Generates a timestamp in ISO format
 */
function getTimestamp() {
    return new Date().toISOString();
}
/**
 * Safely stringifies an object, handling circular references
 */
function safeStringify(obj, space) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular Reference]';
            }
            seen.add(value);
        }
        // Handle functions
        if (typeof value === 'function') {
            return `[Function: ${value.name || 'anonymous'}]`;
        }
        // Handle undefined
        if (value === undefined) {
            return '[undefined]';
        }
        return value;
    }, space);
}
/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Truncates a string to a maximum length
 */
function truncateString(str, maxLength) {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + '...';
}
/**
 * Debounce function for performance optimization
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
