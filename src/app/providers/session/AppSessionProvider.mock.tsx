import { type ReactNode, useMemo } from "react";
import type { AppSessionSnapshot } from "../../../domain/models/session";
import { AppSessionContext } from "./appSessionContext";

interface MockAppSessionProviderProps {
  children: ReactNode;
}

const mockSessionSnapshot: AppSessionSnapshot = {
  status: "ready",
  authenticated: false,
  username: null,
  displayName: "Demo Operator",
  firstName: null,
  lastName: null,
  email: null,
  roles: {},
  realm: "mock",
  managerUrl: null,
  error: null,
};

export function MockAppSessionProvider({ children }: MockAppSessionProviderProps) {
  const value = useMemo(
    () => ({
      session: mockSessionSnapshot,
      logout: () => undefined,
    }),
    [],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export const ModeAppSessionProvider = MockAppSessionProvider;
