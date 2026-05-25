import { createContext, useContext, type ReactNode } from "react";
import type { LiveFleetPlaybackContextValue } from "./liveFleetWorkspace.types";

const LiveFleetPlaybackContext = createContext<LiveFleetPlaybackContextValue | null>(null);

export function LiveFleetPlaybackProvider({ value, children }: { value: LiveFleetPlaybackContextValue; children: ReactNode }) {
  return <LiveFleetPlaybackContext.Provider value={value}>{children}</LiveFleetPlaybackContext.Provider>;
}

export function useLiveFleetPlaybackState() {
  const context = useContext(LiveFleetPlaybackContext);

  if (!context) {
    throw new Error("useLiveFleetPlaybackState must be used within LiveFleetPlaybackProvider.");
  }

  return context;
}
