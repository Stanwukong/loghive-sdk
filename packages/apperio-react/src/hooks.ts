import { useContext, useCallback, useMemo } from "react";
import { LogLevel } from "apperio";
import { ApperioContext } from "./provider";
import type { UseApperioReturn } from "./types";

/**
 * Throws a descriptive error when a hook is called outside of an ApperioProvider.
 */
function useApperioContext() {
  const logger = useContext(ApperioContext);
  if (!logger) {
    throw new Error(
      "useApperio: No Apperio instance found. " +
        "Wrap your component tree with <ApperioProvider> before calling Apperio hooks."
    );
  }
  return logger;
}

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
export function useApperio(): UseApperioReturn {
  const logger = useApperioContext();

  const trackEvent = useCallback(
    (eventName: string, data?: Record<string, any>) => {
      logger.info(eventName, { ...data, eventType: "interaction" });
    },
    [logger]
  );

  const logError = useCallback(
    (error: Error, context?: Record<string, any>) => {
      logger.captureException(error, context);
    },
    [logger]
  );

  const logInfo = useCallback(
    (message: string, data?: Record<string, any>) => {
      logger.info(message, data);
    },
    [logger]
  );

  const logWarn = useCallback(
    (message: string, data?: Record<string, any>) => {
      logger.warn(message, data);
    },
    [logger]
  );

  const logDebug = useCallback(
    (message: string, data?: Record<string, any>) => {
      logger.debug(message, data);
    },
    [logger]
  );

  const sessionId = useMemo(() => {
    return logger.getContext()?.sessionId ?? null;
  }, [logger]);

  return useMemo(
    () => ({
      logger,
      trackEvent,
      logError,
      logInfo,
      logWarn,
      logDebug,
      sessionId,
    }),
    [logger, trackEvent, logError, logInfo, logWarn, logDebug, sessionId]
  );
}

/**
 * Shorthand hook that returns a stable function to log errors.
 *
 * @example
 * ```tsx
 * const logError = useLogError();
 * logError(new Error("Something broke"), { userId: "123" });
 * ```
 */
export function useLogError() {
  const logger = useApperioContext();
  return useCallback(
    (error: Error, context?: Record<string, any>) => {
      logger.captureException(error, context);
    },
    [logger]
  );
}

/**
 * Shorthand hook that returns a stable function to track custom events.
 *
 * @example
 * ```tsx
 * const trackEvent = useTrackEvent();
 * trackEvent("checkout_started", { cartTotal: 42.0 });
 * ```
 */
export function useTrackEvent() {
  const logger = useApperioContext();
  return useCallback(
    (eventName: string, data?: Record<string, any>) => {
      logger.info(eventName, { ...data, eventType: "interaction" });
    },
    [logger]
  );
}

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
export function usePerformance(): Record<string, any> {
  const logger = useApperioContext();
  // Return a snapshot of the current context which includes browser/performance data
  // set by auto-instrumentation.
  return logger.getContext();
}
