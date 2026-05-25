/* ======== IMPORTS ======== */

import { useMemo } from "react";
import type { FleetAlert } from "../../../../../domain/models/alerts";
import type { PlaybackRoute } from "../../../../../domain/models/playback";
import type { Vehicle } from "../../../../../domain/models/vehicle";
import type { AppDataMode } from "../../../../../domain/services/appServices";
import { getVehicleDisplayStatusMeta } from "../../../../components/map/vehicleDisplayStatus";
import { buildLiveFleetProjection, type LiveFleetProjection } from "../../liveFleetProjection";
import type { LiveFleetWidgetId } from "../../providers/liveFleetWorkspace.types";

/* ======== CONSTANTS ======== */

export const FLEET_FILTER_TABS = ["All", "Moving", "Idle", "Alerting", "Offline"] as const;

/* ======== TYPES ======== */

export type FleetFilter = (typeof FLEET_FILTER_TABS)[number];

export interface LiveFleetSidebarModelInput {
  dataMode: AppDataMode;
  vehicles: Vehicle[];
  alerts: FleetAlert[];
  selectedVehicleId: string | null;
  selectedVehicleFallback: Vehicle | null;
  route: PlaybackRoute | null;
  selectedSegmentId: string | null;
  fleetFilter: FleetFilter;
  widgetOrderIds: LiveFleetWidgetId[];
  visibleWidgetIds: LiveFleetWidgetId[];
}

export interface LiveFleetSidebarModel {
  projection: LiveFleetProjection;
  fleetVehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  selectedVehicleStatus: ReturnType<typeof getVehicleDisplayStatusMeta> | null;
  criticalAlerts: FleetAlert[];
  activeAlertsCount: number;
  filteredFleetVehicles: Vehicle[];
  tripHistoryCount: number;
  fleetListDefaultHeight: number;
  criticalAlertsDefaultHeight: number;
  tripHistoryDefaultHeight: number;
  orderedVisibleWidgets: LiveFleetWidgetId[];
}

/* ======== HOOK ======== */

export function useLiveFleetSidebarModel(input: LiveFleetSidebarModelInput): LiveFleetSidebarModel {
  const projection = useMemo(
    () =>
      buildLiveFleetProjection({
        dataMode: input.dataMode,
        vehicles: input.vehicles,
        alerts: input.alerts,
        selectedVehicleId: input.selectedVehicleId,
        selectedVehicleFallback: input.selectedVehicleFallback,
        route: input.route,
        selectedSegmentId: input.selectedSegmentId,
      }),
    [
      input.alerts,
      input.dataMode,
      input.route,
      input.selectedSegmentId,
      input.selectedVehicleFallback,
      input.selectedVehicleId,
      input.vehicles,
    ],
  );

  const fleetVehicles = projection.fleetVehicles;
  const selectedVehicle = projection.selectedVehicle;
  const selectedVehicleStatus = selectedVehicle ? getVehicleDisplayStatusMeta(selectedVehicle) : null;
  const criticalAlerts = projection.criticalAlerts;
  const activeAlertsCount = projection.activeCriticalAlertsCount;

  const filteredFleetVehicles = useMemo(() => {
    if (input.fleetFilter === "All") return fleetVehicles;
    if (input.fleetFilter === "Moving") {
      return fleetVehicles.filter((vehicle) => getVehicleDisplayStatusMeta(vehicle).id === "moving");
    }
    if (input.fleetFilter === "Idle") {
      return fleetVehicles.filter((vehicle) => {
        const status = getVehicleDisplayStatusMeta(vehicle).id;
        return status === "idling" || status === "parked" || status === "stationary";
      });
    }
    if (input.fleetFilter === "Alerting") {
      return fleetVehicles.filter((vehicle) => getVehicleDisplayStatusMeta(vehicle).id === "alerting");
    }
    return fleetVehicles.filter((vehicle) => getVehicleDisplayStatusMeta(vehicle).id === "offline");
  }, [input.fleetFilter, fleetVehicles]);

  const tripHistoryCount = projection.routeWithAlertMarkers?.tripSegments.length ?? 0;
  const fleetListDefaultHeight = filteredFleetVehicles.length
    ? Math.max(356, Math.min(520, 126 + Math.min(filteredFleetVehicles.length, 5) * 72))
    : 214;
  const criticalAlertsDefaultHeight = criticalAlerts.length
    ? Math.min(336, 116 + Math.min(criticalAlerts.length, 2) * 100)
    : 236;
  const tripHistoryDefaultHeight = tripHistoryCount
    ? Math.min(612, 102 + Math.min(tripHistoryCount, 4) * 120)
    : 232;
  const orderedVisibleWidgets = useMemo(
    () => input.widgetOrderIds.filter((widgetId) => input.visibleWidgetIds.includes(widgetId)),
    [input.visibleWidgetIds, input.widgetOrderIds],
  );

  return {
    projection,
    fleetVehicles,
    selectedVehicle,
    selectedVehicleStatus,
    criticalAlerts,
    activeAlertsCount,
    filteredFleetVehicles,
    tripHistoryCount,
    fleetListDefaultHeight,
    criticalAlertsDefaultHeight,
    tripHistoryDefaultHeight,
    orderedVisibleWidgets,
  };
}
