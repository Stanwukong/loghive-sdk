import type { LoggerConfig } from "apperio";
import type { ReactNode } from "react";
/**
 * Props for the ApperioProvider component.
 */
export interface ApperioProviderProps {
    /** Apperio SDK configuration. */
    config: LoggerConfig;
    /** React children to render within the provider. */
    children: ReactNode;
}
/**
 * Return type of the useApperio() hook.
 */
export interface UseApperioReturn {
    /** The underlying Apperio logger instance. */
    logger: import("apperio").Apperio;
    /** Track a custom event with optional data payload. */
    trackEvent: (eventName: string, data?: Record<string, any>) => void;
    /** Log an error with optional additional context. */
    logError: (error: Error, context?: Record<string, any>) => void;
    /** Log an informational message with optional data. */
    logInfo: (message: string, data?: Record<string, any>) => void;
    /** Log a warning message with optional data. */
    logWarn: (message: string, data?: Record<string, any>) => void;
    /** Log a debug message with optional data. */
    logDebug: (message: string, data?: Record<string, any>) => void;
    /** The current session ID, or null if not available. */
    sessionId: string | null;
}
/**
 * Props for the ApperioErrorBoundary component.
 */
export interface ApperioErrorBoundaryProps {
    /** Fallback UI to render when an error is caught. Can be a ReactNode or a render function. */
    fallback: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
    /** Optional callback invoked when an error is caught. */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    /** React children. */
    children: ReactNode;
}
/**
 * State for the ApperioErrorBoundary component.
 */
export interface ApperioErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}
//# sourceMappingURL=types.d.ts.map