// tests/fixtures/test-data.ts

/**
 * Shared test data and fixtures for all tests
 */

export const PII_TEST_CASES = {
  email: {
    valid: [
      "john@example.com",
      "jane.doe@company.co.uk",
      "user+tag@domain.org",
      "test.email@sub.domain.com",
    ],
    invalid: ["not-an-email", "@domain.com", "user@", "plaintext"],
  },

  ssn: {
    valid: [
      "123-45-6789",
      "987-65-4321",
      "111-22-3333",
      "123456789", // Without dashes
    ],
    invalid: ["12-34-5678", "1234-56-789", "abc-de-fghi"],
  },

  creditCard: {
    valid: [
      "4111 1111 1111 1111", // Visa
      "5500 0000 0000 0004", // Mastercard
      "3400 000000 00009", // AmEx
      "6011111111111117", // Discover (no spaces)
    ],
    invalid: ["1234 5678 9012", "abcd efgh ijkl mnop"],
  },

  phone: {
    valid: [
      "+1-202-555-0173",
      "(555) 123-4567",
      "555-123-4567",
      "5551234567",
      "+44 20 7123 4567",
    ],
    invalid: ["123", "abc-def-ghij"],
  },

  ip: {
    valid: ["192.168.1.1", "10.0.0.1", "172.16.0.1", "8.8.8.8"],
    invalid: ["256.1.1.1", "192.168", "not.an.ip.address"],
  },

  apiKey: {
    valid: [
      "sk_live_FAKE_KEY_FOR_TESTING_00000000000000",
      "pk_test_FAKE_KEY_FOR_TESTING_000000000",
      "AKIAIOSFODNN7EXAMPLE", // AWS format
    ],
    invalid: ["short", "no-numbers-or-special"],
  },

  jwt: {
    valid: [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    ],
    invalid: ["not.a.jwt", "only.two.parts"],
  },
};

export const NESTED_OBJECT_WITH_PII = {
  user: {
    name: "John Doe",
    email: "john@example.com", // Should be redacted
    profile: {
      phone: "555-123-4567", // Should be redacted
      address: {
        street: "123 Main St",
        city: "New York",
        zip: "10001",
      },
      ssn: "123-45-6789", // Should be redacted
    },
    payment: {
      cardNumber: "4111 1111 1111 1111", // Should be redacted
      cvv: "123",
    },
  },
  metadata: {
    ip: "192.168.1.1", // Should be redacted
    userAgent: "Mozilla/5.0...",
  },
};

export const ARRAY_WITH_PII = [
  { email: "user1@example.com", name: "User 1" },
  { email: "user2@example.com", name: "User 2" },
  {
    contacts: [
      { phone: "555-111-2222", type: "mobile" },
      { phone: "555-333-4444", type: "home" },
    ],
  },
];

export const SENSITIVE_FIELD_NAMES = [
  { password: "secret123", username: "john" },
  { token: "abc123def456", userId: "12345" },
  { secret: "my-secret-value", data: "public-data" },
  { apiKey: "sk_live_FAKE", environment: "production" },
  { authToken: "bearer xyz", role: "admin" },
];

export const CIRCULAR_REFERENCE_OBJECT = (() => {
  const obj: any = {
    name: "Test",
    email: "test@example.com",
  };
  obj.self = obj; // Circular reference
  return obj;
})();

export const MOCK_LOG_ENTRY = {
  projectId: "proj_123",
  timestamp: new Date().toISOString(),
  level: "info" as const,
  message: "Test log message",
  data: { key: "value" },
  service: "test-service",
  environment: "test",
};

export const MOCK_ERROR = new Error("Test error message");
MOCK_ERROR.stack = `Error: Test error message
    at testFunction (file.js:10:15)
    at Object.<anonymous> (file.js:20:5)`;

export const MOCK_PERFORMANCE_ENTRY = {
  name: "navigation",
  entryType: "navigation",
  startTime: 0,
  duration: 1500,
  loadEventEnd: 1500,
  domContentLoadedEventEnd: 800,
};

export const MOCK_NETWORK_REQUEST = {
  url: "https://api.example.com/users",
  method: "GET",
  status: 200,
  duration: 145,
  requestHeaders: {
    "Content-Type": "application/json",
  },
  responseHeaders: {
    "Content-Type": "application/json",
  },
};
