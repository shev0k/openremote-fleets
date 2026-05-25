/* ======== IMPORTS ======== */

import { PlaybackRoute, PlaybackQuery, TripSegment } from "../../../../domain/models/playback";
import { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";

/* ======== TYPES ======== */

export type LiveFleetMapType = "default" | "satellite" | "terrain";

export type LiveFleetWorkspaceTab = "workspace" | "quickPanels";

export type LiveFleetWidgetId = "criticalAlerts" | "fleetList" | "tripHistory";

export type LiveFleetQuickPanelId = "alerts" | "fleetManagement";

export type LiveFleetWidgetReorderDirection = "up" | "down";

export interface LiveFleetWidgetLayoutState {
  activeTab: LiveFleetWorkspaceTab;
  widgetOrderIds: LiveFleetWidgetId[];
  visibleWidgetIds: LiveFleetWidgetId[];
}

export interface LiveFleetQuickPanelState {
  alerts: boolean;
  fleetManagement: boolean;
}

export interface LiveFleetDataContextValue {
  vehicles: Vehicle[];
  isLoadingVehicles: boolean;
  vehiclesLoadError: string | null;
  vehicleDetailsById: Record<string, VehicleDetail>;
  vehicleDetail: VehicleDetail | null;
  isLoadingVehicleDetail: boolean;
}

export interface LiveFleetSelectionContextValue {
  selectedVehicleId: string | null;
  selectedVehicle: Vehicle | null;
  selectionLoadError: string | null;
  selectVehicle: (vehicleId: string) => Promise<void>;
  dismissSelectedVehicle: () => void;
  closeActiveVehicleOverlay: () => void;
}

export interface LiveFleetPlaybackContextValue {
  route: PlaybackRoute | null;
  historicalRoute: PlaybackRoute | null;
  isLoadingRoute: boolean;
  selectedSegmentId: string | null;
  selectedSegment: TripSegment | null;
  graphSegmentId: string | null;
  playbackProgress: number;
  playbackSpeed: number;
  isPlaybackRunning: boolean;
  isTimelineInspecting: boolean;
  timelineInspectionRevision: number;
  isSimulationEnabled: boolean;
  simulationSpeed: number;
  selectSegment: (segmentId: string) => void;
  openGraphOverlay: (segmentId: string) => void;
  closeGraphOverlay: () => void;
  setPlaybackProgress: (nextProgress: number) => void;
  setPlaybackSpeed: (nextSpeed: number) => void;
  setSimulationSpeed: (nextSpeed: number) => void;
  beginTimelineScrub: () => void;
  endTimelineScrub: () => void;
  togglePlayback: () => void;
  rewindPlayback: () => void;
  fastForwardPlayback: () => void;
}

export interface LiveFleetPreferencesContextValue {
  mapType: LiveFleetMapType;
  isWorkspaceOpen: boolean;
  setMapType: (mapType: LiveFleetMapType) => void;
  setWorkspaceOpen: (isOpen: boolean) => void;
}

export interface LiveFleetLayoutContextValue {
  isTimelineVisible: boolean;
  areTimelineSignalsVisible: boolean;
  timelineHeightPx: number;
  widgetLayout: LiveFleetWidgetLayoutState;
  quickPanels: LiveFleetQuickPanelState;
  activeVehicleOverlayId: string | null;
  pinnedVehicleIds: string[];
  setTimelineVisible: (isVisible: boolean) => void;
  setTimelineSignalsVisible: (isVisible: boolean) => void;
  setTimelineHeightPx: (heightPx: number) => void;
  setActiveTab: (tab: LiveFleetWorkspaceTab) => void;
  toggleWidgetVisibility: (widgetId: LiveFleetWidgetId) => void;
  reorderWidget: (widgetId: LiveFleetWidgetId, direction: LiveFleetWidgetReorderDirection) => void;
  moveWidget: (widgetId: LiveFleetWidgetId, targetIndex: number) => void;
  pinVehicleOverlay: (vehicleId: string) => void;
  unpinVehicleOverlay: (vehicleId: string) => void;
  toggleQuickPanel: (panelId: LiveFleetQuickPanelId) => void;
}

export interface LiveFleetWorkspaceContextValue
  extends LiveFleetDataContextValue,
    LiveFleetSelectionContextValue,
    LiveFleetPlaybackContextValue,
    LiveFleetPreferencesContextValue,
    LiveFleetLayoutContextValue {}

/* ======== CONSTANTS ======== */

export const LAST_24_HOURS_QUERY: PlaybackQuery = { preset: "last24Hours" };
