"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useApperio = useApperio;
exports.useLogError = useLogError;
exports.useTrackEvent = useTrackEvent;
exports.usePerformance = usePerformance;
const react_1 = require("react");
const provider_1 = require("./provider");
/**
 * Throws a descriptive error when a hook is called outside of an ApperioProvider.
 */
function useApperioContext() {
    const logger = (0, react_1.useContext)(provider_1.ApperioContext);
    if (!logger) {
        throw new Error("useApperio: No Apperio instance found. " +
            "Wrap your component tree with <ApperioProvider> before calling Apperio hooks.");
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
function useApperio() {
    const logger = useApperioContext();
    const trackEvent = (0, react_1.useCallback)((eventName, data) => {
        logger.info(eventName, { ...data, eventType: "interaction" });
    }, [logger]);
    const logError = (0, react_1.useCallback)((error, context) => {
        logger.captureException(error, context);
    }, [logger]);
    const logInfo = (0, react_1.useCallback)((message, data) => {
        logger.info(message, data);
    }, [logger]);
    const logWarn = (0, react_1.useCallback)((message, data) => {
        logger.warn(message, data);
    }, [logger]);
    const logDebug = (0, react_1.useCallback)((message, data) => {
        logger.debug(message, data);
    }, [logger]);
    const sessionId = (0, react_1.useMemo)(() => {
        return logger.getContext()?.sessionId ?? null;
    }, [logger]);
    return (0, react_1.useMemo)(() => ({
        logger,
        trackEvent,
        logError,
        logInfo,
        logWarn,
        logDebug,
        sessionId,
    }), [logger, trackEvent, logError, logInfo, logWarn, logDebug, sessionId]);
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
function useLogError() {
    const logger = useApperioContext();
    return (0, react_1.useCallback)((error, context) => {
        logger.captureException(error, context);
    }, [logger]);
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
function useTrackEvent() {
    const logger = useApperioContext();
    return (0, react_1.useCallback)((eventName, data) => {
        logger.info(eventName, { ...data, eventType: "interaction" });
    }, [logger]);
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
function usePerformance() {
    const logger = useApperioContext();
    // Return a snapshot of the current context which includes browser/performance data
    // set by auto-instrumentation.
    return logger.getContext();
}
//# sourceMappingURL=hooks.js.map