import { createContext, useContext } from "react";
import type { AppSessionSnapshot } from "../../../domain/models/session";

export interface AppSessionContextValue {
  session: AppSessionSnapshot;
  logout: () => void;
}

export const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error("useAppSession must be used within an AppSessionProvider.");
  }

  return context;
}
