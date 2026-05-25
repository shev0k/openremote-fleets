/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FleetAlert } from "../../domain/models/alerts";
import { PlaybackRoute } from "../../domain/models/playback";
import { AppServices } from "../../domain/services/appServices";
import { Vehicle } from "../../domain/models/vehicle";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { RoutePlayback } from "./RoutePlayback";

const mocks = vi.hoisted(() => ({
  customMap: vi.fn((_props: unknown) => <div data-testid="route-playback-map" />),
  playbackTimelineDock: vi.fn((props: { onProgressChange: (progress: number) => void }) => (
    <button type="button" onClick={() => props.onProgressChange(60)}>
      scrub playback to alarm
    </button>
  )),
}));

const vehicles: Vehicle[] = [
  {
    id: "veh-atlas-12",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 28,
    ignitionOn: true,
    latitude: 51.4416,
    longitude: 5.4697,
    heading: 92,
    lastUpdatedIso: "2026-05-06T08:45:00Z",
    driverName: "Mila Janssen",
    driverIdentifier: "0007104552",
    trackerId: "352093086403655",
    assetName: "Atlas Prime",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    fuelLevelPercent: 68,
  },
  {
    id: "veh-nimbus-03",
    name: "Nimbus 03",
    plate: "PX-557-D",
    status: "idling",
    speedKph: 0,
    ignitionOn: false,
    latitude: 51.4492,
    longitude: 5.4814,
    heading: 14,
    lastUpdatedIso: "2026-05-06T08:42:00Z",
    driverName: "Lotte Bakker",
    driverIdentifier: "0007104553",
    trackerId: "352093086403699",
    assetName: "Nimbus Service",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 1,
    fuelLevelPercent: 21,
  },
];

const route: PlaybackRoute = {
  vehicleId: "veh-atlas-12",
  points: [
    { latitude: 51.4416, longitude: 5.4697, timestampIso: "2026-05-06T08:00:00.000Z", speedKph: 20 },
    { latitude: 51.4426, longitude: 5.4797, timestampIso: "2026-05-06T08:10:00.000Z", speedKph: 28 },
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
      distanceLabel: "4.2 km",
      distanceKm: 4.2,
      stopCount: 0,
      maxSpeedLabel: "48 km/h",
      maxSpeedKph: 48,
      averageSpeedLabel: "31 km/h",
      averageSpeedKph: 31,
      startProgressPercent: 0,
      endProgressPercent: 100,
    },
  ],
};

const routeAlarm: FleetAlert = {
  id: "alert-route-playback",
  severity: "high",
  vehicleId: "veh-atlas-12",
  vehicleName: "Atlas 12",
  type: "Overspeed",
  rule: "Speed > 80 km/h",
  timeIso: "2026-05-06T08:05:00.000Z",
  state: "Active",
  sourceAttribute: "speed",
  sourceValue: 88,
};

vi.mock("../components/map/CustomMap", () => ({
  CustomMap: (props: unknown) => mocks.customMap(props),
}));

vi.mock("../components/playback/PlaybackTimelineDock", () => ({
  PlaybackTimelineDock: (props: { onProgressChange: (progress: number) => void }) => mocks.playbackTimelineDock(props),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function renderRoutePlayback(servicesOverride?: Partial<AppServices>) {
  const services = {
    dataMode: "mock",
    playbackRepository: {
      listPlaybackVehicles: vi.fn().mockResolvedValue(vehicles),
      getPlaybackRoute: vi.fn().mockResolvedValue(route),
      getPlaybackTelemetryTimeline: vi.fn().mockResolvedValue(null),
    },
    alertsRepository: {
      listAlerts: vi.fn().mockResolvedValue([]),
      updateAlertState: vi.fn().mockResolvedValue(undefined),
    },
    fleetRepository: {},
    assetsRepository: {},
    reportsRepository: {},
    ...servicesOverride,
  } as unknown as AppServices;

  render(
    <AppServicesProvider services={services}>
      <RoutePlayback />
    </AppServicesProvider>,
  );
}

describe("RoutePlayback", () => {
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
    mocks.customMap.mockClear();
    mocks.playbackTimelineDock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("removes the map Live Telemetry card and shows a compact vehicle selector", async () => {
    renderRoutePlayback();

    await waitFor(() => {
      expect(screen.getByText("Vehicle selector")).toBeInTheDocument();
    });

    expect(screen.queryByText("Live Telemetry")).not.toBeInTheDocument();
    expect(screen.queryByText("Vehicle history")).not.toBeInTheDocument();
    expect(screen.queryByText("Playback vehicle")).not.toBeInTheDocument();
    expect(screen.getByTestId("route-playback-vehicle-selector")).toHaveClass("p-3");
    expect(screen.getByRole("button", { name: /select playback vehicle/i })).toBeInTheDocument();
    expect(screen.getByText("Atlas 12")).toBeInTheDocument();
    expect(screen.getByText("BR-482-K")).toBeInTheDocument();
    expect(screen.getByText("Mila Janssen")).toBeInTheDocument();
    expect(screen.getByText("Driver ID")).toBeInTheDocument();
    expect(screen.getByText("0007104552")).toBeInTheDocument();
    expect(screen.getByText("IMEI")).toBeInTheDocument();
    expect(screen.queryByText("Loaded")).not.toBeInTheDocument();
    expect(screen.queryByText("Tracker")).not.toBeInTheDocument();
    expect(screen.getByTestId("route-playback-selector-plate-icon")).toBeInTheDocument();
    expect(screen.getByTestId("route-playback-selector-driver-icon")).toBeInTheDocument();
    expect(screen.getByTestId("route-playback-selector-ibutton-icon")).toBeInTheDocument();
    expect(screen.getByTestId("route-playback-selector-imei-icon")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("1 trip loaded")).toBeInTheDocument();
    });
  });

  it("uses the selected vehicle coordinate while the newly selected route is still loading", async () => {
    const nimbusRoute = createDeferred<PlaybackRoute | null>();
    const services = {
      dataMode: "mock",
      playbackRepository: {
        listPlaybackVehicles: vi.fn().mockResolvedValue(vehicles),
        getPlaybackRoute: vi
          .fn()
          .mockResolvedValueOnce(route)
          .mockReturnValueOnce(nimbusRoute.promise),
        getPlaybackTelemetryTimeline: vi.fn().mockResolvedValue(null),
      },
      alertsRepository: {
        listAlerts: vi.fn().mockResolvedValue([]),
        updateAlertState: vi.fn().mockResolvedValue(undefined),
      },
      fleetRepository: {},
      assetsRepository: {},
      reportsRepository: {},
    } as unknown as AppServices;

    renderRoutePlayback(services);

    await waitFor(() => {
      expect(screen.getByText("Vehicle selector")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select playback vehicle/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Nimbus 03" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Nimbus 03" }));

    await waitFor(() => {
      const latestProps = mocks.customMap.mock.calls.at(-1)?.[0] as { vehicles?: Vehicle[] } | undefined;
      expect(latestProps?.vehicles?.[0]).toMatchObject({
        id: "veh-nimbus-03",
        latitude: vehicles[1].latitude,
        longitude: vehicles[1].longitude,
      });
    });

    nimbusRoute.resolve({
      ...route,
      vehicleId: "veh-nimbus-03",
      points: [
        { latitude: 51.4492, longitude: 5.4814, timestampIso: "2026-05-06T08:00:00.000Z", speedKph: 0 },
        { latitude: 51.451, longitude: 5.483, timestampIso: "2026-05-06T08:10:00.000Z", speedKph: 18 },
      ],
    });
  });

  it("drops alarm markers and derives the vehicle marker state from playback progress", async () => {
    const alertingVehicle: Vehicle = {
      ...vehicles[0],
      status: "alerting",
      activeAlertCount: 1,
      teltonika: {
        imei: vehicles[0].trackerId,
        model: "Teltonika FMC003",
        protocol: "tcp",
        codec: "CODEC_8",
        timestampIso: "2026-05-06T08:00:00.000Z",
        attributes: {
          gpsLocation: {
            avlId: "0",
            attributeName: "gpsLocation",
            displayName: "GPS location",
            value: { latitude: vehicles[0].latitude, longitude: vehicles[0].longitude },
            parameterGroup: "Location",
            timestampIso: "2026-05-06T08:00:00.000Z",
          },
          speed: {
            avlId: "24",
            attributeName: "speed",
            displayName: "Speed",
            value: 20,
            unit: "km/h",
            parameterGroup: "GPS",
            timestampIso: "2026-05-06T08:00:00.000Z",
          },
        },
      },
    };

    renderRoutePlayback({
      playbackRepository: {
        listPlaybackVehicles: vi.fn().mockResolvedValue([alertingVehicle]),
        getPlaybackRoute: vi.fn().mockResolvedValue(route),
        getPlaybackTelemetryTimeline: vi.fn().mockResolvedValue(null),
      },
      alertsRepository: {
        listAlerts: vi.fn().mockResolvedValue([routeAlarm]),
        updateAlertState: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as Partial<AppServices>);

    await waitFor(() => {
      const latestProps = mocks.customMap.mock.calls.at(-1)?.[0] as { route?: PlaybackRoute | null; vehicles?: Vehicle[] } | undefined;
      expect(latestProps?.route?.tripSegments[0].eventMarkers).toContainEqual(
        expect.objectContaining({
          id: "alert-route-playback",
          eventType: "alarm",
          label: "Overspeed",
          severity: "critical",
        }),
      );
      expect(latestProps?.vehicles?.[0]).toMatchObject({
        id: "veh-atlas-12",
        status: "moving",
        activeAlertCount: 0,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /scrub playback to alarm/i }));

    await waitFor(() => {
      const latestProps = mocks.customMap.mock.calls.at(-1)?.[0] as { vehicles?: Vehicle[] } | undefined;
      expect(latestProps?.vehicles?.[0]).toMatchObject({
        id: "veh-atlas-12",
        status: "alerting",
        activeAlertCount: 1,
        lastUpdatedIso: "2026-05-06T08:06:00.000Z",
        teltonika: {
          timestampIso: "2026-05-06T08:06:00.000Z",
          attributes: {
            gpsLocation: expect.objectContaining({ timestampIso: "2026-05-06T08:06:00.000Z" }),
            speed: expect.objectContaining({ timestampIso: "2026-05-06T08:06:00.000Z" }),
          },
        },
      });
    });
  });
});
