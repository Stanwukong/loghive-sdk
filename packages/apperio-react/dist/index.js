"use strict";
// @apperio/react — React bindings for the Apperio observability SDK
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.ApperioErrorBoundary = exports.usePerformance = exports.useTrackEvent = exports.useLogError = exports.useApperio = exports.ApperioContext = exports.ApperioProvider = void 0;
// Provider
var provider_1 = require("./provider");
Object.defineProperty(exports, "ApperioProvider", { enumerable: true, get: function () { return provider_1.ApperioProvider; } });
Object.defineProperty(exports, "ApperioContext", { enumerable: true, get: function () { return provider_1.ApperioContext; } });
// Hooks
var hooks_1 = require("./hooks");
Object.defineProperty(exports, "useApperio", { enumerable: true, get: function () { return hooks_1.useApperio; } });
Object.defineProperty(exports, "useLogError", { enumerable: true, get: function () { return hooks_1.useLogError; } });
Object.defineProperty(exports, "useTrackEvent", { enumerable: true, get: function () { return hooks_1.useTrackEvent; } });
Object.defineProperty(exports, "usePerformance", { enumerable: true, get: function () { return hooks_1.usePerformance; } });
// Error Boundary
var error_boundary_1 = require("./error-boundary");
Object.defineProperty(exports, "ApperioErrorBoundary", { enumerable: true, get: function () { return error_boundary_1.ApperioErrorBoundary; } });
// Re-export commonly used types from the core SDK for convenience
var apperio_1 = require("apperio");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return apperio_1.LogLevel; } });
//# sourceMappingURL=index.js.map