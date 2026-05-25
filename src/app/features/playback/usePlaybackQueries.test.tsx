/* @vitest-environment jsdom */

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybackRoute } from "../../../domain/models/playback";
import { Vehicle } from "../../../domain/models/vehicle";
import { usePlaybackRouteQuery, usePlaybackVehiclesQuery } from "./usePlaybackQueries";

const vehicle: Vehicle = {
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
};

const route: PlaybackRoute = {
  vehicleId: "veh-atlas-12",
  points: [{ latitude: 51.4416, longitude: 5.4697, timestampIso: "2026-05-06T08:00:00.000Z", speedKph: 20 }],
  tripSegments: [],
};

describe("usePlaybackQueries", () => {
  afterEach(() => {
    cleanup();
  });

  it("loads playback vehicles through the repository query helper", async () => {
    const repository = {
      listPlaybackVehicles: vi.fn().mockResolvedValue([vehicle]),
      getPlaybackRoute: vi.fn(),
      getPlaybackTelemetryTimeline: vi.fn(),
    };

    const { result } = renderHook(() => usePlaybackVehiclesQuery(repository));

    await waitFor(() => {
      expect(result.current.data).toEqual([vehicle]);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps playback route disabled until a vehicle is selected", async () => {
    const repository = {
      listPlaybackVehicles: vi.fn(),
      getPlaybackRoute: vi.fn().mockResolvedValue(route),
      getPlaybackTelemetryTimeline: vi.fn(),
    };

    const { result, rerender } = renderHook(
      ({ vehicleId }: { vehicleId: string | null }) =>
        usePlaybackRouteQuery(repository, vehicleId, { preset: "today" }),
      { initialProps: { vehicleId: null as string | null } },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(repository.getPlaybackRoute).not.toHaveBeenCalled();

    rerender({ vehicleId: "veh-atlas-12" });

    await waitFor(() => {
      expect(result.current.data).toEqual(route);
    });
    expect(repository.getPlaybackRoute).toHaveBeenCalledWith("veh-atlas-12", { preset: "today" });
  });
});
