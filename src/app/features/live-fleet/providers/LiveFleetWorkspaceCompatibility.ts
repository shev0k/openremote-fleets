import { useMemo } from "react";
import { useLiveFleetVehicleData } from "./LiveFleetDataContext";
import { useLiveFleetLayoutState } from "./LiveFleetLayoutContext";
import { useLiveFleetPlaybackState } from "./LiveFleetPlaybackContext";
import { useLiveFleetMapPreferences } from "./LiveFleetPreferencesContext";
import { useLiveFleetVehicleSelection } from "./LiveFleetSelectionContext";
import type { LiveFleetWorkspaceContextValue } from "./liveFleetWorkspace.types";

// Compatibility wrappers for tests and transitional callers. Production components should prefer focused hooks.
export function useLiveFleetWorkspace() {
  const data = useLiveFleetVehicleData();
  const selection = useLiveFleetVehicleSelection();
  const playback = useLiveFleetPlaybackState();
  const preferences = useLiveFleetMapPreferences();
  const layout = useLiveFleetLayoutState();

  return useMemo<LiveFleetWorkspaceContextValue>(
    () => ({
      ...data,
      ...selection,
      ...playback,
      ...preferences,
      ...layout,
    }),
    [data, layout, playback, preferences, selection],
  );
}

export function useMapConfig() {
  const context = useLiveFleetMapPreferences();

  return {
    mapType: context.mapType,
    isWorkspaceOpen: context.isWorkspaceOpen,
    setMapType: context.setMapType,
    setWorkspaceOpen: context.setWorkspaceOpen,
  };
}

export function useWidgetLayout() {
  const context = useLiveFleetLayoutState();

  return {
    widgetLayout: context.widgetLayout,
    setActiveTab: context.setActiveTab,
    toggleWidgetVisibility: context.toggleWidgetVisibility,
    reorderWidget: context.reorderWidget,
    moveWidget: context.moveWidget,
  };
}

export function useVehicleInteraction() {
  const data = useLiveFleetVehicleData();
  const selection = useLiveFleetVehicleSelection();
  const playback = useLiveFleetPlaybackState();
  const layout = useLiveFleetLayoutState();

  return {
    vehicles: data.vehicles,
    isLoadingVehicles: data.isLoadingVehicles,
    vehiclesLoadError: data.vehiclesLoadError,
    selectedVehicleId: selection.selectedVehicleId,
    selectedVehicle: selection.selectedVehicle,
    selectionLoadError: selection.selectionLoadError,
    vehicleDetail: data.vehicleDetail,
    vehicleDetailsById: data.vehicleDetailsById,
    isLoadingVehicleDetail: data.isLoadingVehicleDetail,
    route: playback.route,
    historicalRoute: playback.historicalRoute,
    isLoadingRoute: playback.isLoadingRoute,
    selectedSegmentId: playback.selectedSegmentId,
    selectedSegment: playback.selectedSegment,
    isTimelineVisible: layout.isTimelineVisible,
    areTimelineSignalsVisible: layout.areTimelineSignalsVisible,
    timelineHeightPx: layout.timelineHeightPx,
    playbackProgress: playback.playbackProgress,
    playbackSpeed: playback.playbackSpeed,
    isPlaybackRunning: playback.isPlaybackRunning,
    isTimelineInspecting: playback.isTimelineInspecting,
    timelineInspectionRevision: playback.timelineInspectionRevision,
    isSimulationEnabled: playback.isSimulationEnabled,
    simulationSpeed: playback.simulationSpeed,
    selectVehicle: selection.selectVehicle,
    dismissSelectedVehicle: selection.dismissSelectedVehicle,
    selectSegment: playback.selectSegment,
    setTimelineVisible: layout.setTimelineVisible,
    setTimelineSignalsVisible: layout.setTimelineSignalsVisible,
    setTimelineHeightPx: layout.setTimelineHeightPx,
    setPlaybackProgress: playback.setPlaybackProgress,
    setPlaybackSpeed: playback.setPlaybackSpeed,
    setSimulationSpeed: playback.setSimulationSpeed,
    beginTimelineScrub: playback.beginTimelineScrub,
    endTimelineScrub: playback.endTimelineScrub,
    togglePlayback: playback.togglePlayback,
    rewindPlayback: playback.rewindPlayback,
    fastForwardPlayback: playback.fastForwardPlayback,
  };
}

export function useOverlayManager() {
  const data = useLiveFleetVehicleData();
  const selection = useLiveFleetVehicleSelection();
  const playback = useLiveFleetPlaybackState();
  const layout = useLiveFleetLayoutState();

  return {
    quickPanels: layout.quickPanels,
    activeVehicleOverlayId: layout.activeVehicleOverlayId,
    pinnedVehicleIds: layout.pinnedVehicleIds,
    graphSegmentId: playback.graphSegmentId,
    vehicleDetailsById: data.vehicleDetailsById,
    closeActiveVehicleOverlay: selection.closeActiveVehicleOverlay,
    dismissSelectedVehicle: selection.dismissSelectedVehicle,
    pinVehicleOverlay: layout.pinVehicleOverlay,
    unpinVehicleOverlay: layout.unpinVehicleOverlay,
    toggleQuickPanel: layout.toggleQuickPanel,
    openGraphOverlay: playback.openGraphOverlay,
    closeGraphOverlay: playback.closeGraphOverlay,
  };
}
