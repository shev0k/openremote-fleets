/* ======== IMPORTS ======== */

import { BellRing, Wrench } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useAlerts } from "../../../../contexts/AlertsContext";
import { useAppServices } from "../../../../providers/AppServicesProvider";
import { SegmentGraphOverlay } from "../../../../components/playback/SegmentGraphOverlay";
import type { LiveFleetQuickPanelId } from "../../providers/liveFleetWorkspace.types";
import { useLiveFleetVehicleData } from "../../providers/LiveFleetDataContext";
import { useLiveFleetLayoutState } from "../../providers/LiveFleetLayoutContext";
import { useLiveFleetPlaybackState } from "../../providers/LiveFleetPlaybackContext";
import { useLiveFleetVehicleSelection } from "../../providers/LiveFleetSelectionContext";
import { LIVE_FLEET_EDGE_PADDING, LIVE_FLEET_TIMELINE_RESERVED_HEIGHT, getLiveFleetBottomInset } from "../../liveFleetLayout";
import { getVehicleDisplayStatusMeta } from "../../../../components/map/vehicleDisplayStatus";
import { AlertsQuickPanelContent } from "./AlertsQuickPanelContent";
import { DraggablePinnedVehicleWindow } from "./DraggablePinnedVehicleWindow";
import { DraggableQuickPanelWindow } from "./DraggableQuickPanelWindow";
import { FleetManagementQuickPanelContent } from "./FleetManagementQuickPanelContent";
import { buildLiveFleetHistoricalOverlayState } from "../../liveFleetHistoricalOverlay";
import { buildLiveFleetProjection } from "../../liveFleetProjection";
import { VehicleOverlayInstance } from "./VehicleOverlayInstance";
import { useFloatingOverlayLayouts } from "./useFloatingOverlayLayouts";
import { useOverlayViewport } from "./useOverlayViewport";

/* ======== CONSTANTS ======== */

const PINNED_WINDOW_WIDTH = 392;
const PINNED_WINDOW_COLLAPSED_WIDTH = 272;
const PINNED_WINDOW_COLLAPSED_HEIGHT = 56;
const MAP_ACTION_BAR_RESERVED_WIDTH = 72;
const QUICK_PANEL_WIDTH = 320;
const QUICK_PANEL_ESTIMATED_HEIGHT = 392;

/* ======== HELPERS ======== */

function getPinnedWindowExpandedHeight(containerHeight: number, bottomPadding: number) {
  return Math.min(760, Math.max(420, containerHeight - bottomPadding - LIVE_FLEET_EDGE_PADDING * 2));
}

/* ======== COMPONENT ======== */

export function LiveFleetOverlayLayer() {
  const { alerts, updateAlertState } = useAlerts();
  const { dataMode } = useAppServices();
  const data = useLiveFleetVehicleData();
  const layout = useLiveFleetLayoutState();
  const playback = useLiveFleetPlaybackState();
  const selection = useLiveFleetVehicleSelection();

  const { viewportRef, viewportBounds } = useOverlayViewport();

  const bottomPadding = getLiveFleetBottomInset(
    Boolean(layout.isTimelineVisible && playback.route),
    layout.timelineHeightPx,
  );

  /* ======== DERIVED DATA ======== */

  const projection = useMemo(
    () =>
      buildLiveFleetProjection({
        dataMode,
        vehicles: data.vehicles,
        alerts,
        selectedVehicleId: layout.activeVehicleOverlayId,
        route: playback.route,
        selectedSegmentId: playback.graphSegmentId,
        playbackProgress: playback.playbackProgress,
        isTimelineInspecting: playback.isTimelineInspecting,
      }),
    [
      alerts,
      dataMode,
      data.vehicles,
      layout.activeVehicleOverlayId,
      playback.graphSegmentId,
      playback.isTimelineInspecting,
      playback.playbackProgress,
      playback.route,
    ],
  );
  const fleetVehicles = projection.fleetVehicles;
  const activeVehicle = projection.selectedVehicle;
  const activeVehicleIsPinned = activeVehicle ? layout.pinnedVehicleIds.includes(activeVehicle.id) : false;
  const dockedVehicle = activeVehicleIsPinned ? null : activeVehicle;

  const dockedOverlayReservedWidth = dockedVehicle ? PINNED_WINDOW_WIDTH + 56 : 0;
  const pinnedWindowReservedWidth = dockedOverlayReservedWidth + MAP_ACTION_BAR_RESERVED_WIDTH;
  const quickPanelReservedWidth = dockedOverlayReservedWidth + MAP_ACTION_BAR_RESERVED_WIDTH + 28;

  const pinnedVehicles = layout.pinnedVehicleIds
    .map((vehicleId) => fleetVehicles.find((vehicle) => vehicle.id === vehicleId) ?? null)
    .filter((vehicle): vehicle is NonNullable<typeof vehicle> => Boolean(vehicle));

  const graphSegment = projection.selectedSegmentWithAlertMarkers;
  const triggeredAlerts = projection.triggeredAlerts;
  const activeAlertsByVehicleId = projection.activeAlertsByVehicleId;
  const timelineStreetViewPosition = projection.timelineStreetViewPosition;
  const getStreetViewPosition = useCallback(
    (vehicleId: string) => (vehicleId === selection.selectedVehicleId ? timelineStreetViewPosition : null),
    [selection.selectedVehicleId, timelineStreetViewPosition],
  );
  const selectedOverlayState = useMemo(
    () =>
      activeVehicle && activeVehicle.id === selection.selectedVehicleId
        ? buildLiveFleetHistoricalOverlayState({
            vehicle: activeVehicle,
            detail: data.vehicleDetailsById[activeVehicle.id] ?? null,
            route: projection.routeWithAlertMarkers,
            playbackProgress: playback.playbackProgress,
            isTimelineInspecting: playback.isTimelineInspecting,
          })
        : null,
    [
      activeVehicle,
      data.vehicleDetailsById,
      playback.isTimelineInspecting,
      playback.playbackProgress,
      projection.routeWithAlertMarkers,
      selection.selectedVehicleId,
    ],
  );
  const getOverlayState = useCallback(
    (vehicle: NonNullable<typeof activeVehicle>) =>
      vehicle.id === selectedOverlayState?.vehicle.id
        ? selectedOverlayState
        : {
            vehicle,
            detail: data.vehicleDetailsById[vehicle.id] ?? null,
            isHistorical: false,
          },
    [data.vehicleDetailsById, selectedOverlayState],
  );
  const dockedOverlayState = dockedVehicle ? getOverlayState(dockedVehicle) : null;
  const mobileOverlayState = activeVehicle ? getOverlayState(activeVehicle) : null;

  const topReservedHeight = 110;
  const availableOverlayBodyHeight = viewportBounds.height - bottomPadding - topReservedHeight - LIVE_FLEET_EDGE_PADDING * 2 - 72;
  const activeOverlayBodyMaxHeight = Math.min(
    760,
    Math.max(220, availableOverlayBodyHeight),
  );

  const openQuickPanelIds = useMemo(
    () =>
      (Object.entries(layout.quickPanels) as [LiveFleetQuickPanelId, boolean][])
        .filter((entry): entry is [LiveFleetQuickPanelId, true] => entry[1])
        .map(([panelId]) => panelId),
    [layout.quickPanels],
  );

  const {
    pinnedWindowLayouts,
    quickPanelLayouts,
    updatePinnedWindowLayout,
    focusPinnedVehicle,
    updateQuickPanelLayout,
    focusQuickPanel,
  } = useFloatingOverlayLayouts({
    pinnedVehicleIds: layout.pinnedVehicleIds,
    openQuickPanelIds,
  });

  return (
    <>
      <div ref={viewportRef} className="pointer-events-none absolute inset-0 z-[1320] overflow-hidden">
        <div
          className="absolute right-6 top-[104px] sm:top-[120px] hidden items-end gap-3 xl:flex xl:flex-col"
          style={{
            bottom: `${bottomPadding}px`,
            maxHeight: `calc(100% - ${bottomPadding + LIVE_FLEET_EDGE_PADDING}px)`,
          }}
        >
          {dockedVehicle && dockedOverlayState ? (
            <div className="pointer-events-auto w-[392px] max-w-[calc(100vw-8rem)]">
              <VehicleOverlayInstance
                vehicle={dockedOverlayState.vehicle}
                detail={dockedOverlayState.detail}
                route={projection.routeWithAlertMarkers}
                selectedSegment={playback.selectedSegment}
                isLoading={data.isLoadingVehicleDetail}
                isPinned={layout.pinnedVehicleIds.includes(dockedVehicle.id)}
                activeAlerts={activeAlertsByVehicleId[dockedVehicle.id] ?? []}
                streetViewSnapshotKey={playback.timelineInspectionRevision}
                streetViewPosition={getStreetViewPosition(dockedVehicle.id)}
                onClose={selection.dismissSelectedVehicle}
                onTogglePin={() =>
                  layout.pinnedVehicleIds.includes(dockedVehicle.id)
                    ? layout.unpinVehicleOverlay(dockedVehicle.id)
                    : layout.pinVehicleOverlay(dockedVehicle.id)
                }
                onOpenGraph={playback.openGraphOverlay}
                onAlertStateChange={(alertId, state) => void updateAlertState(alertId, state)}
                bodyMaxHeightPx={activeOverlayBodyMaxHeight}
              />
            </div>
          ) : null}
        </div>

        {layout.quickPanels.fleetManagement ? (
          <DraggableQuickPanelWindow
            panelId="fleetManagement"
            index={openQuickPanelIds.indexOf("fleetManagement")}
            containerWidth={viewportBounds.width}
            containerHeight={viewportBounds.height}
            bottomPadding={bottomPadding}
            rightReservedWidth={quickPanelReservedWidth}
            edgePadding={LIVE_FLEET_EDGE_PADDING}
            topReservedPadding={topReservedHeight}
            panelWidth={QUICK_PANEL_WIDTH}
            estimatedHeight={QUICK_PANEL_ESTIMATED_HEIGHT}
            layout={quickPanelLayouts.fleetManagement}
            title="Fleet management"
            subtitle="Operational context for the current workspace."
            icon={<Wrench className="h-4 w-4" />}
            onFocus={() => focusQuickPanel("fleetManagement")}
            onLayoutChange={(nextLayout) => updateQuickPanelLayout("fleetManagement", nextLayout)}
            onClose={() => layout.toggleQuickPanel("fleetManagement")}
          >
            <FleetManagementQuickPanelContent
              vehicles={fleetVehicles}
              pinnedVehicleIds={layout.pinnedVehicleIds}
              focusedVehicleId={selection.selectedVehicleId}
              onSelectVehicle={(vehicleId) => {
                void selection.selectVehicle(vehicleId);
              }}
              onPinVehicle={layout.pinVehicleOverlay}
              onUnpinVehicle={layout.unpinVehicleOverlay}
            />
          </DraggableQuickPanelWindow>
        ) : null}

        {layout.quickPanels.alerts ? (
          <DraggableQuickPanelWindow
            panelId="alerts"
            index={openQuickPanelIds.indexOf("alerts")}
            containerWidth={viewportBounds.width}
            containerHeight={viewportBounds.height}
            bottomPadding={bottomPadding}
            rightReservedWidth={quickPanelReservedWidth}
            edgePadding={LIVE_FLEET_EDGE_PADDING}
            topReservedPadding={topReservedHeight}
            panelWidth={QUICK_PANEL_WIDTH}
            estimatedHeight={QUICK_PANEL_ESTIMATED_HEIGHT}
            layout={quickPanelLayouts.alerts}
            title="Alerts stream"
            subtitle="High-signal alerts without leaving the map."
            icon={<BellRing className="h-4 w-4" />}
            onFocus={() => focusQuickPanel("alerts")}
            onLayoutChange={(nextLayout) => updateQuickPanelLayout("alerts", nextLayout)}
            onClose={() => layout.toggleQuickPanel("alerts")}
          >
            <AlertsQuickPanelContent
              alerts={triggeredAlerts}
              onSelectVehicle={(vehicleId) => {
                void selection.selectVehicle(vehicleId);
              }}
            />
          </DraggableQuickPanelWindow>
        ) : null}

        {pinnedVehicles.map((vehicle, index) => {
          const statusMeta = getVehicleDisplayStatusMeta(vehicle);
          const expandedHeight = getPinnedWindowExpandedHeight(viewportBounds.height, bottomPadding);
          const pinnedLayout = pinnedWindowLayouts[vehicle.id];
          const currentExpandedHeight = pinnedLayout?.height ?? expandedHeight;
          const bodyMaxHeightPx = Math.max(260, currentExpandedHeight - 92);
          const overlayState = getOverlayState(vehicle);

          return (
            <DraggablePinnedVehicleWindow
              key={vehicle.id}
              index={index}
              containerWidth={viewportBounds.width}
              containerHeight={viewportBounds.height}
              bottomPadding={bottomPadding}
              rightReservedWidth={pinnedWindowReservedWidth}
              edgePadding={LIVE_FLEET_EDGE_PADDING}
              topReservedPadding={topReservedHeight}
              expandedWidth={PINNED_WINDOW_WIDTH}
              collapsedWidth={PINNED_WINDOW_COLLAPSED_WIDTH}
              collapsedHeight={PINNED_WINDOW_COLLAPSED_HEIGHT}
              expandedHeight={expandedHeight}
              layout={pinnedLayout}
              label={vehicle.name}
              badgeClassName={statusMeta.badgeClassName}
              onFocus={() => focusPinnedVehicle(vehicle.id)}
              onLayoutChange={(nextLayout) => updatePinnedWindowLayout(vehicle.id, nextLayout)}
              onUnpin={() => layout.unpinVehicleOverlay(vehicle.id)}
            >
              <VehicleOverlayInstance
                vehicle={overlayState.vehicle}
                detail={overlayState.detail}
                route={vehicle.id === selection.selectedVehicleId ? projection.routeWithAlertMarkers : null}
                selectedSegment={vehicle.id === selection.selectedVehicleId ? playback.selectedSegment : null}
                isLoading={false}
                isPinned
                activeAlerts={activeAlertsByVehicleId[vehicle.id] ?? []}
                streetViewSnapshotKey={playback.timelineInspectionRevision}
                streetViewPosition={getStreetViewPosition(vehicle.id)}
                onClose={() => updatePinnedWindowLayout(vehicle.id, { isCollapsed: true })}
                onTogglePin={() => layout.unpinVehicleOverlay(vehicle.id)}
                onOpenGraph={playback.openGraphOverlay}
                onAlertStateChange={(alertId, state) => void updateAlertState(alertId, state)}
                bodyMaxHeightPx={bodyMaxHeightPx}
              />
            </DraggablePinnedVehicleWindow>
          );
        })}

        <div className="absolute inset-x-4 z-[1325] xl:hidden" style={{ bottom: `${bottomPadding + 12}px` }}>
          {activeVehicle && mobileOverlayState ? (
            <div className="pointer-events-auto">
              <VehicleOverlayInstance
                vehicle={mobileOverlayState.vehicle}
                detail={mobileOverlayState.detail}
                route={projection.routeWithAlertMarkers}
                selectedSegment={playback.selectedSegment}
                isLoading={data.isLoadingVehicleDetail}
                isPinned={layout.pinnedVehicleIds.includes(activeVehicle.id)}
                activeAlerts={activeAlertsByVehicleId[activeVehicle.id] ?? []}
                streetViewSnapshotKey={playback.timelineInspectionRevision}
                streetViewPosition={getStreetViewPosition(activeVehicle.id)}
                onClose={selection.dismissSelectedVehicle}
                onTogglePin={() =>
                  layout.pinnedVehicleIds.includes(activeVehicle.id)
                    ? layout.unpinVehicleOverlay(activeVehicle.id)
                    : layout.pinVehicleOverlay(activeVehicle.id)
                }
                onOpenGraph={playback.openGraphOverlay}
                onAlertStateChange={(alertId, state) => void updateAlertState(alertId, state)}
                bodyMaxHeightPx={Math.max(300, LIVE_FLEET_TIMELINE_RESERVED_HEIGHT)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <SegmentGraphOverlay isOpen={Boolean(graphSegment)} segment={graphSegment} onClose={playback.closeGraphOverlay} />

    </>
  );
}

