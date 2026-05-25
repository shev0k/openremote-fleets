/* ======== IMPORTS ======== */

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppServices } from "../../../providers/AppServicesProvider";
import {
  LiveFleetDataContextValue,
  LiveFleetLayoutContextValue,
  LiveFleetPlaybackContextValue,
  LiveFleetPreferencesContextValue,
  LiveFleetSelectionContextValue,
} from "./liveFleetWorkspace.types";
import { TripSegment } from "../../../../domain/models/playback";
import { LiveFleetDataProvider } from "./LiveFleetDataContext";
import { LiveFleetLayoutProvider } from "./LiveFleetLayoutContext";
import { LiveFleetPlaybackProvider } from "./LiveFleetPlaybackContext";
import { LiveFleetPreferencesProvider } from "./LiveFleetPreferencesContext";
import { LiveFleetSelectionProvider } from "./LiveFleetSelectionContext";
import { useLiveFleetData } from "./useLiveFleetData";
import { useLiveFleetMapPreferences as useLiveFleetMapPreferencesState } from "./useLiveFleetMapPreferences";
import { useLiveFleetOverlayState } from "./useLiveFleetOverlayState";
import { useLiveFleetRealModeRefresh } from "./useLiveFleetRealModeRefresh";
import { useLiveFleetRoutes } from "./useLiveFleetRoutes";
import { useLiveFleetSelection } from "./useLiveFleetSelection";
import { useLiveFleetSimulation } from "./useLiveFleetSimulation";
import { useLiveFleetWidgetLayoutState } from "./useLiveFleetWidgetLayoutState";

/* ======== TYPE EXPORTS ======== */

export type {
  LiveFleetMapType,
  LiveFleetQuickPanelId,
  LiveFleetWidgetId,
  LiveFleetWidgetReorderDirection,
  LiveFleetWorkspaceTab,
} from "./liveFleetWorkspace.types";

/* ======== PROVIDER ======== */

export function LiveFleetWorkspaceProvider({ children }: { children: ReactNode }) {
  const { fleetRepository, playbackRepository, liveFleetStateService } = useAppServices();
  const isRouteBackedSimulationEnabled = liveFleetStateService.supportsRouteBackedSimulation;
  const { mapType, setMapType, isWorkspaceOpen, setWorkspaceOpen } = useLiveFleetMapPreferencesState();
  const [isTimelineVisible, setTimelineVisible] = useState(false);
  const [areTimelineSignalsVisible, setTimelineSignalsVisible] = useState(false);
  const [timelineHeightPx, setTimelineHeightPx] = useState(0);
  const {
    widgetLayout,
    setActiveTab,
    showWidget,
    toggleWidgetVisibility,
    reorderWidget,
    moveWidget,
  } = useLiveFleetWidgetLayoutState();
  const {
    quickPanels,
    activeVehicleOverlayId,
    pinnedVehicleIds,
    setActiveVehicleOverlayId,
    pinVehicleOverlay,
    unpinVehicleOverlay,
    toggleQuickPanel,
    reconcileVehicleOverlays,
  } = useLiveFleetOverlayState();
  const {
    route,
    historicalRoute,
    isLoadingRoute,
    selectedSegmentId,
    graphSegmentId,
    setRoute,
    setIsLoadingRoute,
    setSelectedSegmentId,
    setGraphSegmentId,
    playback,
    resetRoutes,
    beginRouteSelection,
    applySelectedRoutes,
    createSelectSegment,
  } = useLiveFleetRoutes();
  const {
    beginTimelineScrub,
    endTimelineScrub,
    fastForwardPlayback,
    isPlaybackRunning,
    isTimelineScrubbing,
    playbackProgress,
    playbackSpeed,
    resetPlayback,
    rewindPlayback,
    setPlaybackProgress,
    setPlaybackSpeed,
    timelineInspectionRevision,
    togglePlayback,
  } = playback;
  const { vehicles, setVehicles, setVehiclesLoadError, isLoadingVehicles, vehiclesLoadError, simulationRefs } = useLiveFleetData({
    fleetRepository,
    playbackRepository,
    liveFleetStateService,
    isRouteBackedSimulationEnabled,
  });
  const {
    selectedVehicleId,
    vehicleDetailsById,
    isLoadingVehicleDetail,
    selectionLoadError,
    setVehicleDetailsById,
    reconcileVehicleIds,
    selectVehicle,
    dismissSelectedVehicle,
  } = useLiveFleetSelection({
    fleetRepository,
    playbackRepository,
    liveFleetStateService,
    isRouteBackedSimulationEnabled,
    vehicles,
    simulationRefs,
    resetPlayback,
    showWidget,
    setTimelineVisible,
    setTimelineSignalsVisible,
    setTimelineHeightPx,
    setActiveVehicleOverlayId,
    resetRoutes,
    beginRouteSelection,
    applySelectedRoutes,
    setIsLoadingRoute,
  });
  const { simulationSpeed, setSimulationSpeed } = useLiveFleetSimulation({
    isRouteBackedSimulationEnabled,
    liveFleetStateService,
    simulationRefs,
    selectedVehicleId,
    route,
    isPlaybackRunning,
    isTimelineScrubbing,
    playbackProgress,
    setVehicles,
    setVehicleDetailsById,
    setRoute,
    setPlaybackProgress,
    setSelectedSegmentId,
  });
  useLiveFleetRealModeRefresh({
    fleetRepository,
    playbackRepository,
    selectedVehicleId,
    route,
    isRouteBackedSimulationEnabled,
    isPlaybackRunning,
    isTimelineScrubbing,
    playbackProgress,
    setVehicles,
    setVehiclesLoadError,
    setRoute,
    setSelectedSegmentId,
    setPlaybackProgress,
  });
  const selectSegment = useMemo(() => createSelectSegment(setTimelineVisible), [createSelectSegment]);
  const vehicleIdsKey = useMemo(
    () => vehicles.map((vehicle) => vehicle.id).sort().join("\u0000"),
    [vehicles],
  );

  useEffect(() => {
    const validVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
    reconcileVehicleIds(validVehicleIds);
    reconcileVehicleOverlays(validVehicleIds);
  }, [reconcileVehicleIds, reconcileVehicleOverlays, vehicleIdsKey]);

  /* ======== DERIVED MODELS ======== */

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const vehicleDetail = useMemo(
    () => (selectedVehicleId ? vehicleDetailsById[selectedVehicleId] ?? null : null),
    [selectedVehicleId, vehicleDetailsById],
  );

  const selectedSegment = useMemo<TripSegment | null>(
    () => route?.tripSegments.find((trip) => trip.id === selectedSegmentId) ?? null,
    [route, selectedSegmentId],
  );
  const isTimelineInspecting = Boolean(
    route && playbackProgress < 99.5 && (isTimelineScrubbing || timelineInspectionRevision > 0 || isPlaybackRunning),
  );

  /* ======== CONTEXT VALUES ======== */

  const dataValue = useMemo<LiveFleetDataContextValue>(
    () => ({
      vehicles,
      isLoadingVehicles,
      vehiclesLoadError,
      vehicleDetailsById,
      vehicleDetail,
      isLoadingVehicleDetail,
    }),
    [isLoadingVehicleDetail, isLoadingVehicles, vehicleDetail, vehicleDetailsById, vehicles, vehiclesLoadError],
  );

  const selectionValue = useMemo<LiveFleetSelectionContextValue>(
    () => ({
      selectedVehicleId,
      selectedVehicle,
      selectionLoadError,
      selectVehicle,
      dismissSelectedVehicle,
      closeActiveVehicleOverlay: dismissSelectedVehicle,
    }),
    [dismissSelectedVehicle, selectVehicle, selectedVehicle, selectedVehicleId, selectionLoadError],
  );

  const playbackValue = useMemo<LiveFleetPlaybackContextValue>(
    () => ({
      route,
      historicalRoute,
      isLoadingRoute,
      selectedSegmentId,
      selectedSegment,
      graphSegmentId,
      playbackProgress,
      playbackSpeed,
      isPlaybackRunning,
      isTimelineInspecting,
      timelineInspectionRevision,
      isSimulationEnabled: isRouteBackedSimulationEnabled,
      simulationSpeed,
      selectSegment,
      openGraphOverlay: setGraphSegmentId,
      closeGraphOverlay: () => setGraphSegmentId(null),
      setPlaybackProgress,
      setPlaybackSpeed,
      setSimulationSpeed,
      beginTimelineScrub,
      endTimelineScrub,
      togglePlayback,
      rewindPlayback,
      fastForwardPlayback,
    }),
    [
      beginTimelineScrub,
      endTimelineScrub,
      fastForwardPlayback,
      graphSegmentId,
      historicalRoute,
      isLoadingRoute,
      isPlaybackRunning,
      isRouteBackedSimulationEnabled,
      isTimelineInspecting,
      playbackProgress,
      playbackSpeed,
      rewindPlayback,
      route,
      selectSegment,
      selectedSegment,
      selectedSegmentId,
      setGraphSegmentId,
      setPlaybackProgress,
      setPlaybackSpeed,
      setSimulationSpeed,
      simulationSpeed,
      timelineInspectionRevision,
      togglePlayback,
    ],
  );

  const preferencesValue = useMemo<LiveFleetPreferencesContextValue>(
    () => ({
      mapType,
      isWorkspaceOpen,
      setMapType,
      setWorkspaceOpen,
    }),
    [isWorkspaceOpen, mapType, setMapType, setWorkspaceOpen],
  );

  const layoutValue = useMemo<LiveFleetLayoutContextValue>(
    () => ({
      isTimelineVisible,
      areTimelineSignalsVisible,
      timelineHeightPx,
      widgetLayout,
      quickPanels,
      activeVehicleOverlayId,
      pinnedVehicleIds,
      setTimelineVisible,
      setTimelineSignalsVisible,
      setTimelineHeightPx,
      setActiveTab,
      toggleWidgetVisibility,
      reorderWidget,
      moveWidget,
      pinVehicleOverlay,
      unpinVehicleOverlay,
      toggleQuickPanel,
    }),
    [
      activeVehicleOverlayId,
      areTimelineSignalsVisible,
      isTimelineVisible,
      moveWidget,
      pinVehicleOverlay,
      pinnedVehicleIds,
      quickPanels,
      reorderWidget,
      setActiveTab,
      setTimelineHeightPx,
      setTimelineSignalsVisible,
      setTimelineVisible,
      timelineHeightPx,
      toggleQuickPanel,
      toggleWidgetVisibility,
      unpinVehicleOverlay,
      widgetLayout,
    ],
  );

  return (
    <LiveFleetDataProvider value={dataValue}>
      <LiveFleetSelectionProvider value={selectionValue}>
        <LiveFleetPlaybackProvider value={playbackValue}>
          <LiveFleetPreferencesProvider value={preferencesValue}>
            <LiveFleetLayoutProvider value={layoutValue}>{children}</LiveFleetLayoutProvider>
          </LiveFleetPreferencesProvider>
        </LiveFleetPlaybackProvider>
      </LiveFleetSelectionProvider>
    </LiveFleetDataProvider>
  );
}
