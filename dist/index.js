"use strict";
/**
 * @file src/index.ts
 * @description Main entry point for the RemoteLogger SDK.
 * Exports the RemoteLogger class and related types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.RemoteLogger = void 0;
var logger_1 = require("./logger");
Object.defineProperty(exports, "RemoteLogger", { enumerable: true, get: function () { return logger_1.RemoteLogger; } });
var types_1 = require("./types");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return types_1.LogLevel; } });
