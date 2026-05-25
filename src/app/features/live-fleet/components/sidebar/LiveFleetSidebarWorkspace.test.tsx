/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveFleetSidebarWorkspace } from "./LiveFleetSidebarWorkspace";

const mocks = vi.hoisted(() => ({
  alertsContext: {
    alerts: [],
    activeAlertsCount: 0,
    updateAlertState: vi.fn(),
  },
  data: {
    vehicles: [],
    isLoadingVehicles: false,
  },
  mapPreferences: {
    isWorkspaceOpen: true,
    setWorkspaceOpen: vi.fn(),
  },
  layout: {
    quickPanels: { alerts: false, fleetManagement: false },
    toggleQuickPanel: vi.fn(),
    widgetLayout: {
      activeTab: "quickPanels",
      visibleWidgetIds: ["fleetSummary", "criticalAlerts", "fleetList"],
      widgetOrderIds: ["fleetSummary", "criticalAlerts", "fleetList"],
    },
    setActiveTab: vi.fn(),
    moveWidget: vi.fn(),
    reorderWidget: vi.fn(),
    toggleWidgetVisibility: vi.fn(),
  },
  playback: {
    route: null,
    historicalRoute: null,
    selectedSegmentId: null,
    isLoadingRoute: false,
    selectSegment: vi.fn(),
    openGraphOverlay: vi.fn(),
  },
  selection: {
    selectedVehicle: null,
    selectedVehicleId: null,
    selectVehicle: vi.fn(),
  },
}));

vi.mock("../../../../contexts/AlertsContext", () => ({
  useAlerts: () => mocks.alertsContext,
}));

vi.mock("../../../../providers/AppServicesProvider", () => ({
  useAppServices: () => ({ dataMode: "mock" }),
}));

vi.mock("../../providers/LiveFleetDataContext", () => ({
  useLiveFleetVehicleData: () => mocks.data,
}));

vi.mock("../../providers/LiveFleetLayoutContext", () => ({
  useLiveFleetLayoutState: () => mocks.layout,
}));

vi.mock("../../providers/LiveFleetPlaybackContext", () => ({
  useLiveFleetPlaybackState: () => mocks.playback,
}));

vi.mock("../../providers/LiveFleetPreferencesContext", () => ({
  useLiveFleetMapPreferences: () => mocks.mapPreferences,
}));

vi.mock("../../providers/LiveFleetSelectionContext", () => ({
  useLiveFleetVehicleSelection: () => mocks.selection,
}));

vi.mock("./widgetHeightStorage", () => ({
  clearStoredWidgetHeights: vi.fn(),
  persistWidgetHeights: vi.fn(),
  readStoredWidgetHeights: () => ({}),
}));

describe("LiveFleetSidebarWorkspace", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("omits the redundant Fleet Breakdown action from Quick Panels", () => {
    render(<LiveFleetSidebarWorkspace />);

    expect(screen.queryByText("Fleet breakdown")).not.toBeInTheDocument();
    expect(screen.getByText("Alerts stream")).toBeInTheDocument();
    expect(screen.getByText("Fleet management")).toBeInTheDocument();
  });

  it("does not render Fleet Summary in the workspace even when stale layout data includes it", () => {
    mocks.layout.widgetLayout = {
      activeTab: "workspace",
      visibleWidgetIds: ["fleetSummary", "criticalAlerts", "fleetList"],
      widgetOrderIds: ["fleetSummary", "criticalAlerts", "fleetList"],
    };

    render(<LiveFleetSidebarWorkspace />);

    expect(screen.queryByText("Fleet summary")).not.toBeInTheDocument();
    expect(screen.getByText("Critical alerts")).toBeInTheDocument();
  });
});
