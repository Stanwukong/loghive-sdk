/**
 * @file example/data-sanitization-example.ts
 * @description Comprehensive example demonstrating data sanitization features
 *
 * This example shows how to use the Monita SDK's data sanitization capabilities
 * for enterprise-grade security and compliance.
 */

import dotenv from "dotenv";
import {
  Monita,
  LogLevel,
  SANITIZATION_PRESETS,
  createDataSanitizer,
} from "../src";

// Load environment variables
dotenv.config();

const API_KEY = process.env.REMOTE_LOGGER_API_KEY || "your-api-key";
const PROJECT_ID = process.env.REMOTE_LOGGER_PROJECT_ID || "your-project-id";
const ENDPOINT =
  process.env.REMOTE_LOGGER_ENDPOINT ||
  "https://loghive-server.vercel.app/api/v1";

console.log("🔒 Monita Data Sanitization Example");
console.log("=====================================");

// Example 1: Basic sanitization with default configuration
console.log("\n📝 Example 1: Basic Sanitization");
const basicLogger = new Monita({
  apiKey: API_KEY,
  endpoint: ENDPOINT,
  projectId: PROJECT_ID,
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.BALANCED,
  },
});

// Log sensitive data that will be automatically sanitized
basicLogger.info("User registration", {
  user: {
    email: "john.doe@example.com",
    ssn: "123-45-6789",
    phone: "+1-555-123-4567",
    creditCard: "4111-1111-1111-1111",
  },
  apiKey: "sk-1234567890abcdef",
  password: "superSecretPassword123",
});

// Example 2: Strict sanitization for highly sensitive data
console.log("\n🔐 Example 2: Strict Sanitization");
const strictLogger = new Monita({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  endpoint: ENDPOINT,
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.STRICT,
  },
});

strictLogger.info("Financial transaction", {
  transaction: {
    amount: 1000.0,
    currency: "USD",
    accountNumber: "1234567890123456",
    routingNumber: "021000021",
  },
  customer: {
    email: "customer@bank.com",
    ssn: "987-65-4321",
    address: "123 Main St, Anytown, USA",
  },
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
});

// Example 3: Custom sanitization rules
console.log("\n⚙️ Example 3: Custom Sanitization Rules");
const customLogger = new Monita({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  endpoint: ENDPOINT,
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.BALANCED,
      customRules: [
        {
          pattern: /\b[A-Z]{2}\d{6}\b/g,
          replacement: "[EMPLOYEE_ID_REDACTED]",
          description: "Employee ID redaction",
          severity: "high",
          category: "pii",
        },
        {
          pattern: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g,
          replacement: "[CARD_REDACTED]",
          description: "Credit card with dashes redaction",
          severity: "critical",
          category: "financial",
        },
      ],
      sensitiveFields: [
        "password",
        "secret",
        "token",
        "key",
        "ssn",
        "email",
        "employeeId",
      ],
    },
  },
});

// Add custom rule after initialization
customLogger.addCustomSanitizationRule({
  pattern: /\b[A-Z]{3}\d{3}\b/g,
  replacement: "[DEPARTMENT_CODE_REDACTED]",
  description: "Department code redaction",
  severity: "medium",
  category: "pii",
});

customLogger.info("Employee data", {
  employee: {
    employeeId: "AB123456",
    departmentCode: "ITC001",
    email: "employee@company.com",
    ssn: "111-22-3333",
    creditCard: "5555-4444-3333-2222",
  },
  salary: 75000,
  benefits: ["health", "dental", "vision"],
});

// Example 4: Audit trail and monitoring
console.log("\n📊 Example 4: Audit Trail and Monitoring");
const auditLogger = new Monita({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  endpoint: ENDPOINT,
  sanitization: {
    enabled: true,
    config: {
      ...SANITIZATION_PRESETS.STRICT,
      auditEnabled: true,
      retentionPolicy: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxSize: 50 * 1024 * 1024, // 50MB
        autoDelete: true,
        archiveBeforeDelete: true,
        categories: ["pii", "financial", "authentication"],
      },
    },
  },
});

// Log some data to generate audit entries
auditLogger.info("Sensitive operation", {
  user: {
    email: "admin@company.com",
    ssn: "999-88-7777",
  },
  operation: "data_export",
  records: 1000,
});

auditLogger.error(
  "Security incident",
  new Error("Unauthorized access attempt"),
  {
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0...",
    attemptedAction: "admin_panel_access",
  }
);

// Wait a moment for processing
setTimeout(() => {
  console.log("\n📋 Audit Trail Entries:");
  const auditTrail = auditLogger.getAuditTrail();
  auditTrail.forEach((entry, index) => {
    console.log(
      `${index + 1}. ${entry.operation.toUpperCase()} - ${entry.dataType}`
    );
    console.log(`   Rules Applied: ${entry.rulesApplied.join(", ")}`);
    console.log(
      `   Size: ${entry.originalSize} -> ${entry.processedSize} bytes`
    );
    console.log(`   Time: ${entry.timestamp}`);
    console.log("");
  });

  // Show sanitization configuration
  console.log("⚙️ Current Sanitization Configuration:");
  const config = auditLogger.getSanitizationConfig();
  console.log(`- Enabled: ${config.enabled}`);
  console.log(
    `- Rules Count: ${config.rules.length + config.customRules.length}`
  );
  console.log(`- Audit Enabled: ${config.auditEnabled}`);
  console.log(`- Anonymization Enabled: ${config.anonymizationEnabled}`);
  console.log(`- Sensitive Fields: ${config.sensitiveFields.join(", ")}`);
  console.log(
    `- Retention Policy: ${
      config.retentionPolicy.maxAge / (24 * 60 * 60 * 1000)
    } days`
  );

  // Cleanup expired data
  const cleanedCount = auditLogger.cleanupExpiredData();
  console.log(`\n🧹 Cleaned up ${cleanedCount} expired data entries`);
}, 2000);

// Example 5: Standalone DataSanitizer usage
console.log("\n🔧 Example 5: Standalone DataSanitizer");
const standaloneSanitizer = createDataSanitizer(SANITIZATION_PRESETS.STRICT);

const sensitiveData = {
  message: "User john.doe@example.com with SSN 123-45-6789 made a purchase",
  user: {
    email: "jane.smith@company.com",
    phone: "+1-555-987-6543",
    creditCard: "4111-1111-1111-1111",
    apiKey: "sk-abcdef1234567890",
  },
  transaction: {
    amount: 299.99,
    currency: "USD",
    accountNumber: "9876543210987654",
  },
};

console.log("Original data:", JSON.stringify(sensitiveData, null, 2));

const sanitizedData = standaloneSanitizer.sanitizeLogEntry({
  projectId: "test-project",
  level: LogLevel.INFO,
  message: sensitiveData.message,
  data: sensitiveData,
  timestamp: new Date().toISOString(),
});

console.log("Sanitized data:", JSON.stringify(sanitizedData, null, 2));

// Example 6: Performance testing
console.log("\n⚡ Example 6: Performance Testing");
const perfLogger = new Monita({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  endpoint: ENDPOINT,
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.BALANCED,
  },
});

const startTime = Date.now();
const iterations = 50;

for (let i = 0; i < iterations; i++) {
  perfLogger.info(`Performance test ${i}`, {
    user: {
      email: `user${i}@example.com`,
      ssn: `${Math.floor(Math.random() * 900) + 100}-${
        Math.floor(Math.random() * 90) + 10
      }-${Math.floor(Math.random() * 9000) + 1000}`,
      creditCard: `${Math.floor(Math.random() * 9000) + 1000}-${
        Math.floor(Math.random() * 9000) + 1000
      }-${Math.floor(Math.random() * 9000) + 1000}-${
        Math.floor(Math.random() * 9000) + 1000
      }`,
    },
    iteration: i,
    timestamp: Date.now(),
  });
}

const endTime = Date.now();
const duration = endTime - startTime;

console.log(`Processed ${iterations} sanitized logs in ${duration}ms`);
console.log(`Average time per log: ${(duration / iterations).toFixed(2)}ms`);

// Example 7: Error handling and edge cases
console.log("\n🚨 Example 7: Error Handling and Edge Cases");
const errorLogger = new Monita({
  apiKey: API_KEY,
  projectId: PROJECT_ID,
  endpoint: ENDPOINT,
  sanitization: {
    enabled: true,
    config: SANITIZATION_PRESETS.BALANCED,
  },
});

// Test with various edge cases
errorLogger.info("Edge case testing", {
  nullValue: null,
  undefinedValue: undefined,
  emptyString: "",
  emptyObject: {},
  emptyArray: [],
  nestedObject: {
    level1: {
      level2: {
        email: "nested@example.com",
        ssn: "111-22-3333",
      },
    },
  },
  arrayWithSensitiveData: [
    "normal@example.com",
    "sensitive@bank.com",
    "123-45-6789",
  ],
  circularReference: (() => {
    const obj: any = { email: "circular@example.com" };
    obj.self = obj;
    return obj;
  })(),
});

// Graceful shutdown
setTimeout(async () => {
  console.log("\n🛑 Shutting down loggers...");

  await Promise.all([
    basicLogger.shutdown(),
    strictLogger.shutdown(),
    customLogger.shutdown(),
    auditLogger.shutdown(),
    perfLogger.shutdown(),
    errorLogger.shutdown(),
  ]);

  console.log("✅ All loggers shut down successfully");
  console.log("\n🎉 Data sanitization example completed!");
}, 5000);
