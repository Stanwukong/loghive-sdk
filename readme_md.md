# RemoteLogger SDK

[![npm version](https://badge.fury.io/js/remote-logger-sdk.svg)](https://badge.fury.io/js/remote-logger-sdk)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful, TypeScript-first logging SDK with automatic error tracking, performance monitoring, and user interaction capture. Similar to Sentry and LogRocket, but with full control over your data.

## ✨ Features

- 🚀 **Zero-config auto-instrumentation** - Start capturing events immediately
- 🐛 **Automatic error tracking** - Uncaught errors and promise rejections
- ⚡ **Performance monitoring** - Page loads, resource timing, Core Web Vitals
- 🌐 **Network request tracking** - Fetch/XHR monitoring with timing
- 👆 **User interaction capture** - Clicks, scrolls, form interactions
- 📊 **Smart log levels** - Intelligent severity based on context
- 🔒 **Privacy-first** - Automatic PII sanitization
- 🎯 **TypeScript support** - Full type safety and IntelliSense
- 📱 **Cross-platform** - Browser and Node.js support
- 🔄 **Reliable delivery** - Batching, retry logic, and graceful degradation

## 🚀 Quick Start

### Installation

```bash
npm install remote-logger-sdk
# or
yarn add remote-logger-sdk
# or
pnpm add remote-logger-sdk
```

### Basic Usage

```typescript
import { RemoteLogger, LogLevel } from "remote-logger-sdk";

// Initialize with auto-instrumentation
const logger = new RemoteLogger({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  environment: "production",
  serviceName: "my-web-app",
});

// Manual logging (optional)
logger.info("User started checkout");
logger.error("Payment failed", new Error("Card declined"));

// Auto-capture is already working!
// - JavaScript errors are automatically captured
// - Network requests are monitored
// - Performance metrics are collected
// - Page views are tracked
```

## 🎯 What Gets Captured Automatically

With zero configuration, the SDK automatically captures:

| Event Type       | Description                                  | Log Level              |
| ---------------- | -------------------------------------------- | ---------------------- |
| **Errors**       | Uncaught exceptions, promise rejections      | `ERROR`                |
| **Performance**  | Page loads, resource timing, Core Web Vitals | `DEBUG`/`INFO`/`WARN`  |
| **Network**      | Fetch/XHR requests with status and timing    | `DEBUG`/`WARN`/`ERROR` |
| **Page Views**   | Navigation and SPA route changes             | `INFO`                 |
| **Console**      | `console.error()` and `console.warn()` calls | `ERROR`/`WARN`         |
| **Interactions** | User clicks, scrolls (optional)              | `DEBUG`/`TRACE`        |

## ⚙️ Configuration

### Auto-Capture Settings

```typescript
const logger = new RemoteLogger({
  apiKey: "your-api-key",
  projectId: "your-project-id",

  // Configure what gets captured automatically
  autoCapture: {
    errors: true, // Uncaught errors (recommended)
    performance: true, // Performance metrics (recommended)
    networkRequests: true, // HTTP requests (recommended)
    pageViews: true, // Page navigation (recommended)
    consoleMessages: false, // Console.error/warn (can be noisy)
    userInteractions: false, // Clicks, scrolls (very verbose)

    // Customize log levels
    logLevels: {
      networkSuccess: LogLevel.TRACE, // Quiet successful requests
      performanceFast: LogLevel.TRACE, // Quiet fast performance
      interactions: LogLevel.DEBUG, // User interactions
      console: {
        error: LogLevel.FATAL, // Escalate console errors
        warn: LogLevel.ERROR, // Escalate console warnings
      },
    },
  },
});
```

### Environment-Specific Configs

```typescript
// Development
const devLogger = new RemoteLogger({
  apiKey: "dev-key",
  projectId: "dev-project",
  environment: "development",
  minLogLevel: LogLevel.DEBUG,
  autoCapture: {
    errors: true,
    userInteractions: true, // Useful for debugging
    consoleMessages: true, // Capture all console output
  },
});

// Production
const prodLogger = new RemoteLogger({
  apiKey: "prod-key",
  projectId: "prod-project",
  environment: "production",
  minLogLevel: LogLevel.WARN, // Only warnings and errors
  autoCapture: {
    errors: true,
    performance: true,
    networkRequests: true,
    userInteractions: false, // Reduce noise
    consoleMessages: false, // Skip in production
  },
});
```

## 📊 Advanced Features

### Context Management

```typescript
// Set global context (included in all logs)
logger.setContext({
  userId: "12345",
  feature: "checkout",
  experimentId: "ab-test-v2",
});

// Context is automatically included in all events
logger.error("Payment failed"); // Will include userId, feature, etc.
```

### Enhanced Logging Methods

```typescript
// Capture exceptions with context
logger.captureException(new Error("Something broke"), {
  component: "PaymentForm",
  action: "submit",
});

// Add breadcrumbs for debugging
logger.addBreadcrumb("User clicked pay button", "user-action");

// Capture messages with custom levels
logger.captureMessage("Custom event occurred", LogLevel.INFO, {
  customData: "value",
});
```

### Framework Integration

#### React Error Boundary

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: any) {
    logger.captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }
}
```

#### Vue.js Error Handler

```typescript
app.config.errorHandler = (error, instance, info) => {
  logger.captureException(error, {
    vueInfo: info,
    component: instance?.$options.name,
  });
};
```

## 🔒 Privacy & Security

The SDK automatically protects sensitive data:

- **URL Sanitization** - Removes `token`, `key`, `password`, `secret` query parameters
- **Form Protection** - Keyboard events don't capture actual keystrokes
- **Element Safety** - Uses CSS selectors, not text content
- **No Storage** - No localStorage/sessionStorage usage

## 📈 Performance Impact

- **Bundle Size**: ~50KB gzipped
- **Memory Usage**: Minimal buffer overhead
- **Network**: Efficient batching reduces HTTP requests
- **CPU**: Throttled event capture, optimized observers

## 🛠️ Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/remote-logger-sdk.git
cd remote-logger-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📖 Documentation

- [Full Documentation](https://docs.remotelogger.com)
- [API Reference](https://docs.remotelogger.com/api)
- [Integration Guides](https://docs.remotelogger.com/integrations)
- [Examples](https://github.com/your-org/remote-logger-examples)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@remotelogger.com
- 💬 Discord: [Join our community](https://discord.gg/remotelogger)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/remote-logger-sdk/issues)
- 📚 Docs: [Documentation](https://docs.remotelogger.com)

## 🚀 Roadmap

- [ ] React Native support
- [ ] Expo integration
- [ ] Advanced session replay
- [ ] Custom dashboard widgets
- [ ] Slack/Teams integrations
- [ ] GraphQL request tracing

---

**Made with ❤️ by the RemoteLogger team**
