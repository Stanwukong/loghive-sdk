import { LogEntry } from './types';
export interface MonitaOptions {
    apiKey: string;
    source?: string;
    endpoint?: string;
}
export declare class Monita {
    private apiKey;
    private source?;
    private endpoint;
    constructor(options: MonitaOptions);
    /**
     * Send a log entry to the Monita API
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
