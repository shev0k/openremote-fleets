import type { Asset } from "@openremote/model";
import { describe, expect, it, vi } from "vitest";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteFleetAssetCache } from "./OpenRemoteFleetAssetCache";
import { OpenRemoteFleetAssetService } from "./OpenRemoteFleetAssetService";

const asset = { id: "or-asset-atlas", name: "Atlas" } as Asset;
const refreshedAsset = { id: "or-asset-beacon", name: "Beacon" } as Asset;

function createRuntimeMock(ready = true) {
  const queryAssets = vi.fn().mockResolvedValue({ data: [asset] });
  const get = vi.fn().mockResolvedValue({ data: asset });
  const runtime = {
    ensureReady: vi.fn().mockResolvedValue(ready),
    getApi: vi.fn(() => ({
      AssetResource: {
        queryAssets,
        get,
      },
    })),
  } as unknown as OpenRemoteRuntime;

  return { runtime, queryAssets, get };
}

describe("OpenRemoteFleetAssetService", () => {
  it("lists Teltonika tracker assets without refreshing the session snapshot", async () => {
    const { runtime, queryAssets } = createRuntimeMock();
    const service = new OpenRemoteFleetAssetService(runtime);

    await expect(service.listFleetAssets()).resolves.toEqual([asset]);

    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
    expect(queryAssets).toHaveBeenCalledWith({
      recursive: true,
      types: ["TeltonikaTrackerAsset"],
    });
  });

  it("caches fleet asset list reads within the configured TTL", async () => {
    const { runtime, queryAssets } = createRuntimeMock();
    queryAssets
      .mockResolvedValueOnce({ data: [asset] })
      .mockResolvedValueOnce({ data: [refreshedAsset] });
    const service = new OpenRemoteFleetAssetService(runtime, new OpenRemoteFleetAssetCache(3000));

    await expect(service.listFleetAssets()).resolves.toEqual([asset]);
    await expect(service.listFleetAssets()).resolves.toEqual([asset]);

    expect(queryAssets).toHaveBeenCalledTimes(1);
  });

  it("loads one fleet asset without refreshing the session snapshot", async () => {
    const { runtime, get } = createRuntimeMock();
    const service = new OpenRemoteFleetAssetService(runtime);

    await expect(service.getFleetAsset("or-asset-atlas")).resolves.toBe(asset);

    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
    expect(get).toHaveBeenCalledWith("or-asset-atlas");
  });

  it("returns safe fallbacks when the runtime is not ready", async () => {
    const { runtime, queryAssets, get } = createRuntimeMock(false);
    const service = new OpenRemoteFleetAssetService(runtime);

    await expect(service.listFleetAssets()).resolves.toEqual([]);
    await expect(service.getFleetAsset("or-asset-atlas")).resolves.toBeNull();

    expect(queryAssets).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });
});
