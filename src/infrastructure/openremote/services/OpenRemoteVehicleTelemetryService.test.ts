import type { Asset } from "@openremote/model";
import { describe, expect, it, vi } from "vitest";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteRouteHistoryService } from "./OpenRemoteRouteHistoryService";
import { OpenRemoteVehicleTelemetryService } from "./OpenRemoteVehicleTelemetryService";

const asset = { id: "or-asset-atlas", name: "Atlas" } as Asset;

function createRuntimeMock(ready = true) {
  const get = vi.fn().mockResolvedValue({ data: asset });
  const runtime = {
    ensureReady: vi.fn().mockResolvedValue(ready),
    getApi: vi.fn(() => ({
      AssetResource: {
        get,
      },
    })),
  } as unknown as OpenRemoteRuntime;

  return { runtime, get };
}

describe("OpenRemoteVehicleTelemetryService", () => {
  it("loads telemetry assets without refreshing the session snapshot", async () => {
    const { runtime, get } = createRuntimeMock();
    const routeHistoryService = { getVehicleRouteHistoryForWindow: vi.fn() } as unknown as OpenRemoteRouteHistoryService;
    const service = new OpenRemoteVehicleTelemetryService(runtime, routeHistoryService);

    await expect(service.getVehicleTelemetryAsset("or-asset-atlas")).resolves.toBe(asset);

    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
    expect(get).toHaveBeenCalledWith("or-asset-atlas");
  });

  it("delegates telemetry history to the injected route history service", async () => {
    const { runtime } = createRuntimeMock();
    const history = { speed: [{ assetId: "or-asset-atlas", attributeName: "speed", value: 52 }] };
    const routeHistoryService = {
      getVehicleRouteHistoryForWindow: vi.fn().mockResolvedValue(history),
    } as unknown as OpenRemoteRouteHistoryService;
    const service = new OpenRemoteVehicleTelemetryService(runtime, routeHistoryService);
    const window = { fromTimestamp: Date.parse("2026-05-13T08:00:00.000Z"), toTimestamp: Date.parse("2026-05-13T09:00:00.000Z") };

    await expect(service.getVehicleTelemetryHistoryForWindow("or-asset-atlas", window, ["speed"])).resolves.toBe(history);

    expect(routeHistoryService.getVehicleRouteHistoryForWindow).toHaveBeenCalledWith("or-asset-atlas", window, ["speed"]);
  });

  it("returns null when the runtime is not ready", async () => {
    const { runtime, get } = createRuntimeMock(false);
    const routeHistoryService = { getVehicleRouteHistoryForWindow: vi.fn() } as unknown as OpenRemoteRouteHistoryService;
    const service = new OpenRemoteVehicleTelemetryService(runtime, routeHistoryService);

    await expect(service.getVehicleTelemetryAsset("or-asset-atlas")).resolves.toBeNull();

    expect(get).not.toHaveBeenCalled();
  });
});
