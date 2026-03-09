import { Component, type ErrorInfo, type ReactNode } from "react";
import { ApperioContext } from "./provider";
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
export class ApperioErrorBoundary extends Component<
  ApperioErrorBoundaryProps,
  ApperioErrorBoundaryState
> {
  static contextType = ApperioContext;
  declare context: Apperio | null;

  constructor(props: ApperioErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ApperioErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to Apperio if a logger instance is available
    const logger = this.context;
    if (logger) {
      logger.captureException(error, {
        componentStack: errorInfo.componentStack ?? undefined,
        source: "ApperioErrorBoundary",
      });
    }

    // Invoke the optional user-provided callback
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Resets the error state so the children are re-rendered.
   * Useful for "Try again" buttons in the fallback UI.
   */
  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback(this.state.error, this.resetError);
      }
      return fallback;
    }
    return this.props.children;
  }
}
