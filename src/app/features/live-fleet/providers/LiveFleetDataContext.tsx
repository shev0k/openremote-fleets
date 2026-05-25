import { createContext, useContext, type ReactNode } from "react";
import type { LiveFleetDataContextValue } from "./liveFleetWorkspace.types";

const LiveFleetDataContext = createContext<LiveFleetDataContextValue | null>(null);

export function LiveFleetDataProvider({ value, children }: { value: LiveFleetDataContextValue; children: ReactNode }) {
  return <LiveFleetDataContext.Provider value={value}>{children}</LiveFleetDataContext.Provider>;
}

export function useLiveFleetVehicleData() {
  const context = useContext(LiveFleetDataContext);

  if (!context) {
    throw new Error("useLiveFleetVehicleData must be used within LiveFleetDataProvider.");
  }

  return context;
}
