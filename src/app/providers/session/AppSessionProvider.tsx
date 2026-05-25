import type { ReactNode } from "react";
import { ModeAppSessionProvider } from "#app-session-provider";

interface AppSessionProviderProps {
  children: ReactNode;
}

export function AppSessionProvider({ children }: AppSessionProviderProps) {
  return <ModeAppSessionProvider>{children}</ModeAppSessionProvider>;
}
