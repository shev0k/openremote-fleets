import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenRemoteRouteHistoryService } from "./OpenRemoteRouteHistoryService";
import {
  clearOpenRemoteAdapterIssues,
  getOpenRemoteAdapterIssues,
} from "../repositories/openRemoteAdapterStatus";

function createRuntime(getDatapoints: ReturnType<typeof vi.fn>, ready = true) {
  return {
    ensureReady: vi.fn().mockResolvedValue(ready),
    getApi: () => ({
      AssetDatapointResource: {
        getDatapoints,
      },
    }),
  };
}

function datapoint(timestamp: string, value: unknown) {
  return {
    timestamp: Date.parse(timestamp),
    value,
  };
}

const routeWindow = {
  fromTimestamp: Date.parse("2026-03-29T00:00:00.000Z"),
  toTimestamp: Date.parse("2026-03-29T23:59:59.999Z"),
};

describe("OpenRemoteRouteHistoryService", () => {
  beforeEach(() => {
    clearOpenRemoteAdapterIssues();
  });

  it("keeps usable route history when a non-location attribute history call fails", async () => {
    const getDatapoints = vi.fn()
      .mockResolvedValueOnce({
        data: [datapoint("2026-03-29T08:00:00.000Z", { latitude: 51.45, longitude: 5.49 })],
      })
      .mockRejectedValueOnce(new Error("speed history failed"))
      .mockResolvedValueOnce({
        data: [datapoint("2026-03-29T08:00:00.000Z", true)],
      });
    const runtime = createRuntime(getDatapoints);
    const service = new OpenRemoteRouteHistoryService(runtime as never);

    const history = await service.getVehicleRouteHistoryForWindow("or-asset-atlas", routeWindow, ["gpsLocation", "speed", "ignition"]);

    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
    expect(history?.gpsLocation).toEqual([
      expect.objectContaining({
        assetId: "or-asset-atlas",
        attributeName: "gpsLocation",
        value: { latitude: 51.45, longitude: 5.49 },
      }),
    ]);
    expect(history?.speed).toBeUndefined();
    expect(history?.ignition).toEqual([
      expect.objectContaining({
        assetId: "or-asset-atlas",
        attributeName: "ignition",
        value: true,
      }),
    ]);
    expect(getOpenRemoteAdapterIssues()).toMatchObject([
      {
        source: "OpenRemoteRouteHistoryService",
        operation: "getVehicleRouteHistory(speed)",
        reason: "operation-failed",
        errorMessage: "speed history failed",
      },
    ]);
  });

  it("supports raw datapoint history requests with an explicit timestamp window", async () => {
    const getDatapoints = vi.fn().mockResolvedValue({
      data: [datapoint("2026-03-29T08:00:00.000Z", 42)],
    });
    const runtime = createRuntime(getDatapoints);
    const service = new OpenRemoteRouteHistoryService(runtime as never);

    const history = await service.getVehicleRouteHistoryForWindow(
      "or-asset-atlas",
      {
        fromTimestamp: Date.parse("2026-03-29T08:00:00.000Z"),
        toTimestamp: Date.parse("2026-03-29T09:00:00.000Z"),
      },
      ["speed"],
    );

    expect(getDatapoints).toHaveBeenCalledWith("or-asset-atlas", "speed", {
      type: "all",
      fromTimestamp: Date.parse("2026-03-29T08:00:00.000Z"),
      toTimestamp: Date.parse("2026-03-29T09:00:00.000Z"),
    });
    expect(history?.speed).toEqual([
      expect.objectContaining({
        assetId: "or-asset-atlas",
        attributeName: "speed",
        value: 42,
      }),
    ]);
  });

  it("requests both Teltonika gpsLocation and Manager location histories by default", async () => {
    const getDatapoints = vi.fn().mockResolvedValue({ data: [] });
    const runtime = createRuntime(getDatapoints);
    const service = new OpenRemoteRouteHistoryService(runtime as never);

    await service.getVehicleRouteHistoryForWindow("or-asset-atlas", routeWindow);

    expect(getDatapoints.mock.calls.map((call) => call[1])).toEqual(
      expect.arrayContaining([
        "gpsLocation",
        "location",
        "speed",
        "direction",
        "ignition",
        "movement",
        "fuelLevel",
        "batteryLevel",
        "engineRpm",
        "gnssHdop",
      ]),
    );
  });

  it("does not request gpsLocation history when Manager location history is available", async () => {
    const getDatapoints = vi.fn().mockImplementation((_assetId: string, attributeName: string) => {
      if (attributeName === "location") {
        return Promise.resolve({
          data: [datapoint("2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] })],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const runtime = createRuntime(getDatapoints);
    const service = new OpenRemoteRouteHistoryService(runtime as never);

    const history = await service.getVehicleRouteHistoryForWindow("or-asset-atlas", routeWindow, ["gpsLocation", "location", "speed"]);

    expect(history?.location).toHaveLength(1);
    expect(getDatapoints.mock.calls.map((call) => call[1])).toEqual(["location", "speed"]);
  });

  it("returns null when every attribute history call fails", async () => {
    const getDatapoints = vi.fn()
      .mockRejectedValueOnce(new Error("gps failed"))
      .mockRejectedValueOnce(new Error("speed failed"));
    const runtime = createRuntime(getDatapoints);
    const service = new OpenRemoteRouteHistoryService(runtime as never);

    await expect(service.getVehicleRouteHistoryForWindow("or-asset-atlas", routeWindow, ["gpsLocation", "speed"])).resolves.toBeNull();
  });

  it("returns null when the runtime is not ready", async () => {
    const getDatapoints = vi.fn();
    const runtime = createRuntime(getDatapoints, false);
    const service = new OpenRemoteRouteHistoryService(runtime as never);

    await expect(service.getVehicleRouteHistoryForWindow("or-asset-atlas", routeWindow)).resolves.toBeNull();

    expect(getDatapoints).not.toHaveBeenCalled();
  });
});
