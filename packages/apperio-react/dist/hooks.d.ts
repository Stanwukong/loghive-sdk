import type { UseApperioReturn } from "./types";
/**
 * Primary hook for accessing the Apperio logger and convenience methods.
 *
 * @returns An object containing the logger instance and shorthand methods.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { logInfo, logError, trackEvent } = useApperio();
 *
 *   useEffect(() => {
 *     logInfo("Component mounted");
 *   }, []);
 *
 *   const handleClick = () => {
 *     trackEvent("button_clicked", { buttonId: "cta" });
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export declare function useApperio(): UseApperioReturn;
/**
 * Shorthand hook that returns a stable function to log errors.
 *
 * @example
 * ```tsx
 * const logError = useLogError();
 * logError(new Error("Something broke"), { userId: "123" });
 * ```
 */
export declare function useLogError(): (error: Error, context?: Record<string, any>) => void;
/**
 * Shorthand hook that returns a stable function to track custom events.
 *
 * @example
 * ```tsx
 * const trackEvent = useTrackEvent();
 * trackEvent("checkout_started", { cartTotal: 42.0 });
 * ```
 */
export declare function useTrackEvent(): (eventName: string, data?: Record<string, any>) => void;
/**
 * Hook that returns performance-related context data captured by the Apperio SDK
 * auto-instrumentation (Web Vitals, navigation timing, etc.).
 *
 * Returns the current context snapshot which may include performance entries
 * if auto-capture is enabled. The returned object is refreshed each render.
 *
 * @example
 * ```tsx
 * const perfContext = usePerformance();
 * console.log(perfContext); // { userAgent: "...", url: "...", ... }
 * ```
 */
export declare function usePerformance(): Record<string, any>;
//# sourceMappingURL=hooks.d.ts.map