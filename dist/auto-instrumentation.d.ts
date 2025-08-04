import { Monita } from "./logger";
export declare class AutoInstrumentation {
    private logger;
    private originalFetch?;
    private originalXHROpen?;
    private originalXHRSend?;
    private originalConsoleError?;
    private originalConsoleWarn?;
    private performanceObserver?;
    constructor(logger: Monita);
    init(config: {
        errors?: boolean;
        performance?: boolean;
        userInteractions?: boolean;
        networkRequests?: boolean;
        consoleMessages?: boolean;
        pageViews?: boolean;
    }): void;
    private setupErrorCapture;
    private setupPerformanceCapture;
    private setupUserInteractionCapture;
    private setupNetworkCapture;
    private setupConsoleCapture;
    private setupPageViewCapture;
    private capturePageView;
    destroy(): void;
}
