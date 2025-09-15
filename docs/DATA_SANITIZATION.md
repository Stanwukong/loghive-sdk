# Data Sanitization & Privacy Protection

## Overview

The Monita SDK includes enterprise-grade data sanitization capabilities to protect sensitive information and ensure compliance with privacy regulations like GDPR, CCPA, and HIPAA. The sanitization system automatically detects and redacts personally identifiable information (PII), financial data, and authentication tokens from your logs.

## Features

- **Automatic PII Detection**: Identifies and redacts emails, SSNs, phone numbers, IP addresses, and more
- **Financial Data Protection**: Redacts credit card numbers, bank account numbers, and other financial information
- **Authentication Token Security**: Protects API keys, JWT tokens, and other sensitive credentials
- **Custom Rule Support**: Add your own sanitization patterns and rules
- **Data Anonymization**: Anonymize sensitive fields while preserving data structure
- **Audit Trail**: Complete audit log of all data processing operations
- **Retention Policies**: Configurable data retention and automatic cleanup
- **Performance Optimized**: Minimal impact on logging performance

## Quick Start

### Basic Usage

```typescript
import { Monita, SANITIZATION_PRESETS } from 'monita';

const logger = new Monita({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.BALANCED
  }
});

// Sensitive data is automatically sanitized
logger.info('User registration', {
  user: {
    email: 'john.doe@example.com',        // → [EMAIL_REDACTED]
    ssn: '123-45-6789',                   // → [SSN_REDACTED]
    phone: '+1-555-123-4567',             // → [PHONE_REDACTED]
    creditCard: '4111-1111-1111-1111'     // → [CARD_REDACTED]
  },
  apiKey: 'sk-1234567890abcdef'           // → [API_KEY_REDACTED]
});
```

### Predefined Configurations

```typescript
import { SANITIZATION_PRESETS } from 'monita';

// Strict configuration for highly sensitive data
const strictLogger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.STRICT
  }
});

// Balanced configuration for general enterprise use
const balancedLogger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.BALANCED
  }
});

// Lenient configuration for development/testing
const lenientLogger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.LENIENT
  }
});
```

## Configuration Options

### SanitizationConfig Interface

```typescript
interface SanitizationConfig {
  enabled: boolean;                    // Enable/disable sanitization
  rules: SanitizationRule[];          // Built-in PII detection rules
  customRules: SanitizationRule[];    // Custom sanitization rules
  retentionPolicy: RetentionPolicy;   // Data retention settings
  auditEnabled: boolean;              // Enable audit trail
  anonymizationEnabled: boolean;      // Enable field anonymization
  sensitiveFields: string[];          // Fields to anonymize
  preserveStructure: boolean;         // Maintain data structure
}
```

### SanitizationRule Interface

```typescript
interface SanitizationRule {
  pattern: RegExp;                    // Regex pattern to match
  replacement: string;                // Replacement text
  description: string;                // Human-readable description
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'pii' | 'financial' | 'authentication' | 'custom';
}
```

### RetentionPolicy Interface

```typescript
interface RetentionPolicy {
  maxAge: number;                     // Maximum age in milliseconds
  maxSize: number;                    // Maximum size in bytes
  autoDelete: boolean;                // Auto-delete expired data
  archiveBeforeDelete: boolean;       // Archive before deletion
  categories: string[];               // Applicable data categories
}
```

## Built-in Detection Patterns

The SDK includes comprehensive patterns for detecting sensitive data:

### PII (Personally Identifiable Information)
- **Email addresses**: `user@example.com` → `[EMAIL_REDACTED]`
- **Social Security Numbers**: `123-45-6789` → `[SSN_REDACTED]`
- **Phone numbers**: `+1-555-123-4567` → `[PHONE_REDACTED]`
- **IP addresses**: `192.168.1.1` → `[IP_REDACTED]`
- **Driver's licenses**: `A12345678` → `[DL_REDACTED]`
- **Passport numbers**: `A1234567` → `[PASSPORT_REDACTED]`

### Financial Data
- **Credit card numbers**: `4111-1111-1111-1111` → `[CARD_REDACTED]`
- **Bank account numbers**: `1234567890123456` → `[ACCOUNT_REDACTED]`

### Authentication Tokens
- **API keys**: `api_key: "sk-1234567890"` → `[API_KEY_REDACTED]`
- **JWT tokens**: `eyJhbGciOiJIUzI1NiIs...` → `[JWT_REDACTED]`

## Custom Rules

### Adding Custom Rules

```typescript
// Add custom rule during initialization
const logger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.BALANCED,
      customRules: [
        {
          pattern: /\b[A-Z]{2}\d{6}\b/g,
          replacement: '[EMPLOYEE_ID_REDACTED]',
          description: 'Employee ID redaction',
          severity: 'high',
          category: 'pii'
        }
      ]
    }
  }
});

// Add custom rule after initialization
logger.addCustomSanitizationRule({
  pattern: /\b[A-Z]{3}\d{3}\b/g,
  replacement: '[DEPARTMENT_CODE_REDACTED]',
  description: 'Department code redaction',
  severity: 'medium',
  category: 'pii'
});
```

### Removing Custom Rules

```typescript
// Remove custom rule by description
const removed = logger.removeCustomSanitizationRule('Department code redaction');
console.log('Rule removed:', removed);
```

## Data Anonymization

### Field-based Anonymization

```typescript
const logger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.BALANCED,
      anonymizationEnabled: true,
      sensitiveFields: ['password', 'secret', 'token', 'key', 'ssn', 'email']
    }
  }
});

// These fields will be anonymized: j***@e***.com, s***3
logger.info('User data', {
  user: {
    email: 'john@example.com',    // → j***@e***.com
    ssn: '123456789',             // → s***9
    password: 'secret123'         // → s***3
  }
});
```

### Anonymization Patterns

- **Short values (≤4 chars)**: `[ANONYMIZED]`
- **Longer values**: `f***t` (first + last + asterisks)
- **Preserves structure**: Maintains data types and nesting

## Audit Trail

### Enabling Audit Trail

```typescript
const logger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.STRICT,
      auditEnabled: true
    }
  }
});
```

### Accessing Audit Data

```typescript
// Get all audit entries
const auditTrail = logger.getAuditTrail();
console.log('Audit entries:', auditTrail.length);

// View specific audit entry
auditTrail.forEach((entry, index) => {
  console.log(`${index + 1}. ${entry.operation.toUpperCase()}`);
  console.log(`   Data Type: ${entry.dataType}`);
  console.log(`   Rules Applied: ${entry.rulesApplied.join(', ')}`);
  console.log(`   Size: ${entry.originalSize} → ${entry.processedSize} bytes`);
  console.log(`   Time: ${entry.timestamp}`);
});

// Clear audit trail
logger.clearAuditTrail();
```

### AuditEntry Interface

```typescript
interface AuditEntry {
  timestamp: string;                // ISO timestamp
  operation: 'sanitize' | 'anonymize' | 'retain' | 'delete' | 'archive';
  dataType: string;                 // Type of data processed
  originalSize: number;             // Original size in bytes
  processedSize: number;            // Processed size in bytes
  rulesApplied: string[];           // Rules that were applied
  userId?: string;                  // User context
  sessionId?: string;               // Session context
  metadata?: Record<string, any>;   // Additional metadata
}
```

## Data Retention

### Retention Policies

```typescript
const logger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.BALANCED,
      retentionPolicy: {
        maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
        maxSize: 100 * 1024 * 1024,        // 100MB
        autoDelete: true,                   // Auto-delete expired data
        archiveBeforeDelete: true,          // Archive before deletion
        categories: ['pii', 'financial', 'authentication']
      }
    }
  }
});
```

### Manual Cleanup

```typescript
// Clean up expired data
const cleanedCount = logger.cleanupExpiredData();
console.log(`Cleaned up ${cleanedCount} expired entries`);

// Check if data should be retained
const shouldRetain = logger.shouldRetainData('data-id', Date.now(), 1024);
console.log('Should retain:', shouldRetain);
```

## Configuration Management

### Runtime Configuration Updates

```typescript
// Get current configuration
const config = logger.getSanitizationConfig();
console.log('Current config:', config);

// Update configuration
logger.updateSanitizationConfig({
  enabled: false,  // Temporarily disable sanitization
  auditEnabled: true
});

// Re-enable with new settings
logger.updateSanitizationConfig({
  enabled: true,
  config: SANITIZATION_PRESETS.STRICT
});
```

## Standalone Usage

### Using DataSanitizer Directly

```typescript
import { createDataSanitizer, SANITIZATION_PRESETS } from 'monita';

const sanitizer = createDataSanitizer(SANITIZATION_PRESETS.STRICT);

const sensitiveData = {
  message: "User john.doe@example.com with SSN 123-45-6789",
  user: {
    email: "jane@company.com",
    creditCard: "4111-1111-1111-1111"
  }
};

const sanitized = sanitizer.sanitizeLogEntry({
  projectId: "test-project",
  level: LogLevel.INFO,
  message: sensitiveData.message,
  data: sensitiveData,
  timestamp: new Date().toISOString()
});

console.log('Sanitized:', sanitized);
```

## Performance Considerations

### Optimization Tips

1. **Use appropriate preset**: Choose the right preset for your use case
2. **Limit custom rules**: Too many custom rules can impact performance
3. **Disable audit in production**: Set `auditEnabled: false` for high-throughput scenarios
4. **Regular cleanup**: Run `cleanupExpiredData()` periodically
5. **Monitor performance**: Use audit trail to monitor processing times

### Performance Benchmarks

- **Basic sanitization**: ~0.1ms per log entry
- **Strict sanitization**: ~0.3ms per log entry
- **With audit trail**: +0.05ms per log entry
- **Memory usage**: ~1KB per 1000 audit entries

## Compliance Features

### GDPR Compliance

```typescript
const gdprLogger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.STRICT,
      retentionPolicy: {
        maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days (GDPR requirement)
        autoDelete: true,
        archiveBeforeDelete: true
      },
      auditEnabled: true  // Required for GDPR compliance
    }
  }
});
```

### HIPAA Compliance

```typescript
const hipaaLogger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.STRICT,
      customRules: [
        // Add medical record number pattern
        {
          pattern: /\bMRN\d{8}\b/g,
          replacement: '[MEDICAL_RECORD_REDACTED]',
          description: 'Medical record number redaction',
          severity: 'critical',
          category: 'pii'
        }
      ],
      sensitiveFields: ['patientId', 'medicalRecord', 'diagnosis', 'treatment']
    }
  }
});
```

## Error Handling

### Graceful Degradation

The sanitization system is designed to fail gracefully:

- **Sanitization errors**: Logs original data if sanitization fails
- **Pattern errors**: Invalid regex patterns are logged and skipped
- **Memory errors**: Automatic cleanup prevents memory leaks
- **Performance errors**: Fallback to basic sanitization if needed

### Error Monitoring

```typescript
// Check audit trail for errors
const auditTrail = logger.getAuditTrail();
const errors = auditTrail.filter(entry => 
  entry.rulesApplied.includes('ERROR')
);

if (errors.length > 0) {
  console.warn(`Found ${errors.length} sanitization errors`);
  errors.forEach(error => {
    console.error('Error:', error.metadata?.error);
  });
}
```

## Best Practices

### 1. Choose the Right Preset

- **STRICT**: Healthcare, financial, government
- **BALANCED**: General enterprise applications
- **LENIENT**: Development, testing, internal tools

### 2. Customize for Your Domain

```typescript
// Add domain-specific patterns
logger.addCustomSanitizationRule({
  pattern: /\b[A-Z]{2}\d{6}\b/g,
  replacement: '[CUSTOM_ID_REDACTED]',
  description: 'Custom ID redaction',
  severity: 'high',
  category: 'custom'
});
```

### 3. Monitor and Audit

```typescript
// Regular audit trail review
setInterval(() => {
  const auditTrail = logger.getAuditTrail();
  const recentErrors = auditTrail.filter(entry => 
    entry.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() &&
    entry.rulesApplied.includes('ERROR')
  );
  
  if (recentErrors.length > 10) {
    console.warn('High sanitization error rate detected');
  }
}, 24 * 60 * 60 * 1000); // Check daily
```

### 4. Test Your Rules

```typescript
// Test sanitization rules
const testData = {
  email: 'test@example.com',
  ssn: '123-45-6789',
  creditCard: '4111-1111-1111-1111'
};

const sanitized = logger.sanitizeLogEntry({
  projectId: 'test',
  level: LogLevel.INFO,
  message: 'Test message',
  data: testData,
  timestamp: new Date().toISOString()
});

console.log('Sanitization test:', sanitized);
```

## Troubleshooting

### Common Issues

1. **Sanitization not working**: Check if `sanitization.enabled` is `true`
2. **Custom rules not applied**: Verify regex pattern syntax
3. **Performance issues**: Reduce custom rules or disable audit trail
4. **Memory leaks**: Run `cleanupExpiredData()` regularly
5. **False positives**: Adjust regex patterns or add exceptions

### Debug Mode

```typescript
// Enable debug logging
const logger = new Monita({
  // ... other config
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.BALANCED,
      auditEnabled: true
    }
  }
});

// Check what rules are being applied
const auditTrail = logger.getAuditTrail();
auditTrail.forEach(entry => {
  console.log(`Applied rules: ${entry.rulesApplied.join(', ')}`);
});
```

## Migration Guide

### From Basic to Sanitized Logging

1. **Enable sanitization**:
```typescript
// Before
const logger = new Monita({ apiKey, projectId });

// After
const logger = new Monita({ 
  apiKey, 
  projectId,
  sanitization: { enabled: true }
});
```

2. **Review existing logs**: Check for sensitive data in current logs
3. **Test thoroughly**: Verify sanitization works with your data patterns
4. **Monitor performance**: Ensure sanitization doesn't impact performance
5. **Update documentation**: Document sanitization policies for your team

---

For more examples and advanced usage, see the [Data Sanitization Example](../example/data-sanitization-example.ts).
