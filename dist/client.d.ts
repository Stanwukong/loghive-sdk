import { LogEntry } from './types';
export interface RemoteLoggerOptions {
    apiKey: string;
    source?: string;
    endpoint?: string;
}
export declare class RemoteLogger {
    private apiKey;
    private source?;
    private endpoint;
    constructor(options: RemoteLoggerOptions);
    /**
     * Send a log entry to the RemoteLogger API
     */
    log(entry: LogEntry): Promise<any>;
    /**
     * Helper methods
     */
    info(message: string, metadata?: object): Promise<any>;
    warn(message: string, metadata?: object): Promise<any>;
    error(message: string, metadata?: object): Promise<any>;
    debug(message: string, metadata?: object): Promise<any>;
}
