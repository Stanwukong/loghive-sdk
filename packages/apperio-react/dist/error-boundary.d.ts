import { Component, type ErrorInfo, type ReactNode } from "react";
import type { Apperio } from "apperio";
import type { ApperioErrorBoundaryProps, ApperioErrorBoundaryState } from "./types";
/**
 * React Error Boundary that automatically logs caught errors to Apperio.
 *
 * Wraps its children and catches any unhandled rendering errors. When an error
 * is caught it is forwarded to the Apperio logger (via `captureException`) and
 * the provided `fallback` UI is rendered in place of the crashed subtree.
 *
 * @example
 * ```tsx
 * import { ApperioErrorBoundary } from "@apperio/react";
 *
 * <ApperioErrorBoundary
 *   fallback={<p>Something went wrong.</p>}
 *   onError={(err) => console.error(err)}
 * >
 *   <RiskyComponent />
 * </ApperioErrorBoundary>
 * ```
 *
 * You can also use a render function for the fallback to access the error and
 * a reset callback:
 *
 * ```tsx
 * <ApperioErrorBoundary
 *   fallback={(error, resetError) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={resetError}>Try again</button>
 *     </div>
 *   )}
 * >
 *   <RiskyComponent />
 * </ApperioErrorBoundary>
 * ```
 */
export declare class ApperioErrorBoundary extends Component<ApperioErrorBoundaryProps, ApperioErrorBoundaryState> {
    static contextType: import("react").Context<Apperio | null>;
    context: Apperio | null;
    constructor(props: ApperioErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): ApperioErrorBoundaryState;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    /**
     * Resets the error state so the children are re-rendered.
     * Useful for "Try again" buttons in the fallback UI.
     */
    resetError: () => void;
    render(): ReactNode;
}
//# sourceMappingURL=error-boundary.d.ts.map