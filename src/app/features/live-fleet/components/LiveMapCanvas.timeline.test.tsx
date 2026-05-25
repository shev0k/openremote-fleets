/* @vitest-environment jsdom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybackRoute } from "../../../../domain/models/playback";
import type { Vehicle } from "../../../../domain/models/vehicle";
import { LiveMapCanvas } from "./LiveMapCanvas";

const mocks = vi.hoisted(() => ({
  alerts: [],
  customMap: vi.fn((_props: unknown) => null),
  data: {},
  layout: {},
  mapPreferences: {},
  playback: {},
  selection: {},
}));

vi.mock("../../../components/map/CustomMap", async () => {
  const React = await import("react");

  return {
    CustomMap: React.forwardRef((_props: unknown, _ref) => {
      mocks.customMap(_props);
      return null;
    }),
  };
});

vi.mock("./MapControlBar", () => ({
  MapControlBar: () => null,
}));

vi.mock("../../../contexts/AlertsContext", () => ({
  useAlerts: () => ({ alerts: mocks.alerts }),
}));

vi.mock("../../../providers/AppServicesProvider", () => ({
  useAppServices: () => ({ dataMode: "mock" }),
}));

vi.mock("../../../providers/AppPreferencesProvider", () => ({
  useAppPreferences: () => ({
    preferences: { behavior: { timeFormat: "24h" } },
    formatTime: () => "10:00",
  }),
}));

vi.mock("../providers/LiveFleetDataContext", () => ({
  useLiveFleetVehicleData: () => mocks.data,
}));

vi.mock("../providers/LiveFleetLayoutContext", () => ({
  useLiveFleetLayoutState: () => mocks.layout,
}));

vi.mock("../providers/LiveFleetPlaybackContext", () => ({
  useLiveFleetPlaybackState: () => mocks.playback,
}));

vi.mock("../providers/LiveFleetPreferencesContext", () => ({
  useLiveFleetMapPreferences: () => mocks.mapPreferences,
}));

vi.mock("../providers/LiveFleetSelectionContext", () => ({
  useLiveFleetVehicleSelection: () => mocks.selection,
}));

function createVehicle(): Vehicle {
  return {
    id: "veh-atlas-12",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 42,
    ignitionOn: true,
    latitude: 51.44,
    longitude: 5.46,
    heading: 90,
    lastUpdatedIso: "2026-03-29T08:00:00.000Z",
    driverName: "Mila Janssen",
    trackerId: "veh-atlas-12",
    assetName: "Atlas 12",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
  };
}

function createRoute(): PlaybackRoute {
  return {
    vehicleId: "veh-atlas-12",
    points: [
      { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00.000Z", speedKph: 24 },
      { latitude: 51.45, longitude: 5.48, timestampIso: "2026-03-29T08:05:00.000Z", speedKph: 36 },
      { latitude: 51.46, longitude: 5.5, timestampIso: "2026-03-29T08:10:00.000Z", speedKph: 44 },
    ],
    tripSegments: [
      {
        id: "segment-1",
        startLabel: "08:00",
        endLabel: "08:05",
        startTimeIso: "2026-03-29T08:00:00.000Z",
        endTimeIso: "2026-03-29T08:05:00.000Z",
        durationLabel: "5 min",
        durationMinutes: 5,
        distanceLabel: "1.6 km",
        distanceKm: 1.6,
        stopCount: 0,
        maxSpeedLabel: "60 km/h",
        maxSpeedKph: 60,
        averageSpeedLabel: "32 km/h",
        averageSpeedKph: 32,
        startProgressPercent: 0,
        endProgressPercent: 50,
      },
      {
        id: "segment-2",
        startLabel: "08:05",
        endLabel: "08:10",
        startTimeIso: "2026-03-29T08:05:00.000Z",
        endTimeIso: "2026-03-29T08:10:00.000Z",
        durationLabel: "5 min",
        durationMinutes: 5,
        distanceLabel: "1.6 km",
        distanceKm: 1.6,
        stopCount: 0,
        maxSpeedLabel: "70 km/h",
        maxSpeedKph: 70,
        averageSpeedLabel: "40 km/h",
        averageSpeedKph: 40,
        startProgressPercent: 50,
        endProgressPercent: 100,
      },
    ],
  };
}

describe("LiveMapCanvas timeline segment sync", () => {
  beforeEach(() => {
    const selectedVehicle = createVehicle();

    mocks.customMap.mockClear();
    mocks.data = {
      vehicles: [selectedVehicle],
      isLoadingVehicles: false,
      vehicleDetailsById: {},
      vehicleDetail: null,
      isLoadingVehicleDetail: false,
    };
    mocks.layout = {
      activeVehicleOverlayId: null,
      pinnedVehicleIds: [],
      isTimelineVisible: true,
      setTimelineVisible: vi.fn(),
    };
    mocks.mapPreferences = {
      mapType: "default",
      isWorkspaceOpen: true,
      setMapType: vi.fn(),
      setWorkspaceOpen: vi.fn(),
    };
    mocks.playback = {
      route: createRoute(),
      selectedSegmentId: "segment-1",
      playbackProgress: 25,
      playbackSpeed: 1,
      isTimelineInspecting: true,
      isLoadingRoute: false,
      isSimulationEnabled: true,
      simulationSpeed: 2,
      selectSegment: vi.fn(),
      setSimulationSpeed: vi.fn(),
    };
    mocks.selection = {
      selectedVehicleId: selectedVehicle.id,
      selectedVehicle,
      selectVehicle: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the timeline-selected trip as the active map segment while preserving the live route tail", () => {
    render(<LiveMapCanvas />);

    const mapProps = mocks.customMap.mock.calls.at(-1)?.[0] as {
      activeSegmentId?: string | null;
      activeSegmentLine?: [number, number][];
      route?: PlaybackRoute | null;
    };

    expect(mapProps.activeSegmentId).toBe("segment-1");
    expect(mapProps.activeSegmentLine).toEqual([
      [51.44, 5.46],
      [51.45, 5.48],
    ]);
    expect(mapProps.route?.points.at(-1)).toMatchObject({
      latitude: 51.46,
      longitude: 5.5,
    });
  });
});
