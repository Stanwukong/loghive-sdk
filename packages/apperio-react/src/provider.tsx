import { createContext, useEffect, useRef, useState } from "react";
import { Apperio } from "apperio";
import type { ApperioProviderProps } from "./types";

/**
 * React context that holds the Apperio logger instance.
 * Use the `useApperio()` hook to access it — do not consume this context directly.
 */
export const ApperioContext = createContext<Apperio | null>(null);

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
export function ApperioProvider({ config, children }: ApperioProviderProps) {
  const [logger, setLogger] = useState<Apperio | null>(null);
  const loggerRef = useRef<Apperio | null>(null);

  useEffect(() => {
    // Create a new Apperio instance with the provided config
    const instance = new Apperio(config);
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

  return (
    <ApperioContext.Provider value={logger}>{children}</ApperioContext.Provider>
  );
}
