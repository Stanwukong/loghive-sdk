import { LogEntry } from './types';
/**
 * Data sanitization rules configuration
 */
export interface SanitizationRule {
    pattern: RegExp;
    replacement: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'pii' | 'financial' | 'authentication' | 'custom';
}
/**
 * Data retention policy configuration
 */
export interface RetentionPolicy {
    maxAge: number;
    maxSize: number;
    autoDelete: boolean;
    archiveBeforeDelete: boolean;
    categories: string[];
}
/**
 * Audit trail entry for data processing
 */
export interface AuditEntry {
    timestamp: string;
    operation: 'sanitize' | 'anonymize' | 'retain' | 'delete' | 'archive';
    dataType: string;
    originalSize: number;
    processedSize: number;
    rulesApplied: string[];
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
}
/**
 * PII detection patterns
 */
export declare const PII_PATTERNS: SanitizationRule[];
/**
 * Data sanitization configuration
 */
export interface SanitizationConfig {
    enabled: boolean;
    rules: SanitizationRule[];
    customRules: SanitizationRule[];
    retentionPolicy: RetentionPolicy;
    auditEnabled: boolean;
    anonymizationEnabled: boolean;
    sensitiveFields: string[];
    preserveStructure: boolean;
}
/**
 * Default sanitization configuration
 */
export declare const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig;
/**
 * DataSanitizer class for enterprise-grade data sanitization
 */
export declare class DataSanitizer {
    private config;
    private auditTrail;
    private retentionCache;
    constructor(config?: Partial<SanitizationConfig>);
    /**
     * Sanitize a log entry by applying all configured rules
     */
    sanitizeLogEntry(logEntry: LogEntry): LogEntry;
    /**
     * Sanitize a string using configured rules
     */
    private sanitizeString;
    /**
     * Sanitize an object recursively
     */
    private sanitizeObject;
    /**
     * Anonymize sensitive fields
     */
    private anonymizeSensitiveFields;
    /**
     * Anonymize a value based on its type
     */
    private anonymizeValue;
    /**
     * Check if data should be retained based on retention policy
     */
    shouldRetainData(dataId: string, timestamp: number, size: number): boolean;
    /**
     * Get data that should be deleted based on retention policy
     */
    getDataForDeletion(): string[];
    /**
     * Clean up expired data
     */
    cleanupExpiredData(): number;
    /**
     * Get audit trail entries
     */
    getAuditTrail(): AuditEntry[];
    /**
     * Clear audit trail
     */
    clearAuditTrail(): void;
    /**
     * Add custom sanitization rule
     */
    addCustomRule(rule: SanitizationRule): void;
    /**
     * Remove custom sanitization rule
     */
    removeCustomRule(description: string): boolean;
    /**
     * Update sanitization configuration
     */
    updateConfig(newConfig: Partial<SanitizationConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): SanitizationConfig;
    /**
     * Calculate approximate size of an object in bytes
     */
    private calculateSize;
    /**
     * Deep clone an object
     */
    private deepClone;
    /**
     * Record an audit entry
     */
    private recordAuditEntry;
}
/**
 * Factory function to create a DataSanitizer with common configurations
 */
export declare function createDataSanitizer(config?: Partial<SanitizationConfig>): DataSanitizer;
/**
 * Predefined sanitization configurations for common use cases
 */
export declare const SANITIZATION_PRESETS: {
    STRICT: SanitizationConfig;
    BALANCED: SanitizationConfig;
    LENIENT: SanitizationConfig;
};
