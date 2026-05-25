/* @vitest-environment jsdom */

import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssetsRepository } from "../../../domain/repositories/assetsRepository";
import type { AppDataMode, AppServices } from "../../../domain/services/appServices";
import { PassthroughFleetLiveStateService } from "../../../domain/services/liveFleetStateService";
import { AppServicesProvider } from "../../providers/AppServicesProvider";
import { TEST_ASSET_DEVICES } from "../../test-utils/assetBuilders";
import { useAssetsQuery } from "./useAssetsQuery";

const initialAssets = [TEST_ASSET_DEVICES[0]];
const refreshedAssets = [{ ...TEST_ASSET_DEVICES[0], assetName: "Atlas Refreshed" }];
const ASSETS_REFRESH_INTERVAL_MS = 5_000;

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function createServices(dataMode: AppDataMode, assetsRepository: AssetsRepository): AppServices {
  return {
    dataMode,
    assetsRepository,
    alertsRepository: {} as never,
    fleetRepository: {} as never,
    playbackRepository: {} as never,
    reportsRepository: {} as never,
    preferencesRepository: {} as never,
    liveFleetStateService: new PassthroughFleetLiveStateService(),
  };
}

function renderAssetsQuery(dataMode: AppDataMode, assetsRepository: AssetsRepository) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppServicesProvider services={createServices(dataMode, assetsRepository)}>
      {children}
    </AppServicesProvider>
  );

  return renderHook(() => useAssetsQuery(), { wrapper });
}

describe("useAssetsQuery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("polls real-mode assets and replaces stale data with the next Manager result", async () => {
    const assetsRepository = {
      listAssets: vi.fn().mockResolvedValueOnce(initialAssets).mockResolvedValueOnce(refreshedAssets),
    };

    const { result } = renderAssetsQuery("openRemote", assetsRepository);

    await flushPromises();
    expect(result.current.data).toEqual(initialAssets);

    await act(async () => {
      vi.advanceTimersByTime(ASSETS_REFRESH_INTERVAL_MS);
      await Promise.resolve();
    });

    await flushPromises();
    expect(result.current.data).toEqual(refreshedAssets);
    expect(assetsRepository.listAssets).toHaveBeenCalledTimes(2);
  });

  it("loads mock-mode assets once without polling", async () => {
    const assetsRepository = {
      listAssets: vi.fn().mockResolvedValue(initialAssets),
    };

    const { result } = renderAssetsQuery("mock", assetsRepository);

    await flushPromises();
    expect(result.current.data).toEqual(initialAssets);

    await act(async () => {
      vi.advanceTimersByTime(ASSETS_REFRESH_INTERVAL_MS * 3);
      await Promise.resolve();
    });

    expect(assetsRepository.listAssets).toHaveBeenCalledTimes(1);
  });

  it("keeps previous real-mode assets when a refresh fails", async () => {
    const assetsRepository = {
      listAssets: vi.fn().mockResolvedValueOnce(initialAssets).mockRejectedValueOnce(new Error("manager offline")),
    };

    const { result } = renderAssetsQuery("openRemote", assetsRepository);

    await flushPromises();
    expect(result.current.data).toEqual(initialAssets);

    await act(async () => {
      vi.advanceTimersByTime(ASSETS_REFRESH_INTERVAL_MS);
      await Promise.resolve();
    });

    await flushPromises();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toEqual(initialAssets);
  });
});
