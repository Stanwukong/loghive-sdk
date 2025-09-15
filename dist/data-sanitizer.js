"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANITIZATION_PRESETS = exports.DataSanitizer = exports.DEFAULT_SANITIZATION_CONFIG = exports.PII_PATTERNS = void 0;
exports.createDataSanitizer = createDataSanitizer;
const utils_1 = require("./utils");
/**
 * PII detection patterns
 */
exports.PII_PATTERNS = [
    // Email addresses
    {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL_REDACTED]',
        description: 'Email address redaction',
        severity: 'high',
        category: 'pii'
    },
    // US Social Security Numbers (XXX-XX-XXXX)
    {
        pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        replacement: '[SSN_REDACTED]',
        description: 'Social Security Number redaction',
        severity: 'critical',
        category: 'pii'
    },
    // Credit Card Numbers (various formats)
    {
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        replacement: '[CARD_REDACTED]',
        description: 'Credit card number redaction',
        severity: 'critical',
        category: 'financial'
    },
    // Phone numbers (US format)
    {
        pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        replacement: '[PHONE_REDACTED]',
        description: 'Phone number redaction',
        severity: 'medium',
        category: 'pii'
    },
    // IP addresses
    {
        pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        replacement: '[IP_REDACTED]',
        description: 'IP address redaction',
        severity: 'medium',
        category: 'pii'
    },
    // API keys and tokens
    {
        pattern: /\b(?:api[_-]?key|token|secret|password|pwd)\s*[:=]\s*['"]?[A-Za-z0-9+/=]{20,}['"]?/gi,
        replacement: '[API_KEY_REDACTED]',
        description: 'API key and token redaction',
        severity: 'critical',
        category: 'authentication'
    },
    // JWT tokens
    {
        pattern: /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g,
        replacement: '[JWT_REDACTED]',
        description: 'JWT token redaction',
        severity: 'critical',
        category: 'authentication'
    },
    // Bank account numbers (basic pattern)
    {
        pattern: /\b\d{8,17}\b/g,
        replacement: '[ACCOUNT_REDACTED]',
        description: 'Bank account number redaction',
        severity: 'critical',
        category: 'financial'
    },
    // Driver's license (US format)
    {
        pattern: /\b[A-Z]\d{8}\b/g,
        replacement: '[DL_REDACTED]',
        description: 'Driver\'s license redaction',
        severity: 'high',
        category: 'pii'
    },
    // Passport numbers (basic pattern)
    {
        pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
        replacement: '[PASSPORT_REDACTED]',
        description: 'Passport number redaction',
        severity: 'high',
        category: 'pii'
    }
];
/**
 * Default sanitization configuration
 */
exports.DEFAULT_SANITIZATION_CONFIG = {
    enabled: true,
    rules: exports.PII_PATTERNS,
    customRules: [],
    retentionPolicy: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxSize: 100 * 1024 * 1024, // 100MB
        autoDelete: true,
        archiveBeforeDelete: true,
        categories: ['pii', 'financial', 'authentication']
    },
    auditEnabled: true,
    anonymizationEnabled: true,
    sensitiveFields: ['password', 'secret', 'token', 'key', 'ssn', 'email'],
    preserveStructure: true
};
/**
 * DataSanitizer class for enterprise-grade data sanitization
 */
class DataSanitizer {
    constructor(config = {}) {
        this.auditTrail = [];
        this.retentionCache = new Map();
        this.config = { ...exports.DEFAULT_SANITIZATION_CONFIG, ...config };
    }
    /**
     * Sanitize a log entry by applying all configured rules
     */
    sanitizeLogEntry(logEntry) {
        var _a, _b, _c, _d;
        if (!this.config.enabled) {
            return logEntry;
        }
        const startTime = Date.now();
        const originalSize = this.calculateSize(logEntry);
        const rulesApplied = [];
        try {
            // Create a deep copy to avoid mutating the original
            const sanitizedEntry = this.deepClone(logEntry);
            // Sanitize message
            if (sanitizedEntry.message) {
                const sanitizedMessage = this.sanitizeString(sanitizedEntry.message, rulesApplied);
                sanitizedEntry.message = sanitizedMessage;
            }
            // Sanitize data object
            if (sanitizedEntry.data) {
                sanitizedEntry.data = this.sanitizeObject(sanitizedEntry.data, rulesApplied);
            }
            // Sanitize context
            if (sanitizedEntry.context) {
                sanitizedEntry.context = this.sanitizeObject(sanitizedEntry.context, rulesApplied);
            }
            // Sanitize metadata
            if (sanitizedEntry.metadata) {
                sanitizedEntry.metadata = this.sanitizeObject(sanitizedEntry.metadata, rulesApplied);
            }
            // Apply anonymization if enabled
            if (this.config.anonymizationEnabled) {
                this.anonymizeSensitiveFields(sanitizedEntry, rulesApplied);
            }
            // Record audit trail
            if (this.config.auditEnabled) {
                this.recordAuditEntry({
                    timestamp: new Date().toISOString(),
                    operation: 'sanitize',
                    dataType: 'log_entry',
                    originalSize,
                    processedSize: this.calculateSize(sanitizedEntry),
                    rulesApplied,
                    userId: (_a = logEntry.context) === null || _a === void 0 ? void 0 : _a.userId,
                    sessionId: (_b = logEntry.context) === null || _b === void 0 ? void 0 : _b.sessionId,
                    metadata: {
                        processingTime: Date.now() - startTime,
                        rulesCount: rulesApplied.length
                    }
                });
            }
            return sanitizedEntry;
        }
        catch (error) {
            console.error('DataSanitizer: Error sanitizing log entry:', error);
            // Record error in audit trail
            if (this.config.auditEnabled) {
                this.recordAuditEntry({
                    timestamp: new Date().toISOString(),
                    operation: 'sanitize',
                    dataType: 'log_entry',
                    originalSize,
                    processedSize: originalSize,
                    rulesApplied: ['ERROR'],
                    userId: (_c = logEntry.context) === null || _c === void 0 ? void 0 : _c.userId,
                    sessionId: (_d = logEntry.context) === null || _d === void 0 ? void 0 : _d.sessionId,
                    metadata: { error: error instanceof Error ? error.message : String(error) }
                });
            }
            // Return original entry if sanitization fails
            return logEntry;
        }
    }
    /**
     * Sanitize a string using configured rules
     */
    sanitizeString(input, rulesApplied) {
        let sanitized = input;
        const allRules = [...this.config.rules, ...this.config.customRules];
        for (const rule of allRules) {
            const beforeLength = sanitized.length;
            sanitized = sanitized.replace(rule.pattern, rule.replacement);
            if (sanitized.length !== beforeLength) {
                rulesApplied.push(rule.description);
            }
        }
        return sanitized;
    }
    /**
     * Sanitize an object recursively
     */
    sanitizeObject(obj, rulesApplied, seen = new WeakSet()) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (typeof obj === 'string') {
            return this.sanitizeString(obj, rulesApplied);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, rulesApplied, seen));
        }
        if (typeof obj === 'object') {
            if (seen.has(obj)) {
                return '[Circular Reference]';
            }
            seen.add(obj);
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = this.sanitizeObject(value, rulesApplied, seen);
            }
            return sanitized;
        }
        return obj;
    }
    /**
     * Anonymize sensitive fields
     */
    anonymizeSensitiveFields(logEntry, rulesApplied) {
        const sensitiveFields = this.config.sensitiveFields;
        const visited = new WeakSet();
        const anonymizeField = (obj, path = '') => {
            if (obj === null || obj === undefined || typeof obj !== 'object') {
                return;
            }
            if (visited.has(obj)) {
                return;
            }
            visited.add(obj);
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()) ||
                    currentPath.toLowerCase().includes(field.toLowerCase()))) {
                    if (typeof value === 'string') {
                        obj[key] = this.anonymizeValue(value);
                        rulesApplied.push(`anonymize_${key}`);
                    }
                    else if (typeof value === 'object' && value !== null) {
                        anonymizeField(value, currentPath);
                    }
                }
                else if (typeof value === 'object' && value !== null) {
                    anonymizeField(value, currentPath);
                }
            }
        };
        if (logEntry.data) {
            anonymizeField(logEntry.data);
        }
        if (logEntry.context) {
            anonymizeField(logEntry.context);
        }
        if (logEntry.metadata) {
            anonymizeField(logEntry.metadata);
        }
    }
    /**
     * Anonymize a value based on its type
     */
    anonymizeValue(value) {
        if (value.length <= 4) {
            return '[ANONYMIZED]';
        }
        // Keep first and last character, replace middle with asterisks
        const first = value[0];
        const last = value[value.length - 1];
        const middle = '*'.repeat(Math.max(2, value.length - 2));
        return `${first}${middle}${last}`;
    }
    /**
     * Check if data should be retained based on retention policy
     */
    shouldRetainData(dataId, timestamp, size) {
        const policy = this.config.retentionPolicy;
        const now = Date.now();
        // Check age
        if (now - timestamp > policy.maxAge) {
            return false;
        }
        // Check size
        if (size > policy.maxSize) {
            return false;
        }
        // Update cache
        this.retentionCache.set(dataId, { timestamp, size });
        return true;
    }
    /**
     * Get data that should be deleted based on retention policy
     */
    getDataForDeletion() {
        const policy = this.config.retentionPolicy;
        const now = Date.now();
        const toDelete = [];
        for (const [dataId, info] of this.retentionCache.entries()) {
            if (now - info.timestamp > policy.maxAge || info.size > policy.maxSize) {
                toDelete.push(dataId);
            }
        }
        return toDelete;
    }
    /**
     * Clean up expired data
     */
    cleanupExpiredData() {
        const toDelete = this.getDataForDeletion();
        let cleanedCount = 0;
        for (const dataId of toDelete) {
            this.retentionCache.delete(dataId);
            cleanedCount++;
            if (this.config.auditEnabled) {
                this.recordAuditEntry({
                    timestamp: new Date().toISOString(),
                    operation: 'delete',
                    dataType: 'cached_data',
                    originalSize: 0,
                    processedSize: 0,
                    rulesApplied: ['retention_policy'],
                    metadata: { dataId, reason: 'expired' }
                });
            }
        }
        return cleanedCount;
    }
    /**
     * Get audit trail entries
     */
    getAuditTrail() {
        return [...this.auditTrail];
    }
    /**
     * Clear audit trail
     */
    clearAuditTrail() {
        this.auditTrail = [];
    }
    /**
     * Add custom sanitization rule
     */
    addCustomRule(rule) {
        this.config.customRules.push(rule);
    }
    /**
     * Remove custom sanitization rule
     */
    removeCustomRule(description) {
        const index = this.config.customRules.findIndex(rule => rule.description === description);
        if (index !== -1) {
            this.config.customRules.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Update sanitization configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Calculate approximate size of an object in bytes
     */
    calculateSize(obj) {
        try {
            return (0, utils_1.safeStringify)(obj).length * 2; // Rough estimate, circular-safe
        }
        catch {
            return 0;
        }
    }
    /**
     * Deep clone an object
     */
    deepClone(obj, seen = new WeakMap()) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (seen.has(obj)) {
            return seen.get(obj);
        }
        if (Array.isArray(obj)) {
            const arr = [];
            seen.set(obj, arr);
            for (const item of obj) {
                arr.push(this.deepClone(item, seen));
            }
            return arr;
        }
        const cloned = {};
        seen.set(obj, cloned);
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone(obj[key], seen);
            }
        }
        return cloned;
    }
    /**
     * Record an audit entry
     */
    recordAuditEntry(entry) {
        this.auditTrail.push(entry);
        // Keep only last 1000 entries to prevent memory leaks
        if (this.auditTrail.length > 1000) {
            this.auditTrail = this.auditTrail.slice(-1000);
        }
    }
}
exports.DataSanitizer = DataSanitizer;
/**
 * Factory function to create a DataSanitizer with common configurations
 */
function createDataSanitizer(config = {}) {
    return new DataSanitizer(config);
}
/**
 * Predefined sanitization configurations for common use cases
 */
exports.SANITIZATION_PRESETS = {
    // Strict configuration for highly sensitive data
    STRICT: {
        enabled: true,
        rules: exports.PII_PATTERNS,
        customRules: [],
        retentionPolicy: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxSize: 50 * 1024 * 1024, // 50MB
            autoDelete: true,
            archiveBeforeDelete: true,
            categories: ['pii', 'financial', 'authentication']
        },
        auditEnabled: true,
        anonymizationEnabled: true,
        sensitiveFields: ['password', 'secret', 'token', 'key', 'ssn', 'email', 'phone', 'address'],
        preserveStructure: true
    },
    // Balanced configuration for general enterprise use
    BALANCED: exports.DEFAULT_SANITIZATION_CONFIG,
    // Lenient configuration for development/testing
    LENIENT: {
        enabled: true,
        rules: exports.PII_PATTERNS.filter(rule => rule.severity === 'critical'),
        customRules: [],
        retentionPolicy: {
            maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
            maxSize: 500 * 1024 * 1024, // 500MB
            autoDelete: false,
            archiveBeforeDelete: false,
            categories: ['pii', 'financial']
        },
        auditEnabled: false,
        anonymizationEnabled: false,
        sensitiveFields: ['password', 'secret'],
        preserveStructure: true
    }
};
