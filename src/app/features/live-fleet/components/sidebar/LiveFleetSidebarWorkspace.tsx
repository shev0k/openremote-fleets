/* ======== IMPORTS ======== */

import {
  Grid2x2,
  LayoutPanelLeft,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAlerts } from "../../../../contexts/AlertsContext";
import { useAppServices } from "../../../../providers/AppServicesProvider";
import type { LiveFleetWidgetId } from "../../providers/liveFleetWorkspace.types";
import { useLiveFleetVehicleData } from "../../providers/LiveFleetDataContext";
import { useLiveFleetLayoutState } from "../../providers/LiveFleetLayoutContext";
import { useLiveFleetPlaybackState } from "../../providers/LiveFleetPlaybackContext";
import { useLiveFleetMapPreferences } from "../../providers/LiveFleetPreferencesContext";
import { useLiveFleetVehicleSelection } from "../../providers/LiveFleetSelectionContext";
import { LIVE_FLEET_EDGE_PADDING, LIVE_FLEET_WORKSPACE_WIDTH } from "../../liveFleetLayout";
import { QuickPanelsTab } from "./QuickPanelsTab";
import { SidebarWidgetArrangementPanel } from "./SidebarWidgetArrangementPanel";
import { WorkspaceTab } from "./WorkspaceTab";
import { clearStoredWidgetHeights, persistWidgetHeights, readStoredWidgetHeights } from "./widgetHeightStorage";
import { type FleetFilter, useLiveFleetSidebarModel } from "./useLiveFleetSidebarModel";

/* ======== CONSTANTS ======== */

const WIDGET_LABELS: Record<LiveFleetWidgetId, string> = {
  criticalAlerts: "Critical alerts",
  fleetList: "Fleet list",
  tripHistory: "Trip history",
};

/* ======== COMPONENT ======== */

export function LiveFleetSidebarWorkspace() {
  const { alerts, updateAlertState } = useAlerts();
  const { dataMode } = useAppServices();
  const data = useLiveFleetVehicleData();
  const layout = useLiveFleetLayoutState();
  const playback = useLiveFleetPlaybackState();
  const mapPreferences = useLiveFleetMapPreferences();
  const selection = useLiveFleetVehicleSelection();

  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [fleetFilter, setFleetFilter] = useState<FleetFilter>("All");
  const [widgetHeights, setWidgetHeights] = useState<Partial<Record<LiveFleetWidgetId, number>>>(() => readStoredWidgetHeights());

  const model = useLiveFleetSidebarModel({
    dataMode,
    vehicles: data.vehicles,
    alerts,
    selectedVehicleId: selection.selectedVehicleId,
    selectedVehicleFallback: selection.selectedVehicle,
    route: playback.route,
    selectedSegmentId: playback.selectedSegmentId,
    fleetFilter,
    widgetOrderIds: layout.widgetLayout.widgetOrderIds,
    visibleWidgetIds: layout.widgetLayout.visibleWidgetIds,
  });

  /* ======== LAYOUT / STORAGE EFFECTS ======== */

  useEffect(() => {
    persistWidgetHeights(widgetHeights);
  }, [widgetHeights]);

  /* ======== EVENT HANDLERS ======== */

  const updateWidgetHeight = (widgetId: LiveFleetWidgetId, height: number) => {
    setWidgetHeights((current) => ({
      ...current,
      [widgetId]: height,
    }));
  };

  const resetWidgetHeights = () => {
    setWidgetHeights({});
    clearStoredWidgetHeights();
  };

  return (
    <aside
      className={`pointer-events-none absolute left-5 top-[104px] sm:top-[120px] z-[1280] flex max-w-full flex-col transition-transform duration-300 ${
        mapPreferences.isWorkspaceOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"
      }`}
      style={{
        width: `min(${LIVE_FLEET_WORKSPACE_WIDTH}px, calc(100vw - 2.5rem))`,
        bottom: `${LIVE_FLEET_EDGE_PADDING}px`,
      }}
      onWheelCapture={(event) => event.stopPropagation()}
    >
      <div className="relative pointer-events-auto w-full">
        <div className="app-panel flex w-full items-center justify-between rounded-[24px] px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => layout.setActiveTab("workspace")}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors border ${
                layout.widgetLayout.activeTab === "workspace"
                  ? "border-brand/20 bg-brand/10 text-brand"
                  : "border-transparent text-content-muted hover:bg-surface-elevated hover:text-content-primary"
              }`}
            >
              <Grid2x2 className="h-4 w-4" />
              Workspace
            </button>
            <button
              type="button"
              onClick={() => layout.setActiveTab("quickPanels")}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors border ${
                layout.widgetLayout.activeTab === "quickPanels"
                  ? "border-brand/20 bg-brand/10 text-brand"
                  : "border-transparent text-content-muted hover:bg-surface-elevated hover:text-content-primary"
              }`}
            >
              <LayoutPanelLeft className="h-4 w-4" />
              Quick panels
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLayoutEditorOpen((current) => !current)}
              className="app-control flex h-9 w-9 items-center justify-center rounded-full"
              title="Customize workspace cards"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mapPreferences.setWorkspaceOpen(false)}
              className="app-control flex h-9 w-9 items-center justify-center rounded-full xl:hidden"
              title="Hide workspace"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLayoutEditorOpen ? (
          <SidebarWidgetArrangementPanel
            orderedWidgetIds={layout.widgetLayout.widgetOrderIds}
            visibleWidgetIds={layout.widgetLayout.visibleWidgetIds}
            widgetLabels={WIDGET_LABELS}
            onMove={layout.moveWidget}
            onReorder={layout.reorderWidget}
            onToggleVisibility={layout.toggleWidgetVisibility}
            onResetWidgetHeights={resetWidgetHeights}
            onClose={() => setIsLayoutEditorOpen(false)}
          />
        ) : null}
      </div>

      <div className="pointer-events-auto mt-2.5 min-h-0 flex-1 overflow-visible">
        <div
          className="pointer-events-auto h-full min-h-0 overflow-visible"
          onWheelCapture={(event) => event.stopPropagation()}
        >
          <div data-testid="live-fleet-workspace-scroll-region" className="brand-scrollbar h-full w-[calc(100%+8px)] overflow-y-auto pr-2">
            <div className="flex w-full flex-col gap-2.5">
              {layout.widgetLayout.activeTab === "workspace" ? (
                <WorkspaceTab
                  model={model}
                  widgetHeights={widgetHeights}
                  fleetFilter={fleetFilter}
                  selectedVehicleId={selection.selectedVehicleId}
                  isLoadingVehicles={data.isLoadingVehicles}
                  historicalRoute={playback.historicalRoute}
                  activeTripId={playback.selectedSegmentId}
                  isLoadingRoute={playback.isLoadingRoute}
                  onWidgetHeightChange={updateWidgetHeight}
                  onFleetFilterChange={setFleetFilter}
                  onSelectVehicle={(vehicleId) => void selection.selectVehicle(vehicleId)}
                  onAlertStateChange={(alertId, state) => void updateAlertState(alertId, state)}
                  onTripSelect={playback.selectSegment}
                  onOpenGraph={playback.openGraphOverlay}
                />
              ) : (
                <QuickPanelsTab
                  model={model}
                  quickPanels={layout.quickPanels}
                  onToggleQuickPanel={layout.toggleQuickPanel}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
