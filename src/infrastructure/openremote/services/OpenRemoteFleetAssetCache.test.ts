import type { Asset } from "@openremote/model";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenRemoteFleetAssetCache } from "./OpenRemoteFleetAssetCache";

const firstAssets = [{ id: "asset-1", name: "Atlas" }] as Asset[];
const secondAssets = [{ id: "asset-2", name: "Beacon" }] as Asset[];

describe("OpenRemoteFleetAssetCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cached assets within the TTL", async () => {
    const cache = new OpenRemoteFleetAssetCache(3000);
    const load = vi.fn()
      .mockResolvedValueOnce(firstAssets)
      .mockResolvedValueOnce(secondAssets);

    await expect(cache.read(load)).resolves.toBe(firstAssets);
    await expect(cache.read(load)).resolves.toBe(firstAssets);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent loads into one request", async () => {
    const cache = new OpenRemoteFleetAssetCache(3000);
    const load = vi.fn().mockResolvedValue(firstAssets);

    const [firstResult, secondResult] = await Promise.all([
      cache.read(load),
      cache.read(load),
    ]);

    expect(firstResult).toBe(firstAssets);
    expect(secondResult).toBe(firstAssets);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads assets after the TTL expires", async () => {
    const cache = new OpenRemoteFleetAssetCache(3000);
    const load = vi.fn()
      .mockResolvedValueOnce(firstAssets)
      .mockResolvedValueOnce(secondAssets);

    await expect(cache.read(load)).resolves.toBe(firstAssets);

    vi.advanceTimersByTime(3001);

    await expect(cache.read(load)).resolves.toBe(secondAssets);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
