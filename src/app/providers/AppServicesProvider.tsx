import { createContext, ReactNode, useContext, useMemo } from "react";
import type { AppServices } from "../../domain/services/appServices";
import { createDefaultAppServices } from "../../infrastructure/services/appServices";

const AppServicesContext = createContext<AppServices | null>(null);

interface AppServicesProviderProps {
  children: ReactNode;
  services?: AppServices;
}

export function AppServicesProvider({ children, services }: AppServicesProviderProps) {
  const serviceContainer = useMemo(() => services ?? createDefaultAppServices(), [services]);

  return (
    <AppServicesContext.Provider value={serviceContainer}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices() {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error("useAppServices must be used within AppServicesProvider.");
  }

  return context;
}
