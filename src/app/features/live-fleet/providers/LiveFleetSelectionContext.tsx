import { createContext, useContext, type ReactNode } from "react";
import type { LiveFleetSelectionContextValue } from "./liveFleetWorkspace.types";

const LiveFleetSelectionContext = createContext<LiveFleetSelectionContextValue | null>(null);

export function LiveFleetSelectionProvider({ value, children }: { value: LiveFleetSelectionContextValue; children: ReactNode }) {
  return <LiveFleetSelectionContext.Provider value={value}>{children}</LiveFleetSelectionContext.Provider>;
}

export function useLiveFleetVehicleSelection() {
  const context = useContext(LiveFleetSelectionContext);

  if (!context) {
    throw new Error("useLiveFleetVehicleSelection must be used within LiveFleetSelectionProvider.");
  }

  return context;
}
