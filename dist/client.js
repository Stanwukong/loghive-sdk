"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Monita = void 0;
const config_1 = require("./config");
class Monita {
    constructor(options) {
        if (!options.apiKey)
            throw new Error("API key is required");
        this.apiKey = options.apiKey;
        this.source = options.source || 'custom-client';
        this.endpoint = options.endpoint || config_1.DEFAULT_ENDPOINT;
    }
    /**
     * Send a log entry to the Monita API
     */
    async log(entry) {
        const payload = {
            ...entry,
            timestamp: entry.timestamp || new Date().toISOString(),
            source: this.source,
        };
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to send log: ${err}`);
        }
        return await response.json();
    }
    /**
     * Helper methods
     */
    info(message, metadata) {
        return this.log({ message, level: 'info', metadata });
    }
    warn(message, metadata) {
        return this.log({ message, level: 'warn', metadata });
    }
    error(message, metadata) {
        return this.log({ message, level: 'error', metadata });
    }
    debug(message, metadata) {
        return this.log({ message, level: 'debug', metadata });
    }
}
exports.Monita = Monita;
