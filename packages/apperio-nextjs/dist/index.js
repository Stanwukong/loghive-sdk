"use strict";
// @apperio/nextjs — Next.js integration for the Apperio observability SDK
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.withApperio = exports.destroyAllServerLoggers = exports.destroyServerLogger = exports.createServerLogger = exports.withApperioMiddleware = void 0;
// Middleware
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "withApperioMiddleware", { enumerable: true, get: function () { return middleware_1.withApperioMiddleware; } });
// Server-side logger
var server_1 = require("./server");
Object.defineProperty(exports, "createServerLogger", { enumerable: true, get: function () { return server_1.createServerLogger; } });
Object.defineProperty(exports, "destroyServerLogger", { enumerable: true, get: function () { return server_1.destroyServerLogger; } });
Object.defineProperty(exports, "destroyAllServerLoggers", { enumerable: true, get: function () { return server_1.destroyAllServerLoggers; } });
// Route handler wrapper
var route_wrapper_1 = require("./route-wrapper");
Object.defineProperty(exports, "withApperio", { enumerable: true, get: function () { return route_wrapper_1.withApperio; } });
// Re-export commonly used types from the core SDK for convenience
var apperio_1 = require("apperio");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return apperio_1.LogLevel; } });
//# sourceMappingURL=index.js.map