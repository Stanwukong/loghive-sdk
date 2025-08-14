# Monita SDK

A powerful, intelligent TypeScript SDK for sending application logs to your monita logging platform. Features automatic instrumentation, smart log levels, performance monitoring, and comprehensive framework integrations for real-time application monitoring and debugging.

## 🚀 Quick Start

### Installation

```bash
npm install monita
```

### Basic Usage

```typescript
import { Monita } from 'monita';

// Initialize the logger
const logger = new Monita({
  apiKey: 'your-api-key-here',
  projectId: 'your-project-id-here',
  endpoint: 'https://your-logging-platform.com/api/v1'
});
```

#### 4. Performance Impact
```typescript
// Optimize for high-performance applications
const logger = new Monita({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  batchSize: 100,         // Larger batches
  flushIntervalMs: 1000,  // More frequent flushing
  maxRetries: 1,          // Fewer retries
  
  autoCapture: {
    errors: true,
    performance: false,    // Disable if causing overhead
    userInteractions: false, // Very frequent events
    networkRequests: true,
    
    logLevels: {
      // Make most auto-logs very quiet
      networkSuccess: LogLevel.TRACE,
      performanceFast: LogLevel.TRACE,
      interactions: LogLevel.TRACE
    }
  }
});
```

#### 5. Environment-Specific Issues
```typescript
// Different configs for different environments
const config = {
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  endpoint: process.env.MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV,
  
  // Production: less verbose, more performance-focused
  ...(process.env.NODE_ENV === 'production' && {
    minLogLevel: LogLevel.WARN,
    batchSize: 50,
    autoCapture: {
      errors: true,
      performance: true,
      userInteractions: false,
      networkRequests: true,
      consoleMessages: false,
      pageViews: true
    }
  }),
  
  // Development: more verbose, more debugging info
  ...(process.env.NODE_ENV === 'development' && {
    minLogLevel: LogLevel.DEBUG,
    batchSize: 5,
    flushIntervalMs: 1000,
    autoCapture: {
      errors: true,
      performance: true,
      userInteractions: true,
      networkRequests: true,
      consoleMessages: true,
      pageViews: true
    }
  })
};
```

### Debug Mode

Enable debug logging to see what's happening:

```typescript
// The SDK automatically logs its status to console
// Look for messages like:
// "Monita: Successfully sent 3 logs."
// "Monita: API Error 401 on attempt 1: Unauthorized"
// "Monita: Retrying in 2000ms... (Attempt 2 of 3)"
// "Monita: Auto-instrumentation initialized"
// "Monita: Performance observer setup completed"
```

## 📚 Examples

### E-commerce Application

```typescript
import { Monita, LogLevel } from 'monita';
import { createEnhancedLogger } from 'monita/advanced-features';

// Enhanced logger with all features
const { 
  logger, 
  contextManager, 
  sessionManager, 
  eventTracker, 
  performanceMonitor,
  abTestLogger 
} = createEnhancedLogger({
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  environment: process.env.NODE_ENV,
  serviceName: 'ecommerce-frontend',
  autoCapture: {
    errors: true,
    performance: true,
    userInteractions: true,
    networkRequests: true,
    pageViews: true
  }
});

class EcommerceTracker {
  constructor() {
    // Set up user context when they log in
    this.setupUserContext();
  }

  setupUserContext() {
    const user = getCurrentUser();
    if (user) {
      logger.setContext({
        userId: user.id,
        userEmail: user.email,
        userTier: user.tier,
        signupDate: user.signupDate
      });

      sessionManager.renewSession();
    }
  }

  // Track product views
  trackProductView(productId: string, categoryId: string) {
    eventTracker.trackEvent('product_viewed', {
      productId,
      categoryId,
      timestamp: Date.now()
    });

    logger.info('Product viewed', {
      productId,
      categoryId,
      eventType: 'product_interaction'
    });
  }

  // Track cart operations
  trackAddToCart(productId: string, quantity: number, price: number) {
    eventTracker.trackEvent('add_to_cart', {
      productId,
      quantity,
      price,
      totalValue: quantity * price
    });

    logger.info('Item added to cart', {
      productId,
      quantity,
      price,
      eventType: 'cart_interaction'
    });
  }

  // Track checkout funnel
  async trackCheckoutStep(step: string, data: any) {
    const startTime = Date.now();
    
    try {
      // Track funnel step
      eventTracker.trackFunnelStep('checkout', step, true, data);
      
      // Add performance monitoring
      performanceMonitor.mark(`checkout_${step}_start`);
      
      // Process the step
      await this.processCheckoutStep(step, data);
      
      const duration = performanceMonitor.measure(`checkout_${step}`, `checkout_${step}_start`);
      
      logger.info(`Checkout step completed: ${step}`, {
        step,
        duration,
        success: true,
        ...data
      });

    } catch (error) {
      eventTracker.trackFunnelStep('checkout', step, false, { error: error.message });
      
      logger.error(`Checkout step failed: ${step}`, error, {
        step,
        duration: Date.now() - startTime,
        ...data
      });
      
      throw error;
    }
  }

  // Track purchases with A/B test context
  trackPurchase(orderId: string, items: any[], total: number) {
    // Log A/B test conversion
    abTestLogger.logConversion('checkout_flow_v2', 'purchase', total);
    
    eventTracker.trackEvent('purchase_completed', {
      orderId,
      itemCount: items.length,
      totalValue: total,
      timestamp: Date.now()
    });

    logger.info('Purchase completed', {
      orderId,
      items: items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      totalValue: total,
      eventType: 'conversion'
    });

    // Track business metrics
    eventTracker.trackMetric('revenue', total, 'USD');
    eventTracker.trackMetric('order_size', items.length, 'items');
  }

  // Track search behavior
  trackSearch(query: string, results: number, filters?: any) {
    eventTracker.trackEvent('search_performed', {
      query,
      resultCount: results,
      filters,
      timestamp: Date.now()
    });

    const logLevel = results === 0 ? LogLevel.WARN : LogLevel.INFO;
    logger._log(logLevel, 'Search performed', undefined, {
      query,
      resultCount: results,
      filters,
      eventType: 'search'
    });
  }

  // Track errors with context
  trackError(error: Error, context: any) {
    contextManager.withContext(context, () => {
      logger.captureException(error, {
        errorContext: context,
        userAction: 'ecommerce_operation',
        timestamp: Date.now()
      });
    });
  }

  private async processCheckoutStep(step: string, data: any) {
    // Implementation details...
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Usage in React component
const tracker = new EcommerceTracker();

function ProductPage({ productId, categoryId }: { productId: string, categoryId: string }) {
  useEffect(() => {
    tracker.trackProductView(productId, categoryId);
  }, [productId, categoryId]);

  const handleAddToCart = async (quantity: number, price: number) => {
    try {
      tracker.trackAddToCart(productId, quantity, price);
      await addToCartAPI(productId, quantity);
      
      logger.info('Add to cart successful', {
        productId,
        quantity,
        price
      });
    } catch (error) {
      tracker.trackError(error as Error, {
        action: 'add_to_cart',
        productId,
        quantity
      });
    }
  };

  return (
    <div>
      <ProductDetails productId={productId} />
      <button onClick={() => handleAddToCart(1, 29.99)}>
        Add to Cart
      </button>
    </div>
  );
}
```

### Microservices Architecture

```typescript
// shared/logger.ts
import { Monita } from 'monita';

export const createServiceLogger = (serviceName: string) => {
  return new Monita({
    apiKey: process.env.MONITA_API_KEY!,
    projectId: process.env.MONITA_PROJECT_ID!,
    endpoint: process.env.MONITA_ENDPOINT!,
    environment: process.env.NODE_ENV || 'development',
    serviceName,
    serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
    
    autoCapture: {
      errors: true,
      performance: false, // Server-side, handle manually
      networkRequests: false, // Handle manually for service-to-service calls
      consoleMessages: process.env.NODE_ENV === 'development'
    }
  });
};

// services/user-service/index.ts
import { createServiceLogger } from '../../shared/logger';

const logger = createServiceLogger('user-service');

export class UserService {
  async getUser(userId: string, requestId: string) {
    const startTime = Date.now();
    
    logger.setContext({ requestId });
    
    try {
      logger.info('Getting user', { userId });
      
      const user = await this.database.users.findById(userId);
      
      if (!user) {
        logger.warn('User not found', { userId });
        throw new Error('User not found');
      }
      
      logger.info('User retrieved successfully', {
        userId,
        userEmail: user.email,
        duration: Date.now() - startTime
      });
      
      return user;
    } catch (error) {
      logger.error('Failed to get user', error, {
        userId,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  async updateUser(userId: string, updates: any, requestId: string) {
    logger.setContext({ requestId });
    
    try {
      // Log service-to-service call
      await this.auditService.logUserUpdate(userId, updates);
      
      const result = await this.database.users.update(userId, updates);
      
      logger.info('User updated', {
        userId,
        updatedFields: Object.keys(updates),
        eventType: 'user_modification'
      });
      
      return result;
    } catch (error) {
      logger.error('User update failed', error, { userId, updates });
      throw error;
    }
  }
}

// services/order-service/index.ts
const logger = createServiceLogger('order-service');

export class OrderService {
  async createOrder(orderData: any, requestId: string) {
    const startTime = Date.now();
    
    logger.setContext({ 
      requestId,
      userId: orderData.userId,
      orderValue: orderData.total
    });
    
    try {
      logger.info('Creating order', {
        userId: orderData.userId,
        itemCount: orderData.items.length,
        total: orderData.total
      });

      // Service-to-service calls with logging
      const user = await this.callUserService(orderData.userId, requestId);
      const inventory = await this.callInventoryService(orderData.items, requestId);
      
      const order = await this.database.orders.create(orderData);
      
      logger.info('Order created successfully', {
        orderId: order.id,
        userId: orderData.userId,
        total: orderData.total,
        duration: Date.now() - startTime,
        eventType: 'order_created'
      });
      
      // Trigger downstream events
      await this.publishOrderEvent(order, requestId);
      
      return order;
    } catch (error) {
      logger.error('Order creation failed', error, {
        userId: orderData.userId,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  private async callUserService(userId: string, requestId: string) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${USER_SERVICE_URL}/users/${userId}`, {
        headers: {
          'X-Request-ID': requestId,
          'X-Service': 'order-service'
        }
      });
      
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        logger.error('User service call failed', undefined, {
          service: 'user-service',
          statusCode: response.status,
          duration,
          userId
        });
        throw new Error(`User service error: ${response.status}`);
      }
      
      logger.debug('User service call successful', {
        service: 'user-service',
        statusCode: response.status,
        duration,
        userId
      });
      
      return response.json();
    } catch (error) {
      logger.error('User service call exception', error, {
        service: 'user-service',
        duration: Date.now() - startTime,
        userId
      });
      throw error;
    }
  }
}

// api-gateway/middleware.ts
import { createServiceLogger } from '../shared/logger';

const logger = createServiceLogger('api-gateway');

export const requestLoggingMiddleware = (req: any, res: any, next: any) => {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  const startTime = Date.now();
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  logger.setContext({ requestId });
  
  logger.info('API Gateway request', {
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    requestId
  });

  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    logger.info('API Gateway response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      requestId,
      responseSize: data ? data.length : 0
    });
    
    return originalSend.call(this, data);
  };

  next();
};
```

### Real-time Monitoring Dashboard

```typescript
// monitoring/dashboard.ts
import { Monita } from 'monita';
import { createEnhancedLogger } from 'monita/advanced-features';

const { logger, eventTracker, performanceMonitor } = createEnhancedLogger({
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  serviceName: 'monitoring-dashboard',
  autoCapture: {
    errors: true,
    performance: true,
    networkRequests: true,
    pageViews: true
  }
});

class DashboardMonitor {
  private metricsCache = new Map();
  private alertThresholds = {
    errorRate: 0.05,      // 5%
    responseTime: 2000,   // 2 seconds
    memoryUsage: 0.85     // 85%
  };

  async startMonitoring() {
    logger.info('Dashboard monitoring started');
    
    // Monitor system metrics
    setInterval(() => this.collectSystemMetrics(), 30000); // Every 30s
    
    // Monitor application metrics
    setInterval(() => this.collectApplicationMetrics(), 60000); // Every minute
    
    // Check alert conditions
    setInterval(() => this.checkAlerts(), 10000); // Every 10s
  }

  private async collectSystemMetrics() {
    try {
      const metrics = await this.getSystemMetrics();
      
      eventTracker.trackMetric('cpu_usage', metrics.cpu, 'percent');
      eventTracker.trackMetric('memory_usage', metrics.memory, 'percent');
      eventTracker.trackMetric('disk_usage', metrics.disk, 'percent');
      
      logger.debug('System metrics collected', {
        cpu: metrics.cpu,
        memory: metrics.memory,
        disk: metrics.disk,
        timestamp: Date.now()
      });
      
      this.metricsCache.set('system', metrics);
    } catch (error) {
      logger.error('Failed to collect system metrics', error);
    }
  }

  private async collectApplicationMetrics() {
    try {
      const metrics = await this.getApplicationMetrics();
      
      eventTracker.trackMetric('active_users', metrics.activeUsers, 'count');
      eventTracker.trackMetric('requests_per_minute', metrics.rpm, 'requests');
      eventTracker.trackMetric('error_rate', metrics.errorRate, 'percent');
      eventTracker.trackMetric('avg_response_time', metrics.avgResponseTime, 'ms');
      
      logger.info('Application metrics collected', {
        activeUsers: metrics.activeUsers,
        requestsPerMinute: metrics.rpm,
        errorRate: metrics.errorRate,
        avgResponseTime: metrics.avgResponseTime,
        eventType: 'metrics_collection'
      });
      
      this.metricsCache.set('application', metrics);
    } catch (error) {
      logger.error('Failed to collect application metrics', error);
    }
  }

  private async checkAlerts() {
    const systemMetrics = this.metricsCache.get('system');
    const appMetrics = this.metricsCache.get('application');
    
    if (!systemMetrics || !appMetrics) return;
    
    // Check error rate alert
    if (appMetrics.errorRate > this.alertThresholds.errorRate) {
      logger.error('High error rate detected', undefined, {
        currentErrorRate: appMetrics.errorRate,
        threshold: this.alertThresholds.errorRate,
        alertType: 'error_rate',
        severity: 'high'
      });
      
      eventTracker.trackEvent('alert_triggered', {
        type: 'error_rate',
        severity: 'high',
        value: appMetrics.errorRate,
        threshold: this.alertThresholds.errorRate
      });
    }
    
    // Check response time alert
    if (appMetrics.avgResponseTime > this.alertThresholds.responseTime) {
      logger.warn('Slow response time detected', {
        currentResponseTime: appMetrics.avgResponseTime,
        threshold: this.alertThresholds.responseTime,
        alertType: 'response_time',
        severity: 'medium'
      });
      
      eventTracker.trackEvent('alert_triggered', {
        type: 'response_time',
        severity: 'medium',
        value: appMetrics.avgResponseTime,
        threshold: this.alertThresholds.responseTime
      });
    }
    
    // Check memory usage alert
    if (systemMetrics.memory > this.alertThresholds.memoryUsage) {
      logger.error('High memory usage detected', undefined, {
        currentMemoryUsage: systemMetrics.memory,
        threshold: this.alertThresholds.memoryUsage,
        alertType: 'memory_usage',
        severity: 'high'
      });
    }
  }

  private async getSystemMetrics() {
    // Implementation to get system metrics
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100
    };
  }

  private async getApplicationMetrics() {
    // Implementation to get application metrics
    return {
      activeUsers: Math.floor(Math.random() * 1000),
      rpm: Math.floor(Math.random() * 10000),
      errorRate: Math.random() * 0.1,
      avgResponseTime: Math.random() * 3000
    };
  }
}

// Start monitoring
const monitor = new DashboardMonitor();
monitor.startMonitoring();
```

## 🚀 Getting Started Checklist

1. **Install the SDK**
   ```bash
   npm install monita
   ```

2. **Get your credentials**
   - API Key from your Monita dashboard
   - Project ID from your project settings
   - Endpoint URL (or use default)

3. **Basic setup**
   ```typescript
   import { Monita } from 'monita';
   
   const logger = new Monita({
     apiKey: process.env.MONITA_API_KEY!,
     projectId: process.env.MONITA_PROJECT_ID!,
     environment: process.env.NODE_ENV
   });
   ```

4. **Enable auto-instrumentation**
   ```typescript
   const logger = new Monita({
     // ... config
     autoCapture: {
       errors: true,
       performance: true,
       networkRequests: true,
       pageViews: true
     }
   });
   ```

5. **Add structured logging**
   ```typescript
   logger.info('User action', {
     userId: 123,
     action: 'login',
     timestamp: Date.now()
   });
   ```

6. **Set up graceful shutdown**
   ```typescript
   process.on('SIGTERM', async () => {
     await logger.shutdown();
     process.exit(0);
   });
   ```

## 🤝 Support & Contributing

- **Documentation**: Full API reference and guides
- **Issues**: Report bugs and request features
- **Community**: Join our Discord for support
- **Enterprise**: Contact sales for enterprise features

---

**Happy Logging!** 🎉

*This SDK makes it easy to monitor your applications and debug issues with intelligent, structured logs sent directly to your logging platform. With automatic instrumentation, smart log levels, and framework integrations, you get comprehensive insights into your application's behavior with minimal setup.*

// Start logging!
logger.info('Application started successfully');
logger.error('Something went wrong', new Error('Database connection failed'));
```

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Logging](#basic-logging)
- [Auto-Instrumentation](#auto-instrumentation)
- [Framework Integrations](#framework-integrations)
- [Advanced Features](#advanced-features)
- [Performance Monitoring](#performance-monitoring)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## 🛠 Configuration

### Required Configuration

```typescript
const logger = new Monita({
  apiKey: 'your-api-key-here',        // Your API authentication key
  projectId: 'your-project-id-here',  // Your project identifier
  endpoint: 'https://api.yourlogger.com/api/v1' // Your logging platform URL
});
```

### Full Configuration Options

```typescript
const logger = new Monita({
  // Required
  apiKey: 'your-api-key-here',
  projectId: 'your-project-id-here',
  endpoint: 'https://api.yourlogger.com/api/v1',
  
  // Optional - Logging behavior
  minLogLevel: LogLevel.INFO,          // Minimum level to log (default: INFO)
  batchSize: 10,                       // Number of logs to batch together (default: 10)
  flushIntervalMs: 5000,               // How often to send logs in ms (default: 5000)
  
  // Optional - Retry configuration
  maxRetries: 3,                       // Max retry attempts (default: 3)
  retryDelayMs: 1000,                  // Initial retry delay in ms (default: 1000)
  
  // Optional - Metadata
  environment: 'production',           // Environment name (default: 'development')
  serviceName: 'my-awesome-app',       // Service name (default: 'unknown-service')
  serviceVersion: '2.1.0',             // Service version (default: '1.0.0')
  
  // Optional - Auto-instrumentation
  autoCapture: {
    errors: true,                      // Capture uncaught errors (default: true)
    performance: true,                 // Capture performance metrics (default: true)
    userInteractions: false,           // Capture user interactions (default: false)
    networkRequests: true,             // Capture network requests (default: true)
    consoleMessages: false,            // Capture console messages (default: false)
    pageViews: true,                   // Capture page views (default: true)
    
    // Custom log level overrides
    logLevels: {
      errors: LogLevel.ERROR,          // Override error log level
      networkSuccess: LogLevel.DEBUG,  // Override successful network requests
      networkError: LogLevel.ERROR,    // Override failed network requests
      performanceSlow: LogLevel.WARN,   // Override slow performance metrics
      performanceFast: LogLevel.DEBUG,  // Override fast performance metrics
      interactions: LogLevel.TRACE,     // Override user interactions
      pageViews: LogLevel.INFO,         // Override page views
      console: {
        error: LogLevel.ERROR,          // Override console.error
        warn: LogLevel.WARN,            // Override console.warn
        info: LogLevel.INFO,            // Override console.info
      }
    }
  }
});
```

## 📝 Basic Logging

### Log Levels

The SDK supports 6 log levels (from lowest to highest priority):

```typescript
import { LogLevel } from 'monita';

logger.trace('Very detailed debug information');    // TRACE
logger.debug('Debug information for developers');   // DEBUG  
logger.info('General information about app flow');  // INFO
logger.warn('Warning - something might be wrong');  // WARN
logger.error('Error occurred but app can continue'); // ERROR
logger.fatal('Critical error - app might crash');   // FATAL
```

### Simple Logging

```typescript
// Basic message logging
logger.info('User logged in successfully');
logger.warn('API rate limit approaching');
logger.error('Failed to process payment');
```

### Logging with Data

```typescript
// Add structured data to your logs
logger.info('User action performed', {
  userId: 12345,
  action: 'file_upload',
  fileName: 'document.pdf',
  fileSize: 2048576
});

logger.error('Database query failed', {
  query: 'SELECT * FROM users WHERE id = ?',
  parameters: [userId],
  executionTime: 1500
});
```

### Logging Errors

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Log the actual error object for full stack trace
  logger.error('Operation failed', error, {
    operation: 'user_registration',
    userId: 12345,
    timestamp: new Date().toISOString()
  });
}
```

### Enhanced Error Capture

```typescript
// Capture exceptions with context
logger.captureException(new Error('Something went wrong'), {
  userId: 12345,
  feature: 'checkout'
});

// Capture custom messages
logger.captureMessage('Custom business event occurred', LogLevel.INFO, {
  eventType: 'business_metric',
  value: 100
});

// Add breadcrumbs for debugging
logger.addBreadcrumb('User clicked checkout button', 'ui', {
  buttonId: 'checkout-btn',
  cartValue: 299.99
});
```

## 🤖 Auto-Instrumentation

The SDK automatically captures various events and metrics when enabled:

### Error Monitoring

```typescript
const logger = new Monita({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  autoCapture: {
    errors: true, // Captures uncaught errors and promise rejections
  }
});

// Automatically captures:
// - Uncaught JavaScript errors
// - Unhandled promise rejections
// - Error details with stack traces
```

### Performance Monitoring

```typescript
const logger = new Monita({
  autoCapture: {
    performance: true, // Captures Core Web Vitals and resource timing
  }
});

// Automatically captures:
// - Page load performance
// - Resource loading times
// - Paint metrics (FCP, LCP)
// - Navigation timing
// - Custom performance marks
```

### Network Request Monitoring

```typescript
const logger = new Monita({
  autoCapture: {
    networkRequests: true, // Captures fetch and XMLHttpRequest
  }
});

// Automatically captures:
// - HTTP status codes
// - Request/response times
// - URL sanitization (removes sensitive params)
// - Request methods and sizes
```

### User Interaction Tracking

```typescript
const logger = new Monita({
  autoCapture: {
    userInteractions: true, // Captures user interactions
  }
});

// Automatically captures:
// - Click events with element selectors
// - Scroll events (throttled)
// - Focus/blur events
// - Keyboard interactions (sanitized)
```

### Smart Log Levels

The SDK automatically determines appropriate log levels based on event severity:

```typescript
// Network requests:
// - 2xx responses: DEBUG
// - 4xx responses: WARN  
// - 5xx responses: ERROR
// - Slow requests (>5s): WARN

// Performance metrics:
// - Fast page loads (<1s): DEBUG
// - Moderate loads (1-3s): INFO
// - Slow loads (>3s): WARN

// User interactions:
// - Clicks: DEBUG
// - Scrolls/keypresses: TRACE
```

## 🌐 Framework Integrations

### React Applications

```typescript
// logger.ts
import { Monita, LogLevel } from 'monita';

export const logger = new Monita({
  apiKey: process.env.REACT_APP_MONITA_API_KEY!,
  projectId: process.env.REACT_APP_MONITA_PROJECT_ID!,
  endpoint: process.env.REACT_APP_MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV,
  serviceName: 'react-frontend',
  minLogLevel: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  autoCapture: {
    errors: true,
    performance: true,
    userInteractions: true,
    networkRequests: true,
    pageViews: true,
  }
});

// App.tsx
import React, { useEffect } from 'react';
import { logger } from './logger';

function App() {
  useEffect(() => {
    logger.info('React App mounted', {
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    return () => {
      logger.info('React App unmounting');
    };
  }, []);

  const handleError = (error: Error, errorInfo: any) => {
    logger.captureException(error, {
      component: 'App',
      errorInfo,
      reactVersion: React.version
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <YourAppContent />
    </ErrorBoundary>
  );
}
```

### Next.js Applications

```typescript
// lib/logger.ts
import { Monita } from 'monita';

export const logger = new Monita({
  apiKey: process.env.NEXT_PUBLIC_MONITA_API_KEY!,
  projectId: process.env.NEXT_PUBLIC_MONITA_PROJECT_ID!,
  endpoint: process.env.NEXT_PUBLIC_MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV,
  serviceName: 'nextjs-app',
  autoCapture: {
    errors: true,
    performance: true,
    networkRequests: true,
    pageViews: true,
  }
});

// pages/_app.tsx
import { logger } from '../lib/logger';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      logger.info('Page view', {
        url,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  return <Component {...pageProps} />;
}

// API Route - pages/api/users.ts
import { logger } from '../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  try {
    logger.info('API request started', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']
    });

    const result = await getUserData(req.query.id);
    
    logger.info('API request completed', {
      method: req.method,
      url: req.url,
      duration: Date.now() - startTime,
      statusCode: 200
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error('API request failed', error, {
      method: req.method,
      url: req.url,
      duration: Date.now() - startTime,
      statusCode: 500
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Express.js Server

```typescript
import express from 'express';
import { Monita, LogLevel } from 'monita';

const app = express();
const logger = new Monita({
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  endpoint: process.env.MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV,
  serviceName: 'express-api',
  autoCapture: {
    errors: true,
    performance: false, // Not applicable for server-side
    networkRequests: false, // Handle manually for server
  }
});

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.get('X-Request-ID')
  });

  res.on('finish', () => {
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: Date.now() - startTime,
      requestId: req.get('X-Request-ID')
    });
  });

  next();
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error', error, {
    method: req.method,
    url: req.url,
    requestId: req.get('X-Request-ID'),
    userAgent: req.get('User-Agent')
  });

  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Server shutting down');
  await logger.shutdown();
  process.exit(0);
});
```

### Vue.js Applications

```typescript
// plugins/logger.ts
import { Monita } from 'monita';

export const logger = new Monita({
  apiKey: process.env.VUE_APP_MONITA_API_KEY!,
  projectId: process.env.VUE_APP_MONITA_PROJECT_ID!,
  endpoint: process.env.VUE_APP_MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV,
  serviceName: 'vue-frontend',
  autoCapture: {
    errors: true,
    performance: true,
    userInteractions: true,
    networkRequests: true,
    pageViews: true,
  }
});

// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { logger } from './plugins/logger';

const app = createApp(App);

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  logger.captureException(error as Error, {
    component: instance?.$options.name,
    errorInfo: info,
    vueVersion: app.version
  });
};

// Router integration
import { createRouter } from 'vue-router';

const router = createRouter({
  // ... router config
});

router.afterEach((to, from) => {
  logger.info('Vue route change', {
    to: to.path,
    from: from.path,
    name: to.name
  });
});

app.use(router);
app.mount('#app');
```

### Node.js/TypeScript Backend

```typescript
// logger.ts
import { Monita } from 'monita';

export const logger = new Monita({
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  endpoint: process.env.MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV || 'development',
  serviceName: 'backend-service',
  serviceVersion: process.env.npm_package_version || '1.0.0',
});

// Service class example
export class UserService {
  async createUser(userData: any) {
    const startTime = Date.now();
    
    try {
      logger.info('Creating user', { email: userData.email });
      
      const user = await this.database.users.create(userData);
      
      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
        duration: Date.now() - startTime
      });
      
      return user;
    } catch (error) {
      logger.error('Failed to create user', error, {
        email: userData.email,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }
}

// Global error handling
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason as Error, {
    promise: promise.toString()
  });
});
```

## 🎯 Advanced Features

### Context Management

```typescript
import { ContextManager } from 'monita/advanced-features';

const contextManager = new ContextManager(logger);

// Set global context
logger.setContext({
  userId: 12345,
  sessionId: 'abc-123-def',
  version: '1.2.3'
});

// Temporary context for specific operations
contextManager.withContext({ feature: 'checkout' }, () => {
  logger.info('Processing payment'); // Includes checkout context
  // Context automatically restored after function
});

// Stack-based context management
contextManager.pushContext({ requestId: 'req-123' });
logger.info('Request started'); // Includes requestId
contextManager.popContext(); // Removes requestId
```

### Session Management

```typescript
import { SessionManager } from 'monita/advanced-features';

const sessionManager = new SessionManager(logger);

// Automatically adds session info to all logs
logger.info('User action'); // Includes sessionId and sessionStart

// Renew session
sessionManager.renewSession();

// End session
sessionManager.endSession();
```

### Custom Event Tracking

```typescript
import { CustomEventTracker } from 'monita/advanced-features';

const eventTracker = new CustomEventTracker(logger);

// Track business events
eventTracker.trackEvent('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  productId: 'prod-123'
});

// Track user actions with timing
const startTime = Date.now();
// ... user action ...
eventTracker.trackUserAction('file_upload', 'upload-button', {
  start: startTime,
  end: Date.now()
});

// Track metrics
eventTracker.trackMetric('response_time', 250, 'ms');

// Track conversion funnel
eventTracker.trackFunnelStep('checkout', 'payment_info', true, {
  paymentMethod: 'credit_card'
});
```

### Performance Monitoring Extensions

```typescript
import { PerformanceMonitor } from 'monita/advanced-features';

const perfMonitor = new PerformanceMonitor(logger);

// Measure operation performance
perfMonitor.mark('database_query_start');
await performDatabaseQuery();
const duration = perfMonitor.measure('database_query', 'database_query_start');

// Log Web Vitals
perfMonitor.logWebVital('LCP', 1200); // Largest Contentful Paint
perfMonitor.logWebVital('FID', 50);   // First Input Delay
perfMonitor.logWebVital('CLS', 0.1);  // Cumulative Layout Shift
```

### Feature Flag Integration

```typescript
import { FeatureFlagLogger } from 'monita/advanced-features';

const flagLogger = new FeatureFlagLogger(logger);

// Log feature flag evaluations
flagLogger.logFlagEvaluation('new_checkout_flow', true, 'user-123');

// Log feature flag impact
flagLogger.logFlagImpact('new_checkout_flow', 'conversion_rate_increase', {
  oldRate: 0.12,
  newRate: 0.15,
  improvement: 0.03
});
```

### A/B Test Integration

```typescript
import { ABTestLogger } from 'monita/advanced-features';

const abTestLogger = new ABTestLogger(logger);

// Log test assignments
abTestLogger.logTestAssignment('checkout_button_color', 'red', 'user-123');

// Log conversions
abTestLogger.logConversion('checkout_button_color', 'purchase', 99.99);
```

### Rate Limiting

```typescript
import { RateLimiter } from 'monita/advanced-features';

const rateLimiter = new RateLimiter(10, 60000); // 10 events per minute

if (rateLimiter.shouldAllow('noisy_event')) {
  logger.debug('This event is rate limited');
}
```

## ⚠️ Error Handling

The SDK handles errors gracefully and won't crash your application:

```typescript
// Network errors are handled automatically with retries
logger.info('This log will be retried if network fails');

// Authentication errors are logged but won't throw
// Check console for error messages like:
// "Monita: Authentication/Authorization failed. Check API Key."

// Failed logs are re-queued for later attempts
// You'll see: "Monita: Failed to send logs after retries. Re-adding to buffer."
```

### Smart Log Level Decision Engine

The SDK uses intelligent log level determination:

```typescript
// Error events - Always ERROR level
logger.captureException(new Error('Critical failure')); // ERROR

// Network events - Based on status
// 2xx responses: DEBUG
// 4xx responses: WARN  
// 5xx responses: ERROR
// Slow requests (>5s): WARN

// Performance events - Based on metrics
// Fast page loads (<1s): DEBUG
// Moderate loads (1-3s): INFO
// Slow loads (>3s): WARN

// User interactions - Generally low priority
// Clicks: DEBUG
// Scrolls/keypresses: TRACE
```

## 💡 Best Practices

### 1. Environment-Based Configuration

```typescript
// logger.ts
import { Monita, LogLevel } from 'monita';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = new Monita({
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  endpoint: process.env.MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'unknown-service',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  
  // Adjust behavior by environment
  minLogLevel: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
  batchSize: isProduction ? 20 : 5,
  flushIntervalMs: isProduction ? 10000 : 2000,
  
  autoCapture: {
    errors: true,
    performance: isProduction, // Only in production
    userInteractions: isDevelopment, // Only in development
    networkRequests: true,
    consoleMessages: isDevelopment,
    pageViews: true,
    
    logLevels: {
      // More aggressive in production
      networkSuccess: isProduction ? LogLevel.TRACE : LogLevel.DEBUG,
      performanceFast: isProduction ? LogLevel.TRACE : LogLevel.DEBUG,
      interactions: LogLevel.TRACE,
    }
  }
});
```

### 2. Structured Logging

```typescript
// ❌ Avoid unstructured logs
logger.info(`User ${userName} uploaded file ${fileName} (${fileSize} bytes)`);

// ✅ Use structured data instead
logger.info('File uploaded', {
  user: {
    id: userId,
    name: userName
  },
  file: {
    name: fileName,
    size: fileSize,
    type: fileType
  },
  operation: 'file_upload',
  timestamp: new Date().toISOString()
});
```

### 3. Enhanced Factory Function

```typescript
import { createEnhancedLogger } from 'monita/advanced-features';

export const { 
  logger, 
  contextManager, 
  sessionManager, 
  eventTracker, 
  performanceMonitor 
} = createEnhancedLogger({
  apiKey: process.env.MONITA_API_KEY!,
  projectId: process.env.MONITA_PROJECT_ID!,
  endpoint: process.env.MONITA_ENDPOINT!,
  environment: process.env.NODE_ENV,
  serviceName: 'my-app'
});

// Use enhanced features
sessionManager.renewSession();
eventTracker.trackEvent('user_signup', { source: 'email' });
performanceMonitor.mark('api_call_start');
```

### 4. Graceful Shutdown

```typescript
// Browser
window.addEventListener('beforeunload', async () => {
  await logger.flush();
});

// Node.js
async function gracefulShutdown() {
  console.log('Shutting down application...');
  await logger.shutdown(); // Flushes logs and cleans up
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);   // Ctrl+C
process.on('SIGTERM', gracefulShutdown);  // Docker/K8s shutdown
```

### 5. Performance Optimization

```typescript
// High-throughput configuration
const logger = new Monita({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  batchSize: 50,        // Larger batches
  flushIntervalMs: 2000, // More frequent flushing
  maxRetries: 1,        // Fewer retries for speed
  
  autoCapture: {
    errors: true,
    performance: false,   // Disable if not needed
    userInteractions: false, // Very noisy
    networkRequests: true,
    
    logLevels: {
      networkSuccess: LogLevel.TRACE, // Reduce noise
      performanceFast: LogLevel.TRACE,
      interactions: LogLevel.TRACE,
    }
  }
});
```

## 📖 API Reference

### Constructor Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | string | ✅ | - | Your API authentication key |
| `projectId` | string | ✅ | - | Your project identifier |
| `endpoint` | string | ❌ | 'https://logger-back.vercel.app/api/v1' | Your logging platform URL |
| `minLogLevel` | LogLevel | ❌ | INFO | Minimum log level to send |
| `batchSize` | number | ❌ | 10 | Logs per batch request |
| `flushIntervalMs` | number | ❌ | 5000 | Auto-flush interval (ms) |
| `maxRetries` | number | ❌ | 3 | Max retry attempts |
| `retryDelayMs` | number | ❌ | 1000 | Initial retry delay (ms) |
| `environment` | string | ❌ | 'development' | Environment name |
| `serviceName` | string | ❌ | 'unknown-service' | Service name |
| `serviceVersion` | string | ❌ | '1.0.0' | Service version |
| `autoCapture` | object | ❌ | see below | Auto-instrumentation options |

### Auto-Capture Configuration

```typescript
autoCapture: {
  errors?: boolean;              // Capture uncaught errors
  performance?: boolean;         // Capture performance metrics
  userInteractions?: boolean;    // Capture user interactions
  networkRequests?: boolean;     // Capture network requests
  consoleMessages?: boolean;     // Capture console messages
  pageViews?: boolean;          // Capture page views
  
  logLevels?: {                 // Override default log levels
    errors?: LogLevel;
    networkSuccess?: LogLevel;
    networkError?: LogLevel;
    performanceSlow?: LogLevel;
    performanceFast?: LogLevel;
    interactions?: LogLevel;
    pageViews?: LogLevel;
    console?: {
      error?: LogLevel;
      warn?: LogLevel;
      info?: LogLevel;
    };
  };
}
```

### Logging Methods

```typescript
// Basic logging methods
logger.trace(message: string, data?: object): void
logger.debug(message: string, data?: object): void  
logger.info(message: string, data?: object): void
logger.warn(message: string, data?: object): void
logger.error(message: string, error?: Error, data?: object): void
logger.fatal(message: string, error?: Error, data?: object): void

// Enhanced methods
logger.captureException(error: Error, context?: object): void
logger.captureMessage(message: string, level?: LogLevel, context?: object): void
logger.addBreadcrumb(message: string, category?: string, data?: object): void
```

### Utility Methods

```typescript
// Context management
logger.setContext(context: Record<string, any>): void
logger.getContext(): Record<string, any>

// Manual control
logger.flush(): Promise<void>
logger.shutdown(): Promise<void>

// Internal method (used by auto-instrumentation)
logger._log(level: LogLevel, message: string, error?: Error, data?: object): void
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "API Key is required" Error
```typescript
// ❌ Missing API key
const logger = new Monita({
  projectId: 'my-project'
});

// ✅ Include API key
const logger = new Monita({
  apiKey: 'your-api-key-here',
  projectId: 'my-project'
});
```

#### 2. Auto-instrumentation Not Working
```typescript
// ❌ Auto-instrumentation disabled
const logger = new Monita({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  autoCapture: {
    errors: false
  }
});

// ✅ Enable specific features
const logger = new Monita({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  autoCapture: {
    errors: true,
    performance: true,
    networkRequests: true
  }
});
```

#### 3. Too Many/Too Few Logs
```typescript
// Adjust log levels and auto-capture settings
const logger = new Monita({
  minLogLevel: LogLevel.WARN, // Only WARN, ERROR, FATAL
  autoCapture: {
    errors: true,
    performance: true,
    userInteractions: false, // Disable noisy interactions
    logLevels: {
      networkSuccess: LogLevel.TRACE, // Quiet successful requests
      performanceFast: LogLevel.TRACE
    }
  }
});