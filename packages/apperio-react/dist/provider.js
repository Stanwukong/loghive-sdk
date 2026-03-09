"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApperioContext = void 0;
exports.ApperioProvider = ApperioProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const apperio_1 = require("apperio");
/**
 * React context that holds the Apperio logger instance.
 * Use the `useApperio()` hook to access it — do not consume this context directly.
 */
exports.ApperioContext = (0, react_1.createContext)(null);
/**
 * ApperioProvider initializes an Apperio logger instance and provides it to all
 * descendant components via React context.
 *
 * The logger is created on mount and destroyed on unmount. If the config
 * object reference changes, the previous logger is shut down and a new one
 * is created.
 *
 * @example
 * ```tsx
 * import { ApperioProvider } from "@apperio/react";
 *
 * function App() {
 *   return (
 *     <ApperioProvider config={{ apiKey: "...", projectId: "..." }}>
 *       <YourApp />
 *     </ApperioProvider>
 *   );
 * }
 * ```
 */
function ApperioProvider({ config, children }) {
    const [logger, setLogger] = (0, react_1.useState)(null);
    const loggerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        // Create a new Apperio instance with the provided config
        const instance = new apperio_1.Apperio(config);
        loggerRef.current = instance;
        setLogger(instance);
        return () => {
            // Shut down the logger when the provider unmounts or config changes
            if (loggerRef.current) {
                loggerRef.current.shutdown();
                loggerRef.current = null;
            }
        };
        // We intentionally serialize config to detect meaningful changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(config)]);
    return ((0, jsx_runtime_1.jsx)(exports.ApperioContext.Provider, { value: logger, children: children }));
}
//# sourceMappingURL=provider.js.map