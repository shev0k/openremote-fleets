/* @vitest-environment jsdom */

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaybackRoute } from "../../../domain/models/playback";
import type { AppServices } from "../../../domain/services/appServices";
import type { Vehicle } from "../../../domain/models/vehicle";
import { AppServicesProvider } from "../../providers/AppServicesProvider";
import { useRoutePlaybackWorkspace } from "./useRoutePlaybackWorkspace";

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
    trackerId: "352093086403655",
    assetName: "Atlas Prime",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
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
    trackerId: "352093086403699",
    assetName: "Nimbus Service",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 1,
  },
];

const route: PlaybackRoute = {
  vehicleId: "veh-atlas-12",
  points: [
    { latitude: 51.4416, longitude: 5.4697, timestampIso: "2026-05-06T08:00:00.000Z", speedKph: 20 },
    { latitude: 51.4426, longitude: 5.4797, timestampIso: "2026-05-06T08:10:00.000Z", speedKph: 28 },
  ],
  tripSegments: [],
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

interface Snapshot {
  selectedVehicleId: string | null;
  selectedVehicleName: string | null;
  vehicleCount: number;
}

function RoutePlaybackWorkspaceHarness({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  const workspace = useRoutePlaybackWorkspace();
  onRender({
    selectedVehicleId: workspace.selectedVehicleId,
    selectedVehicleName: workspace.selectedVehicle?.name ?? null,
    vehicleCount: workspace.vehicles.length,
  });

  return <div>{workspace.selectedVehicle?.name ?? "No selected vehicle"}</div>;
}

describe("useRoutePlaybackWorkspace", () => {
  afterEach(() => {
    cleanup();
  });

  it("selects the first loaded vehicle in the same render that exposes loaded vehicles", async () => {
    const vehicleRequest = createDeferred<Vehicle[]>();
    const snapshots: Snapshot[] = [];
    const services = {
      dataMode: "mock",
      playbackRepository: {
        listPlaybackVehicles: vi.fn(() => vehicleRequest.promise),
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
      preferencesRepository: {},
    } as unknown as AppServices;

    render(
      <AppServicesProvider services={services}>
        <RoutePlaybackWorkspaceHarness onRender={(snapshot) => snapshots.push(snapshot)} />
      </AppServicesProvider>,
    );

    vehicleRequest.resolve(vehicles);

    await waitFor(() => {
      expect(snapshots.some((snapshot) => snapshot.vehicleCount === 2)).toBe(true);
    });

    const loadedVehicleSnapshots = snapshots.filter((snapshot) => snapshot.vehicleCount > 0);

    expect(loadedVehicleSnapshots).not.toHaveLength(0);
    expect(
      loadedVehicleSnapshots.every(
        (snapshot) => snapshot.selectedVehicleId === "veh-atlas-12" && snapshot.selectedVehicleName === "Atlas 12",
      ),
    ).toBe(true);
  });
});
