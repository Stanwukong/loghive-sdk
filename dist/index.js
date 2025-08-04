"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.AutoInstrumentation = exports.LogLevel = exports.Monita = void 0;
const logger_1 = require("./logger");
// src/index.ts
var logger_2 = require("./logger");
Object.defineProperty(exports, "Monita", { enumerable: true, get: function () { return logger_2.Monita; } });
var types_1 = require("./types");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return types_1.LogLevel; } });
var auto_instrumentation_1 = require("./auto-instrumentation");
Object.defineProperty(exports, "AutoInstrumentation", { enumerable: true, get: function () { return auto_instrumentation_1.AutoInstrumentation; } });
// Convenience function for quick setup
const createLogger = (config) => {
    return new logger_1.Monita(config);
};
exports.createLogger = createLogger;
