// tests/log-level-logic.test.ts

import { describe, it, expect } from "vitest";
import { LogLevel } from "../src/types";
import { LogLevelDecisionEngine } from "../src/log-level-logic";

describe("LogLevelDecisionEngine", () => {
  describe("getErrorLogLevel", () => {
    it("should always return ERROR for Error objects", () => {
      const error = new Error("Test error");
      const level = LogLevelDecisionEngine.getErrorLogLevel(error);

      expect(level).toBe(LogLevel.ERROR);
    });

    it("should return ERROR for errors with different names", () => {
      const networkError = new Error("Network failed");
      networkError.name = "NetworkError";

      const syntaxError = new Error("Syntax issue");
      syntaxError.name = "SyntaxError";

      expect(LogLevelDecisionEngine.getErrorLogLevel(networkError)).toBe(
        LogLevel.ERROR
      );
      expect(LogLevelDecisionEngine.getErrorLogLevel(syntaxError)).toBe(
        LogLevel.ERROR
      );
    });
  });

  describe("getNetworkLogLevel", () => {
    it("should return ERROR for network failure (no status)", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel();
      expect(level).toBe(LogLevel.ERROR);
    });

    it("should return ERROR for 5xx status codes", () => {
      expect(LogLevelDecisionEngine.getNetworkLogLevel(500)).toBe(LogLevel.ERROR);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(502)).toBe(LogLevel.ERROR);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(503)).toBe(LogLevel.ERROR);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(504)).toBe(LogLevel.ERROR);
    });

    it("should return WARN for 4xx status codes", () => {
      expect(LogLevelDecisionEngine.getNetworkLogLevel(400)).toBe(LogLevel.WARN);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(401)).toBe(LogLevel.WARN);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(403)).toBe(LogLevel.WARN);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(404)).toBe(LogLevel.WARN);
    });

    it("should return DEBUG for successful requests (2xx, 3xx)", () => {
      expect(LogLevelDecisionEngine.getNetworkLogLevel(200)).toBe(LogLevel.DEBUG);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(201)).toBe(LogLevel.DEBUG);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(204)).toBe(LogLevel.DEBUG);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(301)).toBe(LogLevel.DEBUG);
      expect(LogLevelDecisionEngine.getNetworkLogLevel(304)).toBe(LogLevel.DEBUG);
    });

    it("should return WARN for slow requests (> 5 seconds)", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel(200, 6000);
      expect(level).toBe(LogLevel.WARN);
    });

    it("should return DEBUG for fast successful requests", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel(200, 1000);
      expect(level).toBe(LogLevel.DEBUG);
    });

    it("should prioritize status code over duration", () => {
      // Even if fast, errors are still errors
      const level = LogLevelDecisionEngine.getNetworkLogLevel(500, 100);
      expect(level).toBe(LogLevel.ERROR);
    });
  });

  describe("getPerformanceLogLevel", () => {
    describe("navigation events", () => {
      it("should return WARN for slow page loads (> 3s)", () => {
        const perfEntry = { type: "navigation", duration: 3500, name: "page-load" };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.WARN);
      });

      it("should return INFO for moderate page loads (> 1s, <= 3s)", () => {
        const perfEntry = { type: "navigation", duration: 2000, name: "page-load" };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.INFO);
      });

      it("should return DEBUG for fast page loads (<= 1s)", () => {
        const perfEntry = { type: "navigation", duration: 800, name: "page-load" };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.DEBUG);
      });
    });

    describe("paint events", () => {
      it("should return WARN for slow paint (> 2s)", () => {
        const perfEntry = { type: "paint", duration: 2500, name: "first-paint" };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.WARN);
      });

      it("should return INFO for moderate paint (> 1s, <= 2s)", () => {
        const perfEntry = { type: "paint", duration: 1500, name: "first-paint" };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.INFO);
      });

      it("should return DEBUG for fast paint (<= 1s)", () => {
        const perfEntry = { type: "paint", duration: 600, name: "first-paint" };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.DEBUG);
      });
    });

    describe("resource events", () => {
      it("should return WARN for slow resources (> 3s)", () => {
        const perfEntry = {
          type: "resource",
          duration: 4000,
          name: "https://cdn.example.com/app.js",
        };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.WARN);
      });

      it("should return INFO for slow critical resources (CSS/JS > 1s)", () => {
        const cssEntry = {
          type: "resource",
          duration: 1500,
          name: "https://cdn.example.com/styles.css",
        };
        const jsEntry = {
          type: "resource",
          duration: 1500,
          name: "https://cdn.example.com/app.js",
        };

        expect(LogLevelDecisionEngine.getPerformanceLogLevel(cssEntry)).toBe(
          LogLevel.INFO
        );
        expect(LogLevelDecisionEngine.getPerformanceLogLevel(jsEntry)).toBe(
          LogLevel.INFO
        );
      });

      it("should return DEBUG for fast resources", () => {
        const perfEntry = {
          type: "resource",
          duration: 500,
          name: "https://cdn.example.com/image.png",
        };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.DEBUG);
      });

      it("should handle resources without CSS/JS in name", () => {
        const perfEntry = {
          type: "resource",
          duration: 1200,
          name: "https://cdn.example.com/image.png",
        };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.DEBUG); // Not critical, so DEBUG
      });
    });

    describe("measure events", () => {
      it("should return INFO for custom performance marks", () => {
        const perfEntry = {
          type: "measure",
          duration: 500,
          name: "custom-operation",
        };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.INFO);
      });
    });

    describe("unknown performance types", () => {
      it("should return DEBUG for unknown types", () => {
        const perfEntry = {
          type: "unknown-type",
          duration: 1000,
          name: "something",
        };
        const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

        expect(level).toBe(LogLevel.DEBUG);
      });
    });
  });

  describe("getInteractionLogLevel", () => {
    it("should return DEBUG for click events", () => {
      const level = LogLevelDecisionEngine.getInteractionLogLevel("click");
      expect(level).toBe(LogLevel.DEBUG);
    });

    it("should return TRACE for scroll events", () => {
      const level = LogLevelDecisionEngine.getInteractionLogLevel("scroll");
      expect(level).toBe(LogLevel.TRACE);
    });

    it("should return TRACE for keypress events", () => {
      const level = LogLevelDecisionEngine.getInteractionLogLevel("keypress");
      expect(level).toBe(LogLevel.TRACE);
    });

    it("should return TRACE for focus events", () => {
      const level = LogLevelDecisionEngine.getInteractionLogLevel("focus");
      expect(level).toBe(LogLevel.TRACE);
    });

    it("should return TRACE for blur events", () => {
      const level = LogLevelDecisionEngine.getInteractionLogLevel("blur");
      expect(level).toBe(LogLevel.TRACE);
    });

    it("should return DEBUG for unknown interaction types", () => {
      const level = LogLevelDecisionEngine.getInteractionLogLevel("custom-event");
      expect(level).toBe(LogLevel.DEBUG);
    });
  });

  describe("getConsoleLogLevel", () => {
    it("should return ERROR for console.error", () => {
      const level = LogLevelDecisionEngine.getConsoleLogLevel("error");
      expect(level).toBe(LogLevel.ERROR);
    });

    it("should return WARN for console.warn", () => {
      const level = LogLevelDecisionEngine.getConsoleLogLevel("warn");
      expect(level).toBe(LogLevel.WARN);
    });

    it("should return INFO for console.log", () => {
      const level = LogLevelDecisionEngine.getConsoleLogLevel("log");
      expect(level).toBe(LogLevel.INFO);
    });

    it("should return INFO for console.info", () => {
      const level = LogLevelDecisionEngine.getConsoleLogLevel("info");
      expect(level).toBe(LogLevel.INFO);
    });
  });

  describe("getPageViewLogLevel", () => {
    it("should always return INFO for page views", () => {
      const level = LogLevelDecisionEngine.getPageViewLogLevel();
      expect(level).toBe(LogLevel.INFO);
    });
  });

  describe("getCustomEventLogLevel", () => {
    describe("business-critical events", () => {
      it("should return INFO for purchase events", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("purchase-completed")).toBe(
          LogLevel.INFO
        );
        expect(
          LogLevelDecisionEngine.getCustomEventLogLevel("user-purchase-initiated")
        ).toBe(LogLevel.INFO);
      });

      it("should return INFO for payment events", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("payment-success")).toBe(
          LogLevel.INFO
        );
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("payment-method-added")).toBe(
          LogLevel.INFO
        );
      });

      it("should return INFO for checkout events", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("checkout-started")).toBe(
          LogLevel.INFO
        );
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("checkout-completed")).toBe(
          LogLevel.INFO
        );
      });
    });

    describe("error-related events", () => {
      it("should return ERROR for events with 'error' in name", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("validation-error")).toBe(
          LogLevel.ERROR
        );
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("api-error")).toBe(
          LogLevel.ERROR
        );
      });

      it("should return ERROR for events with 'fail' in name", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("login-fail")).toBe(
          LogLevel.ERROR
        );
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("upload-failed")).toBe(
          LogLevel.ERROR
        );
      });

      it("should return ERROR for events with 'exception' in name", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("unhandled-exception")).toBe(
          LogLevel.ERROR
        );
      });
    });

    describe("warning-related events", () => {
      it("should return WARN for events with 'warn' in name", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("quota-warning")).toBe(
          LogLevel.WARN
        );
      });

      it("should return WARN for events with 'timeout' in name", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("request-timeout")).toBe(
          LogLevel.WARN
        );
      });

      it("should return WARN for events with 'retry' in name", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("request-retry")).toBe(
          LogLevel.WARN
        );
      });
    });

    describe("default events", () => {
      it("should return INFO for generic custom events", () => {
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("user-clicked-button")).toBe(
          LogLevel.INFO
        );
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("feature-enabled")).toBe(
          LogLevel.INFO
        );
        expect(LogLevelDecisionEngine.getCustomEventLogLevel("custom-metric")).toBe(
          LogLevel.INFO
        );
      });
    });

    describe("priority handling", () => {
      it("should prioritize error over business-critical", () => {
        // "purchase" is business-critical, but "error" takes precedence
        const level = LogLevelDecisionEngine.getCustomEventLogLevel("purchase-error");
        expect(level).toBe(LogLevel.ERROR);
      });

      it("should prioritize error over warning", () => {
        const level = LogLevelDecisionEngine.getCustomEventLogLevel("warning-error");
        expect(level).toBe(LogLevel.ERROR);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings in custom events", () => {
      const level = LogLevelDecisionEngine.getCustomEventLogLevel("");
      expect(level).toBe(LogLevel.INFO);
    });

    it("should be case-sensitive for keyword matching", () => {
      // Current implementation is case-sensitive
      expect(LogLevelDecisionEngine.getCustomEventLogLevel("PURCHASE")).toBe(
        LogLevel.INFO
      );
      expect(LogLevelDecisionEngine.getCustomEventLogLevel("ERROR")).toBe(LogLevel.INFO);

      // Lowercase works
      expect(LogLevelDecisionEngine.getCustomEventLogLevel("purchase")).toBe(
        LogLevel.INFO
      );
      expect(LogLevelDecisionEngine.getCustomEventLogLevel("error")).toBe(LogLevel.ERROR);
    });

    it("should handle performance entries with missing fields", () => {
      const perfEntry = { type: "navigation" }; // No duration
      const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

      expect(level).toBeDefined();
    });

    it("should handle network requests with zero duration", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel(200, 0);
      expect(level).toBe(LogLevel.DEBUG);
    });

    it("should handle very large durations", () => {
      const perfEntry = {
        type: "navigation",
        duration: 999999,
        name: "very-slow",
      };
      const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

      expect(level).toBe(LogLevel.WARN);
    });

    it("should handle negative durations gracefully", () => {
      const perfEntry = { type: "navigation", duration: -100, name: "invalid" };
      const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

      expect(level).toBe(LogLevel.DEBUG); // Falls through to default
    });
  });

  describe("Real-World Scenarios", () => {
    it("should correctly categorize a successful API call", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel(200, 450);
      expect(level).toBe(LogLevel.DEBUG);
    });

    it("should correctly categorize a slow but successful API call", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel(200, 7000);
      expect(level).toBe(LogLevel.WARN);
    });

    it("should correctly categorize a 404 not found", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel(404, 200);
      expect(level).toBe(LogLevel.WARN);
    });

    it("should correctly categorize a server error", () => {
      const level = LogLevelDecisionEngine.getNetworkLogLevel(500, 1000);
      expect(level).toBe(LogLevel.ERROR);
    });

    it("should correctly categorize a fast page load", () => {
      const perfEntry = { type: "navigation", duration: 850, name: "page-load" };
      const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

      expect(level).toBe(LogLevel.DEBUG);
    });

    it("should correctly categorize a slow CSS file", () => {
      const perfEntry = {
        type: "resource",
        duration: 1800,
        name: "https://cdn.example.com/styles.css",
      };
      const level = LogLevelDecisionEngine.getPerformanceLogLevel(perfEntry);

      expect(level).toBe(LogLevel.INFO);
    });

    it("should correctly categorize user scroll events", () => {
      const level = LogLevelDecisionEngine.getInteractionLogLevel("scroll");
      expect(level).toBe(LogLevel.TRACE); // Very low priority
    });

    it("should correctly categorize a payment failure event", () => {
      const level = LogLevelDecisionEngine.getCustomEventLogLevel("payment-failed");
      expect(level).toBe(LogLevel.ERROR); // "failed" matches "fail"
    });

    it("should correctly categorize a checkout timeout warning", () => {
      const level = LogLevelDecisionEngine.getCustomEventLogLevel("checkout-timeout");

      // Both "checkout" (business) and "timeout" (warning) are present
      // Warning takes precedence in current implementation
      expect(level).toBe(LogLevel.WARN);
    });
  });
});
