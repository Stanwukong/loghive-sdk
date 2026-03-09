import { Apperio } from "apperio";
import type { ApperioProviderProps } from "./types";
/**
 * React context that holds the Apperio logger instance.
 * Use the `useApperio()` hook to access it — do not consume this context directly.
 */
export declare const ApperioContext: import("react").Context<Apperio | null>;
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
export declare function ApperioProvider({ config, children }: ApperioProviderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=provider.d.ts.map