import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { AlertState, FleetAlert } from "../../domain/models/alerts";
import { LIVE_DATA_REFRESH_INTERVAL_MS } from "../../domain/services/liveDataRefreshPolicy";
import { useAlertsFeed } from "../hooks/useAlertsFeed";
import { useAsyncPolling } from "../hooks/useAsyncPolling";
import { useAppServices } from "../providers/AppServicesProvider";

interface AlertsContextType {
  alerts: FleetAlert[];
  isLoading: boolean;
  activeAlertsCount: number;
  updateError: string | null;
  refreshAlerts: () => Promise<void>;
  updateAlertState: (id: string, newState: AlertState) => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { alertsRepository } = useAppServices();
  const { data: alerts, isLoading, refresh, setData: setAlerts } = useAlertsFeed();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const refreshAlerts = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useAsyncPolling(refreshAlerts, LIVE_DATA_REFRESH_INTERVAL_MS.alerts);

  const updateAlertState = useCallback(
    async (id: string, newState: AlertState) => {
      const previousAlerts = alerts;
      setUpdateError(null);
      setAlerts((previous) => previous.map((alert) => (alert.id === id ? { ...alert, state: newState } : alert)));

      try {
        await alertsRepository.updateAlertState(id, newState);
        await refresh();
      } catch (error) {
        setAlerts(previousAlerts);
        const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
        setUpdateError(`Could not update alert state.${detail}`);
      }
    },
    [alerts, alertsRepository, refresh, setAlerts],
  );

  const activeAlertsCount = useMemo(
    () => alerts.filter((alert) => alert.state !== "Resolved").length,
    [alerts],
  );

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        isLoading,
        activeAlertsCount,
        updateError,
        refreshAlerts,
        updateAlertState,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertsProvider.");
  }
  return context;
}
