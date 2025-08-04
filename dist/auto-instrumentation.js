"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoInstrumentation = void 0;
const types_1 = require("./types");
const utils_1 = require("./utils");
class AutoInstrumentation {
    constructor(logger) {
        this.logger = logger;
    }
    init(config) {
        if (!(0, utils_1.isInBrowser)()) {
            console.warn("AutoInstrumentation: Not in browser environment, skipping initialization");
            return;
        }
        if (typeof window === "undefined") {
            console.warn("AutoInstrumentation: Window object not available");
        }
        if (config.errors) {
            this.setupErrorCapture();
        }
        if (config.performance) {
            this.setupPerformanceCapture();
        }
        if (config.userInteractions) {
            this.setupUserInteractionCapture();
        }
        if (config.networkRequests) {
            this.setupNetworkCapture();
        }
        if (config.consoleMessages) {
            this.setupConsoleCapture();
        }
        if (config.pageViews) {
            this.setupPageViewCapture();
        }
    }
    setupErrorCapture() {
        // Global error handler
        window.addEventListener("error", (event) => {
            const errorDetails = (0, utils_1.extractErrorDetails)(event);
            // All uncaught errors are ERROR level - they need immediate attention
            this.logger._log(types_1.LogLevel.ERROR, "Uncaught Error", undefined, {
                eventType: "error",
                error: errorDetails,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
            });
        });
        // Unhandled promise rejection handler
        window.addEventListener("unhandledrejection", (event) => {
            const error = event.reason instanceof Error
                ? event.reason
                : new Error(String(event.reason));
            const errorDetails = (0, utils_1.extractErrorDetails)(error);
            // Promise rejections are also ERROR level - they indicate unhandled failures
            this.logger._log(types_1.LogLevel.ERROR, "Unhandled Promise Rejection", undefined, {
                eventType: "error",
                error: errorDetails,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
            });
        });
    }
    setupPerformanceCapture() {
        if (!("PerformanceObserver" in window)) {
            console.warn("AutoInstrumentation: PerformanceObserver not supported");
            return;
        }
        try {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    const perfEntry = {
                        name: entry.name,
                        type: entry.entryType,
                        startTime: entry.startTime,
                        duration: entry.duration,
                    };
                    // Add size for resource entries
                    if ("transferSize" in entry) {
                        perfEntry.size = entry.transferSize;
                    }
                    // Smart log level based on performance thresholds
                    let level = types_1.LogLevel.DEBUG;
                    let message = "Performance Entry";
                    if (entry.entryType === "navigation") {
                        if (entry.duration > 3000) {
                            level = types_1.LogLevel.WARN;
                            message = "Slow Page Load";
                        }
                        else if (entry.duration > 1000) {
                            level = types_1.LogLevel.INFO;
                            message = "Page Load Performance";
                        }
                    }
                    else if (entry.entryType === "resource") {
                        if (entry.duration > 3000) {
                            level = types_1.LogLevel.WARN;
                            message = "Slow Resource Load";
                        }
                        else if (entry.name.includes(".css") ||
                            entry.name.includes(".js")) {
                            if (entry.duration > 1000) {
                                level = types_1.LogLevel.INFO;
                                message = "Critical Resource Load";
                            }
                        }
                    }
                    else if (entry.entryType === "paint") {
                        if (entry.duration > 2000) {
                            level = types_1.LogLevel.WARN;
                            message = "Slow Paint";
                        }
                        else if (entry.duration > 1000) {
                            level = types_1.LogLevel.INFO;
                            message = "Paint Performance";
                        }
                    }
                    this.logger._log(level, message, undefined, {
                        eventType: "performance",
                        performance: perfEntry,
                        url: window.location.href,
                        timestamp: Date.now(),
                    });
                });
            });
            // Observe different types of performance entries
            this.performanceObserver.observe({
                entryTypes: ["navigation", "resource", "measure", "paint"],
            });
        }
        catch (error) {
            console.warn("AutoInstrumentation: Failed to setup performance observer:", error);
        }
    }
    setupUserInteractionCapture() {
        const captureInteraction = (type, event) => {
            const target = event.target;
            if (!target)
                return;
            const interaction = {
                type,
                target: (0, utils_1.getElementSelector)(target),
                timestamp: Date.now(),
            };
            if (event instanceof MouseEvent) {
                interaction.coordinates = { x: event.clientX, y: event.clientY };
            }
            // Smart log levels for different interaction types
            let level = types_1.LogLevel.DEBUG;
            if (type === "scroll" || type === "keypress") {
                level = types_1.LogLevel.TRACE; // Very frequent, lowest priority
            }
            this.logger._log(level, `User ${type}`, undefined, {
                eventType: "interaction",
                interaction,
                url: window.location.href,
                timestamp: Date.now(),
            });
        };
        // Click events
        document.addEventListener("click", (event) => captureInteraction("click", event), true);
        // Scroll events (throttled)
        let scrollTimeout;
        document.addEventListener("scroll", () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = window.setTimeout(() => {
                captureInteraction("scroll", new Event("scroll"));
            }, 100);
        }, true);
        // Focus/blur events
        document.addEventListener("focus", (event) => captureInteraction("focus", event), true);
        document.addEventListener("blur", (event) => captureInteraction("blur", event), true);
        // Keypress events (throttled and sanitized)
        let keypressTimeout;
        document.addEventListener("keypress", (event) => {
            clearTimeout(keypressTimeout);
            keypressTimeout = window.setTimeout(() => {
                captureInteraction("keypress", event);
            }, 100);
        }, true);
    }
    setupNetworkCapture() {
        // Patch fetch
        if (window.fetch) {
            this.originalFetch = window.fetch;
            window.fetch = async (...args) => {
                var _a;
                const startTime = performance.now();
                // Extract URL from different input types
                let url;
                if (typeof args[0] === "string") {
                    url = args[0];
                }
                else if (args[0] instanceof URL) {
                    url = args[0].toString();
                }
                else if (args[0] instanceof Request) {
                    url = args[0].url;
                }
                else {
                    url = String(args[0]);
                }
                // Extract method from Request object or options
                let method;
                if (args[0] instanceof Request) {
                    method = args[0].method;
                }
                else {
                    method = ((_a = args[1]) === null || _a === void 0 ? void 0 : _a.method) || "GET";
                }
                try {
                    const response = await this.originalFetch(...args);
                    const duration = performance.now() - startTime;
                    const networkRequest = {
                        url: (0, utils_1.sanitizeUrl)(url),
                        method,
                        status: response.status,
                        duration,
                        timestamp: Date.now(),
                    };
                    // Smart log level based on status and performance
                    let level = types_1.LogLevel.DEBUG;
                    let message = "Network Request";
                    if (response.status >= 500) {
                        level = types_1.LogLevel.ERROR;
                        message = "Server Error";
                    }
                    else if (response.status >= 400) {
                        level = types_1.LogLevel.WARN;
                        message = "Client Error";
                    }
                    else if (duration > 5000) {
                        level = types_1.LogLevel.WARN;
                        message = "Slow Network Request";
                    }
                    this.logger._log(level, message, undefined, {
                        eventType: "network",
                        network: networkRequest,
                        timestamp: Date.now(),
                    });
                    return response;
                }
                catch (error) {
                    const duration = performance.now() - startTime;
                    const networkRequest = {
                        url: (0, utils_1.sanitizeUrl)(url),
                        method,
                        duration,
                        timestamp: Date.now(),
                    };
                    this.logger._log(types_1.LogLevel.ERROR, "Network Request Failed", error, {
                        eventType: "network",
                        network: networkRequest,
                        timestamp: Date.now(),
                    });
                    throw error;
                }
            };
        }
        // Patch XMLHttpRequest
        if (window.XMLHttpRequest) {
            const XHR = XMLHttpRequest.prototype;
            this.originalXHROpen = XHR.open;
            this.originalXHRSend = XHR.send;
            // Capture references to avoid 'this' context issues
            const originalXHROpen = this.originalXHROpen;
            const originalXHRSend = this.originalXHRSend;
            const logger = this.logger;
            XHR.open = function (method, url, async, user, password) {
                this._loggerData = {
                    method,
                    url,
                    startTime: performance.now(),
                };
                return originalXHROpen === null || originalXHROpen === void 0 ? void 0 : originalXHROpen.call(this, method, url, async === undefined ? true : async, user, password);
            };
            XHR.send = function (body) {
                const data = this._loggerData;
                if (data) {
                    this.addEventListener("loadend", () => {
                        const duration = performance.now() - data.startTime;
                        const networkRequest = {
                            url: (0, utils_1.sanitizeUrl)(data.url),
                            method: data.method,
                            status: this.status,
                            duration,
                            timestamp: Date.now(),
                        };
                        // Smart log level based on status and performance
                        let level = types_1.LogLevel.DEBUG;
                        let message = "Network Request";
                        if (this.status >= 500) {
                            level = types_1.LogLevel.ERROR;
                            message = "Server Error";
                        }
                        else if (this.status >= 400) {
                            level = types_1.LogLevel.WARN;
                            message = "Client Error";
                        }
                        else if (duration > 5000) {
                            level = types_1.LogLevel.WARN;
                            message = "Slow Network Request";
                        }
                        logger._log(level, message, undefined, {
                            eventType: "network",
                            network: networkRequest,
                            timestamp: Date.now(),
                        });
                    });
                }
                return originalXHRSend === null || originalXHRSend === void 0 ? void 0 : originalXHRSend.call(this, body);
            };
        }
    }
    setupConsoleCapture() {
        this.originalConsoleError = console.error;
        this.originalConsoleWarn = console.warn;
        console.error = (...args) => {
            var _a;
            this.logger._log(types_1.LogLevel.ERROR, "Console Error", undefined, {
                eventType: "console",
                consoleArgs: args.map((arg) => String(arg)),
                url: window.location.href,
                timestamp: Date.now(),
            });
            return (_a = this.originalConsoleError) === null || _a === void 0 ? void 0 : _a.apply(console, args);
        };
        console.warn = (...args) => {
            var _a;
            this.logger._log(types_1.LogLevel.WARN, "Console Warning", undefined, {
                eventType: "console",
                consoleArgs: args.map((arg) => String(arg)),
                url: window.location.href,
                timestamp: Date.now(),
            });
            return (_a = this.originalConsoleWarn) === null || _a === void 0 ? void 0 : _a.apply(console, args);
        };
    }
    setupPageViewCapture() {
        // Initial page view
        this.capturePageView();
        // History API changes (SPA navigation)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            setTimeout(() => this.capturePageView(), 0);
        };
        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            setTimeout(() => this.capturePageView(), 0);
        };
        // Popstate events (back/forward)
        window.addEventListener("popstate", () => {
            setTimeout(() => this.capturePageView(), 0);
        });
    }
    capturePageView() {
        this.logger._log(types_1.LogLevel.INFO, "Page View", undefined, {
            eventType: "pageview",
            url: window.location.href,
            referrer: document.referrer,
            title: document.title,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
        });
    }
    destroy() {
        // Restore original functions
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
        }
        if (this.originalXHROpen) {
            XMLHttpRequest.prototype.open = this.originalXHROpen;
        }
        if (this.originalXHRSend) {
            XMLHttpRequest.prototype.send = this.originalXHRSend;
        }
        if (this.originalConsoleError) {
            console.error = this.originalConsoleError;
        }
        if (this.originalConsoleWarn) {
            console.warn = this.originalConsoleWarn;
        }
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        // Remove event listeners would require keeping references
        // For now, they'll remain but won't do anything after destroy
    }
}
exports.AutoInstrumentation = AutoInstrumentation;
