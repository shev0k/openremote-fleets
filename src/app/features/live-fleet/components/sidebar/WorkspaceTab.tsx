/* ======== IMPORTS ======== */

import type { AlertState } from "../../../../../domain/models/alerts";
import type { PlaybackRoute } from "../../../../../domain/models/playback";
import type { LiveFleetWidgetId } from "../../providers/liveFleetWorkspace.types";
import { LiveFleetResizableWidgetShell } from "./LiveFleetResizableWidgetShell";
import { FLEET_FILTER_TABS, type FleetFilter, type LiveFleetSidebarModel } from "./useLiveFleetSidebarModel";
import { CriticalAlertsWidget } from "./widgets/CriticalAlertsWidget";
import { FleetListWidget } from "./widgets/FleetListWidget";
import { TripHistoryTabsWidget } from "./widgets/TripHistoryTabsWidget";

/* ======== TYPES ======== */

interface WorkspaceTabProps {
  model: LiveFleetSidebarModel;
  widgetHeights: Partial<Record<LiveFleetWidgetId, number>>;
  fleetFilter: FleetFilter;
  selectedVehicleId: string | null;
  isLoadingVehicles: boolean;
  historicalRoute: PlaybackRoute | null;
  activeTripId: string | null;
  isLoadingRoute: boolean;
  onWidgetHeightChange: (widgetId: LiveFleetWidgetId, height: number) => void;
  onFleetFilterChange: (nextFilter: FleetFilter) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onAlertStateChange: (alertId: string, state: AlertState) => void;
  onTripSelect: (tripId: string) => void;
  onOpenGraph: (tripId: string) => void;
}

/* ======== COMPONENT ======== */

export function WorkspaceTab({
  model,
  widgetHeights,
  fleetFilter,
  selectedVehicleId,
  isLoadingVehicles,
  historicalRoute,
  activeTripId,
  isLoadingRoute,
  onWidgetHeightChange,
  onFleetFilterChange,
  onSelectVehicle,
  onAlertStateChange,
  onTripSelect,
  onOpenGraph,
}: WorkspaceTabProps) {
  return (
    <>
      {model.orderedVisibleWidgets.map((widgetId) => {
        switch (widgetId) {
          case "fleetList":
            return (
              <LiveFleetResizableWidgetShell
                key={widgetId}
                widgetId={widgetId}
                defaultHeight={model.fleetListDefaultHeight}
                minHeight={288}
                showScrollHint={model.filteredFleetVehicles.length > 5}
                storedHeight={widgetHeights[widgetId]}
                onHeightChange={onWidgetHeightChange}
              >
                <FleetListWidget
                  fleetFilterTabs={FLEET_FILTER_TABS}
                  activeFilter={fleetFilter}
                  vehicles={model.filteredFleetVehicles}
                  selectedVehicleId={selectedVehicleId}
                  isLoading={isLoadingVehicles}
                  alertPreviewByVehicleId={model.projection.criticalAlertPreviewByVehicleId}
                  onFilterChange={(nextFilter) => onFleetFilterChange(nextFilter as FleetFilter)}
                  onSelectVehicle={onSelectVehicle}
                />
              </LiveFleetResizableWidgetShell>
            );

          case "criticalAlerts":
            return (
              <LiveFleetResizableWidgetShell
                key={widgetId}
                widgetId={widgetId}
                defaultHeight={model.criticalAlertsDefaultHeight}
                minHeight={236}
                showScrollHint={model.criticalAlerts.length > 2}
                storedHeight={widgetHeights[widgetId]}
                onHeightChange={onWidgetHeightChange}
              >
                <CriticalAlertsWidget
                  activeAlertsCount={model.activeAlertsCount}
                  alerts={model.criticalAlerts}
                  vehicles={model.fleetVehicles}
                  onSelectVehicle={onSelectVehicle}
                  onAlertStateChange={onAlertStateChange}
                />
              </LiveFleetResizableWidgetShell>
            );

          case "tripHistory":
            if (!model.selectedVehicle) {
              return null;
            }

            return (
              <LiveFleetResizableWidgetShell
                key={widgetId}
                widgetId={widgetId}
                defaultHeight={model.tripHistoryDefaultHeight}
                minHeight={300}
                showScrollHint={model.tripHistoryCount > 4}
                storedHeight={widgetHeights[widgetId]}
                onHeightChange={onWidgetHeightChange}
              >
                <TripHistoryTabsWidget
                  vehicle={model.selectedVehicle}
                  route={model.projection.routeWithAlertMarkers}
                  historicalRoute={historicalRoute}
                  activeTripId={activeTripId}
                  isLoadingRoute={isLoadingRoute}
                  onTripSelect={onTripSelect}
                  onOpenGraph={onOpenGraph}
                />
              </LiveFleetResizableWidgetShell>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
