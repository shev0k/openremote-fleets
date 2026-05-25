import { useCallback, useState } from "react";
import type { LiveFleetQuickPanelId, LiveFleetQuickPanelState } from "./liveFleetWorkspace.types";

export function useLiveFleetOverlayState() {
  const [quickPanels, setQuickPanels] = useState<LiveFleetQuickPanelState>({ alerts: false, fleetManagement: false });
  const [activeVehicleOverlayId, setActiveVehicleOverlayId] = useState<string | null>(null);
  const [pinnedVehicleIds, setPinnedVehicleIds] = useState<string[]>([]);

  const pinVehicleOverlay = useCallback((vehicleId: string) => {
    setPinnedVehicleIds((current) => (current.includes(vehicleId) ? current : [...current, vehicleId]));
  }, []);

  const unpinVehicleOverlay = useCallback((vehicleId: string) => {
    setPinnedVehicleIds((current) => current.filter((id) => id !== vehicleId));
  }, []);

  const toggleQuickPanel = useCallback((panelId: LiveFleetQuickPanelId) => {
    setQuickPanels((current) => ({ ...current, [panelId]: !current[panelId] }));
  }, []);

  const reconcileVehicleOverlays = useCallback((validVehicleIds: ReadonlySet<string>) => {
    setActiveVehicleOverlayId((current) => (current && !validVehicleIds.has(current) ? null : current));
    setPinnedVehicleIds((current) => {
      const next = current.filter((vehicleId) => validVehicleIds.has(vehicleId));
      return next.length === current.length ? current : next;
    });
  }, []);

  return {
    quickPanels,
    activeVehicleOverlayId,
    pinnedVehicleIds,
    setActiveVehicleOverlayId,
    pinVehicleOverlay,
    unpinVehicleOverlay,
    toggleQuickPanel,
    reconcileVehicleOverlays,
  };
}
