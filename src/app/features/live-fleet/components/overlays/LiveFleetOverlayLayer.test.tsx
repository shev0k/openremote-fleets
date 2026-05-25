/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybackRoute } from "../../../../../domain/models/playback";
import { Vehicle } from "../../../../../domain/models/vehicle";
import { LiveFleetOverlayLayer } from "./LiveFleetOverlayLayer";

const mocks = vi.hoisted(() => ({
  data: undefined as unknown,
  layout: undefined as unknown,
  playback: undefined as unknown,
  selection: undefined as unknown,
  alerts: [] as unknown[],
  pinnedWindowLayouts: [] as unknown[],
  vehicleOverlayProps: [] as Array<{ vehicle: Vehicle; detail: unknown; isPinned: boolean }>,
}));

vi.mock("../../../../contexts/AlertsContext", () => ({
  useAlerts: () => ({ alerts: mocks.alerts, updateAlertState: vi.fn() }),
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

vi.mock("../../providers/LiveFleetSelectionContext", () => ({
  useLiveFleetVehicleSelection: () => mocks.selection,
}));

vi.mock("../../../../components/playback/SegmentGraphOverlay", () => ({
  SegmentGraphOverlay: () => null,
}));

vi.mock("../VehicleDetailOverlay", () => ({
  VehicleDetailOverlay: ({
    vehicle,
    detail,
    isPinned,
    onClose,
  }: {
    vehicle: Vehicle;
    detail: unknown;
    isPinned: boolean;
    onClose: () => void;
  }) => {
    mocks.vehicleOverlayProps.push({ vehicle, detail, isPinned });

    return (
      <button type="button" data-testid={`${isPinned ? "pinned" : "docked"}-${vehicle.id}-close`} onClick={onClose}>
        Close {vehicle.name}
      </button>
    );
  },
}));

vi.mock("./DraggablePinnedVehicleWindow", () => ({
  DraggablePinnedVehicleWindow: ({ children, layout, onUnpin }: { children: React.ReactNode; layout: unknown; onUnpin: () => void }) => {
    mocks.pinnedWindowLayouts.push(layout);

    return (
      <div data-testid="pinned-window">
        {children}
        <button type="button" onClick={onUnpin}>
          Unpin pinned vehicle
        </button>
      </div>
    );
  },
}));

vi.mock("./DraggableQuickPanelWindow", () => ({
  DraggableQuickPanelWindow: ({
    children,
    title,
    onClose,
  }: {
    children: React.ReactNode;
    title: string;
    onClose: () => void;
  }) => (
    <div>
      <button type="button" onClick={onClose}>
        Close {title}
      </button>
      {children}
    </div>
  ),
}));

const vehicle: Vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "moving",
  speedKph: 42,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  heading: 92,
  lastUpdatedIso: "2026-05-06T08:45:00Z",
  driverName: "Mila Janssen",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 0,
};

const pinnedVehicle: Vehicle = {
  ...vehicle,
  id: "veh-harbor-07",
  name: "Harbor 07",
  plate: "BR-507-H",
  speedKph: 7,
  latitude: 51.451,
  longitude: 5.481,
  lastUpdatedIso: "2026-05-06T08:44:00.000Z",
};

const historicalRoute: PlaybackRoute = {
  vehicleId: vehicle.id,
  points: [
    {
      latitude: 51.4416,
      longitude: 5.4697,
      timestampIso: "2026-05-06T08:00:00.000Z",
      speedKph: 12,
      directionDegrees: 92,
      ignitionOn: true,
      movement: true,
    },
    {
      latitude: 51.45,
      longitude: 5.48,
      timestampIso: "2026-05-06T08:05:00.000Z",
      speedKph: 30,
      directionDegrees: 96,
      ignitionOn: true,
      movement: true,
    },
  ],
  tripSegments: [
    {
      id: "trip-1",
      startLabel: "08:00",
      endLabel: "08:10",
      startTimeIso: "2026-05-06T08:00:00.000Z",
      endTimeIso: "2026-05-06T08:10:00.000Z",
      durationLabel: "10 min",
      durationMinutes: 10,
      distanceLabel: "5.2 km",
      distanceKm: 5.2,
      stopCount: 0,
      maxSpeedLabel: "30 km/h",
      maxSpeedKph: 30,
      averageSpeedLabel: "21 km/h",
      averageSpeedKph: 21,
      startProgressPercent: 0,
      endProgressPercent: 100,
      telemetrySamples: [
        { signalId: "speed", value: 12, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "speed" },
        { signalId: "speed", value: 30, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "speed" },
        { signalId: "fuelLevel", value: 72, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "fuelLevel" },
        { signalId: "fuelLevel", value: 63, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "fuelLevel" },
        { signalId: "batteryLevel", value: 91, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "batteryLevel" },
        { signalId: "batteryLevel", value: 88, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "batteryLevel" },
        {
          signalId: "totalOdometer",
          value: 182440000,
          timestampIso: "2026-05-06T08:05:00.000Z",
          sourceAttribute: "totalOdometer",
        },
      ],
    },
  ],
};

describe("LiveFleetOverlayLayer", () => {
  beforeEach(() => {
    class ResizeObserverStub {
      observe() {
        return undefined;
      }

      disconnect() {
        return undefined;
      }
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    mocks.alerts = [];
    mocks.pinnedWindowLayouts = [];
    mocks.vehicleOverlayProps = [];
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("collapses a pinned overlay on close without unpinning or dismissing the vehicle", async () => {
    const unpinVehicleOverlay = vi.fn();
    const dismissSelectedVehicle = vi.fn();

    mocks.data = {
      vehicles: [vehicle],
      vehicleDetailsById: {},
      isLoadingVehicleDetail: false,
    };
    mocks.layout = {
      quickPanels: { alerts: false, fleetManagement: false },
      activeVehicleOverlayId: vehicle.id,
      pinnedVehicleIds: [vehicle.id],
      pinVehicleOverlay: vi.fn(),
      unpinVehicleOverlay,
      toggleQuickPanel: vi.fn(),
      isTimelineVisible: false,
      timelineHeightPx: 0,
    };
    mocks.playback = {
      route: null,
      selectedSegment: null,
      graphSegmentId: null,
      playbackProgress: 100,
      isTimelineInspecting: false,
      timelineInspectionRevision: 0,
      openGraphOverlay: vi.fn(),
      closeGraphOverlay: vi.fn(),
    };
    mocks.selection = {
      selectedVehicleId: vehicle.id,
      selectedVehicle: vehicle,
      dismissSelectedVehicle,
    };

    render(<LiveFleetOverlayLayer />);

    fireEvent.click(within(screen.getByTestId("pinned-window")).getByTestId("pinned-veh-atlas-12-close"));

    await waitFor(() => {
      const latestLayout = mocks.pinnedWindowLayouts.at(-1) as { isCollapsed?: boolean } | undefined;
      expect(latestLayout?.isCollapsed).toBe(true);
    });

    expect(unpinVehicleOverlay).not.toHaveBeenCalled();
    expect(dismissSelectedVehicle).not.toHaveBeenCalled();
  });

  it("lets quick panel overlays close themselves directly", () => {
    const toggleQuickPanel = vi.fn();

    mocks.data = {
      vehicles: [vehicle],
      vehicleDetailsById: {},
      isLoadingVehicleDetail: false,
    };
    mocks.layout = {
      quickPanels: { alerts: true, fleetManagement: true },
      activeVehicleOverlayId: null,
      pinnedVehicleIds: [],
      pinVehicleOverlay: vi.fn(),
      unpinVehicleOverlay: vi.fn(),
      toggleQuickPanel,
      isTimelineVisible: false,
      timelineHeightPx: 0,
    };
    mocks.playback = {
      route: null,
      selectedSegment: null,
      graphSegmentId: null,
      playbackProgress: 100,
      isTimelineInspecting: false,
      timelineInspectionRevision: 0,
      openGraphOverlay: vi.fn(),
      closeGraphOverlay: vi.fn(),
    };
    mocks.selection = {
      selectedVehicleId: vehicle.id,
      selectedVehicle: vehicle,
      selectVehicle: vi.fn(),
      dismissSelectedVehicle: vi.fn(),
    };

    render(<LiveFleetOverlayLayer />);

    fireEvent.click(screen.getByRole("button", { name: /close fleet management/i }));
    fireEvent.click(screen.getByRole("button", { name: /close alerts stream/i }));

    expect(toggleQuickPanel).toHaveBeenCalledWith("fleetManagement");
    expect(toggleQuickPanel).toHaveBeenCalledWith("alerts");
  });

  it("passes historical telemetry values to the selected overlay while timeline is inspecting", () => {
    mocks.data = {
      vehicles: [vehicle],
      vehicleDetailsById: {
        [vehicle.id]: {
          ...vehicle,
          lastCommunicationIso: "2026-05-06T08:45:00.000Z",
          gpsAccuracyMeters: 8,
          todayMileageKm: 84.2,
          odometerKm: 182431,
          fuelInTankLiters: 246,
          averageFuelConsumptionLitersPer100Km: 28.4,
          stoppedDurationMinutes: 18,
        },
      },
      isLoadingVehicleDetail: false,
    };
    mocks.layout = {
      quickPanels: { alerts: false, fleetManagement: false },
      activeVehicleOverlayId: vehicle.id,
      pinnedVehicleIds: [],
      pinVehicleOverlay: vi.fn(),
      unpinVehicleOverlay: vi.fn(),
      toggleQuickPanel: vi.fn(),
      isTimelineVisible: true,
      timelineHeightPx: 0,
    };
    mocks.playback = {
      route: historicalRoute,
      selectedSegment: historicalRoute.tripSegments[0],
      graphSegmentId: null,
      playbackProgress: 50,
      isTimelineInspecting: true,
      timelineInspectionRevision: 1,
      openGraphOverlay: vi.fn(),
      closeGraphOverlay: vi.fn(),
    };
    mocks.selection = {
      selectedVehicleId: vehicle.id,
      selectedVehicle: vehicle,
      dismissSelectedVehicle: vi.fn(),
    };

    render(<LiveFleetOverlayLayer />);

    expect(mocks.vehicleOverlayProps.at(-1)?.vehicle).toMatchObject({
      speedKph: 30,
      fuelLevelPercent: 63,
      batteryLevelPercent: 88,
      lastUpdatedIso: "2026-05-06T08:05:00.000Z",
    });
    expect(mocks.vehicleOverlayProps.at(-1)?.detail).toMatchObject({
      lastCommunicationIso: "2026-05-06T08:05:00.000Z",
      odometerKm: 182440,
    });
  });

  it("keeps unrelated pinned overlays on live telemetry while the selected vehicle is inspecting history", () => {
    mocks.data = {
      vehicles: [vehicle, pinnedVehicle],
      vehicleDetailsById: {
        [pinnedVehicle.id]: {
          ...pinnedVehicle,
          lastCommunicationIso: pinnedVehicle.lastUpdatedIso,
          gpsAccuracyMeters: 8,
          todayMileageKm: 20,
          odometerKm: 5000,
          fuelInTankLiters: 120,
          averageFuelConsumptionLitersPer100Km: 22,
          stoppedDurationMinutes: 0,
        },
      },
      isLoadingVehicleDetail: false,
    };
    mocks.layout = {
      quickPanels: { alerts: false, fleetManagement: false },
      activeVehicleOverlayId: vehicle.id,
      pinnedVehicleIds: [pinnedVehicle.id],
      pinVehicleOverlay: vi.fn(),
      unpinVehicleOverlay: vi.fn(),
      toggleQuickPanel: vi.fn(),
      isTimelineVisible: true,
      timelineHeightPx: 0,
    };
    mocks.playback = {
      route: historicalRoute,
      selectedSegment: historicalRoute.tripSegments[0],
      graphSegmentId: null,
      playbackProgress: 50,
      isTimelineInspecting: true,
      timelineInspectionRevision: 1,
      openGraphOverlay: vi.fn(),
      closeGraphOverlay: vi.fn(),
    };
    mocks.selection = {
      selectedVehicleId: vehicle.id,
      selectedVehicle: vehicle,
      dismissSelectedVehicle: vi.fn(),
    };

    render(<LiveFleetOverlayLayer />);

    expect(mocks.vehicleOverlayProps.find((props) => props.vehicle.id === pinnedVehicle.id)?.vehicle).toMatchObject({
      speedKph: 7,
      lastUpdatedIso: "2026-05-06T08:44:00.000Z",
    });
  });
});
