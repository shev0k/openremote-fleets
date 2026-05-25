import { createContext, useContext, type ReactNode } from "react";
import type { LiveFleetPreferencesContextValue } from "./liveFleetWorkspace.types";

const LiveFleetPreferencesContext = createContext<LiveFleetPreferencesContextValue | null>(null);

export function LiveFleetPreferencesProvider({ value, children }: { value: LiveFleetPreferencesContextValue; children: ReactNode }) {
  return <LiveFleetPreferencesContext.Provider value={value}>{children}</LiveFleetPreferencesContext.Provider>;
}

export function useLiveFleetMapPreferences() {
  const context = useContext(LiveFleetPreferencesContext);

  if (!context) {
    throw new Error("useLiveFleetMapPreferences must be used within LiveFleetPreferencesProvider.");
  }

  return context;
}
