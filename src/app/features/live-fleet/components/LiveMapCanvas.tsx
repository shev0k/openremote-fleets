import { Navigation, Radio } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CustomMap, CustomMapHandle } from "../../../components/map/CustomMap";
import { useAlerts } from "../../../contexts/AlertsContext";
import { useAppServices } from "../../../providers/AppServicesProvider";
import { useAppPreferences } from "../../../providers/AppPreferencesProvider";
import { MapControlBar } from "./MapControlBar";
import { useLiveFleetVehicleData } from "../providers/LiveFleetDataContext";
import { useLiveFleetLayoutState } from "../providers/LiveFleetLayoutContext";
import { useLiveFleetPlaybackState } from "../providers/LiveFleetPlaybackContext";
import { useLiveFleetMapPreferences } from "../providers/LiveFleetPreferencesContext";
import { useLiveFleetVehicleSelection } from "../providers/LiveFleetSelectionContext";
import { addCriticalAlertEventMarkersToRoute } from "../../../components/map/routeSegments/routeAlarmMarkers";
import { getCurrentTimeLabel } from "../../../components/playback/playbackUtils";
import { buildLiveFleetProjection } from "../liveFleetProjection";

export function LiveMapCanvas() {
  const mapRef = useRef<CustomMapHandle | null>(null);
  const data = useLiveFleetVehicleData();
  const layout = useLiveFleetLayoutState();
  const playback = useLiveFleetPlaybackState();
  const mapPreferences = useLiveFleetMapPreferences();
  const selection = useLiveFleetVehicleSelection();
  const { alerts } = useAlerts();
  const { dataMode } = useAppServices();
  const { preferences, formatTime } = useAppPreferences();
  const [currentClockLabel, setCurrentClockLabel] = useState(() => formatTime(new Date()));
  const routeWithAlertMarkers = useMemo(
    () => addCriticalAlertEventMarkersToRoute(playback.route, alerts),
    [alerts, playback.route],
  );
  const activeMapSegmentId = playback.selectedSegmentId;

  const projection = useMemo(
    () =>
      buildLiveFleetProjection({
        dataMode,
        vehicles: data.vehicles,
        alerts,
        selectedVehicleId: selection.selectedVehicleId,
        selectedVehicleFallback: selection.selectedVehicle,
        route: playback.route,
        routeWithAlertMarkers,
        selectedSegmentId: playback.selectedSegmentId,
        activeMapSegmentId,
        playbackProgress: playback.playbackProgress,
        playbackSpeed: playback.playbackSpeed,
        isTimelineInspecting: playback.isTimelineInspecting,
      }),
    [
      alerts,
      dataMode,
      data.vehicles,
      playback.isTimelineInspecting,
      playback.playbackProgress,
      playback.playbackSpeed,
      playback.selectedSegmentId,
      activeMapSegmentId,
      routeWithAlertMarkers,
      selection.selectedVehicle,
      selection.selectedVehicleId,
    ],
  );
  const selectedVehicle = projection.selectedVehicle;

  const currentTimeLabel = getCurrentTimeLabel(
    projection.routeWithAlertMarkers,
    playback.playbackProgress,
    preferences.behavior.timeFormat,
  );
  const hasDockedVehicleOverlay = Boolean(
    layout.activeVehicleOverlayId &&
      !layout.pinnedVehicleIds.includes(layout.activeVehicleOverlayId),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentClockLabel(formatTime(new Date()));
    }, 30000);

    return () => window.clearInterval(timer);
  }, [formatTime]);

  const liveTrackingState = useMemo(() => {
    if (data.isLoadingVehicles || playback.isLoadingRoute || data.isLoadingVehicleDetail) {
      return { label: "Syncing", colorClassName: "text-info", dotClassName: "bg-info" };
    }

    if (selectedVehicle?.status === "offline") {
      return { label: "Connection lost", colorClassName: "text-danger", dotClassName: "bg-danger" };
    }

    if (selectedVehicle?.status === "alerting") {
      return { label: "Monitoring", colorClassName: "text-warning", dotClassName: "bg-warning" };
    }

    return { label: "Connected", colorClassName: "text-brand", dotClassName: "bg-brand" };
  }, [
    data.isLoadingVehicleDetail,
    data.isLoadingVehicles,
    playback.isLoadingRoute,
    selectedVehicle?.status,
  ]);

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden bg-map-surface">
      <div className="pointer-events-none absolute left-1/2 top-[104px] z-[1200] -translate-x-1/2">
        <div className="app-panel inline-flex items-center gap-3 rounded-full px-4 py-2 text-[13px]">
          <span className="inline-flex items-center gap-2 text-content-primary">
            <Radio className={`h-4 w-4 ${liveTrackingState.colorClassName}`} />
            Live tracking
          </span>
          <span className={`inline-flex items-center gap-2 ${liveTrackingState.colorClassName}`}>
            <span className={`h-2 w-2 rounded-full ${liveTrackingState.dotClassName} shadow-[0_0_10px_currentColor]`} />
            {liveTrackingState.label}
          </span>
          <span className="h-3 w-px bg-border-subtle" />
          <span className="text-content-muted">{selectedVehicle ? currentTimeLabel : currentClockLabel}</span>
          {selectedVehicle ? (
            <>
              <span className="h-3 w-px bg-border-subtle" />
              <span className="inline-flex items-center gap-2 text-content-muted">
                <Navigation className="h-3.5 w-3.5" />
                {selectedVehicle.name}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <CustomMap
        ref={mapRef}
        vehicles={projection.mapVehicles}
        selectedVehicleId={selection.selectedVehicleId}
        onVehicleClick={(vehicleId) => void selection.selectVehicle(vehicleId)}
        routeLine={projection.routeLine}
        activeSegmentLine={projection.activeSegmentLine}
        route={projection.routeWithAlertMarkers}
        activeSegmentId={projection.activeMapSegmentId}
        onRouteSegmentClick={playback.selectSegment}
        mapType={mapPreferences.mapType}
        isRouteLoading={playback.isLoadingRoute}
        defaultFitScope="fleet"
      />

      <MapControlBar
        mapType={mapPreferences.mapType}
        isWorkspaceOpen={mapPreferences.isWorkspaceOpen}
        isTimelineVisible={layout.isTimelineVisible}
        isTimelineEnabled={Boolean(selectedVehicle && playback.route)}
        overlayOffsetPx={hasDockedVehicleOverlay ? 432 : 24}
        simulationSpeed={playback.isSimulationEnabled ? playback.simulationSpeed : undefined}
        onMapTypeChange={mapPreferences.setMapType}
        onSimulationSpeedChange={
          playback.isSimulationEnabled ? playback.setSimulationSpeed : undefined
        }
        onWorkspaceToggle={() => mapPreferences.setWorkspaceOpen(!mapPreferences.isWorkspaceOpen)}
        onTimelineToggle={() => layout.setTimelineVisible(!layout.isTimelineVisible)}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onResetView={() => mapRef.current?.resetView()}
      />
    </div>
  );
}
