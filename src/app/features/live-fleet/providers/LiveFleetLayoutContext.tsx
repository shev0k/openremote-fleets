import { createContext, useContext, type ReactNode } from "react";
import type { LiveFleetLayoutContextValue } from "./liveFleetWorkspace.types";

const LiveFleetLayoutContext = createContext<LiveFleetLayoutContextValue | null>(null);

export function LiveFleetLayoutProvider({ value, children }: { value: LiveFleetLayoutContextValue; children: ReactNode }) {
  return <LiveFleetLayoutContext.Provider value={value}>{children}</LiveFleetLayoutContext.Provider>;
}

export function useLiveFleetLayoutState() {
  const context = useContext(LiveFleetLayoutContext);

  if (!context) {
    throw new Error("useLiveFleetLayoutState must be used within LiveFleetLayoutProvider.");
  }

  return context;
}
