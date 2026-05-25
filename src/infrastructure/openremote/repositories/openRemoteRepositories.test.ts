import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenRemoteAlertsRepository } from "./OpenRemoteAlertsRepository";
import { OpenRemoteAssetsRepository } from "./OpenRemoteAssetsRepository";
import { OpenRemoteFleetRepository } from "./OpenRemoteFleetRepository";
import { OpenRemotePlaybackRepository } from "./OpenRemotePlaybackRepository";
import { OpenRemoteReportsRepository } from "./OpenRemoteReportsRepository";
import {
  clearOpenRemoteAdapterIssues,
  getOpenRemoteAdapterIssues,
} from "./openRemoteAdapterStatus";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";

function createRuntimeMock(ready = true) {
  return {
    ensureReady: vi.fn().mockResolvedValue(ready),
  } as unknown as OpenRemoteRuntime;
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).valueOf();
}

describe("OpenRemote scaffold repositories", () => {
  beforeEach(() => {
    clearOpenRemoteAdapterIssues();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns safe fallback values for scaffolded reads", async () => {
    const runtime = createRuntimeMock();
    const fleetRepository = new OpenRemoteFleetRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
      { getVehicleTelemetryAsset: vi.fn().mockResolvedValue(null) } as never,
    );
    const playbackRepository = new OpenRemotePlaybackRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
      { getVehicleRouteHistoryForWindow: vi.fn().mockResolvedValue(null) } as never,
    );
    const assetsRepository = new OpenRemoteAssetsRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
    );
    const alertsRepository = new OpenRemoteAlertsRepository(
      runtime,
      { listAlarms: vi.fn().mockResolvedValue([]) } as never,
    );
    const reportsRepository = new OpenRemoteReportsRepository(
      runtime,
      { getFleetReportInputs: vi.fn().mockResolvedValue(null) } as never,
    );

    await expect(fleetRepository.listVehicles()).resolves.toEqual([]);
    await expect(fleetRepository.getVehicleDetail("vehicle-1")).resolves.toBeNull();
    await expect(playbackRepository.listPlaybackVehicles()).resolves.toEqual([]);
    await expect(playbackRepository.getPlaybackRoute("vehicle-1", { preset: "today" })).resolves.toBeNull();
    await expect(assetsRepository.listAssets()).resolves.toEqual([]);
    await expect(alertsRepository.listAlerts()).resolves.toEqual([]);
    await expect(reportsRepository.getFleetReports("Last 7 Days")).resolves.toMatchObject({
      dailyTrips: [],
      dailySpeed: [],
      speedDistribution: [],
      mostActiveVehicles: [],
    });
  });

  it("keeps scaffolded alert operational writes non-throwing", async () => {
    const runtime = createRuntimeMock();
    const alertsRepository = new OpenRemoteAlertsRepository(
      runtime,
      { updateAlarmStatus: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(alertsRepository.updateAlertState("alert-1", "Resolved")).resolves.toBeUndefined();
  });

  it.each([
    ["Active", "OPEN"],
    ["Acknowledged", "ACKNOWLEDGED"],
    ["Resolved", "RESOLVED"],
  ] as const)("maps %s app alert state to raw OpenRemote %s status in the repository", async (appState, openRemoteStatus) => {
    const runtime = createRuntimeMock();
    const updateAlarmStatus = vi.fn().mockResolvedValue(undefined);
    const alertsRepository = new OpenRemoteAlertsRepository(
      runtime,
      { updateAlarmStatus } as never,
    );

    await alertsRepository.updateAlertState("44", appState);

    expect(updateAlarmStatus).toHaveBeenCalledWith("44", openRemoteStatus);
  });

  it("checks scaffolded repository reads without refreshing the session snapshot", async () => {
    const runtime = createRuntimeMock();
    const assetsRepository = new OpenRemoteAssetsRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
    );

    await assetsRepository.listAssets();

    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
  });

  it("checks scaffolded repository writes without refreshing the session snapshot", async () => {
    const runtime = createRuntimeMock();
    const alertsRepository = new OpenRemoteAlertsRepository(
      runtime,
      { updateAlarmStatus: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await alertsRepository.updateAlertState("alert-1", "Resolved");

    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
  });

  it("translates playback presets to timestamp windows before calling the route history service", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-05-13T10:30:00.000Z");
    vi.setSystemTime(now);
    const runtime = createRuntimeMock();
    const getVehicleRouteHistoryForWindow = vi.fn().mockResolvedValue(null);
    const playbackRepository = new OpenRemotePlaybackRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
      { getVehicleRouteHistoryForWindow } as never,
    );

    await expect(playbackRepository.getPlaybackRoute("vehicle-1", { preset: "today" })).resolves.toBeNull();

    expect(getVehicleRouteHistoryForWindow).toHaveBeenCalledWith(
      "vehicle-1",
      {
        fromTimestamp: startOfLocalDay(now),
        toTimestamp: now.valueOf(),
      },
      expect.any(Array),
    );
  });

  it("translates fleet telemetry queries to timestamp windows before calling the telemetry service", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-05-13T10:30:00.000Z");
    vi.setSystemTime(now);
    const todayStart = startOfLocalDay(now);
    const yesterdayStartDate = new Date(todayStart);
    yesterdayStartDate.setDate(yesterdayStartDate.getDate() - 1);
    const runtime = createRuntimeMock();
    const getVehicleTelemetryHistoryForWindow = vi.fn().mockResolvedValue(null);
    const fleetRepository = new OpenRemoteFleetRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
      {
        getVehicleTelemetryAsset: vi.fn().mockResolvedValue(null),
        getVehicleTelemetryHistoryForWindow,
      } as never,
    );

    await expect(fleetRepository.getVehicleTelemetryTimeline("vehicle-1", { preset: "yesterday" })).resolves.toBeNull();

    expect(getVehicleTelemetryHistoryForWindow).toHaveBeenCalledWith(
      "vehicle-1",
      {
        fromTimestamp: yesterdayStartDate.valueOf(),
        toTimestamp: todayStart - 1,
      },
      expect.any(Array),
    );
  });

  it("records a structured issue when the runtime is not ready", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runtime = createRuntimeMock(false);
    const fleetRepository = new OpenRemoteFleetRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
      { getVehicleTelemetryAsset: vi.fn().mockResolvedValue(null) } as never,
    );

    await expect(fleetRepository.listVehicles()).resolves.toEqual([]);

    expect(getOpenRemoteAdapterIssues()).toMatchObject([
      {
        source: "OpenRemoteFleetRepository",
        operation: "listVehicles",
        reason: "runtime-not-ready",
        errorMessage: null,
      },
    ]);
  });

  it("suppresses console fallback warnings outside development while keeping structured adapter issues", async () => {
    vi.stubEnv("DEV", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runtime = createRuntimeMock(false);
    const fleetRepository = new OpenRemoteFleetRepository(
      runtime,
      { listFleetAssets: vi.fn().mockResolvedValue([]) } as never,
      { getVehicleTelemetryAsset: vi.fn().mockResolvedValue(null) } as never,
    );

    await expect(fleetRepository.listVehicles()).resolves.toEqual([]);

    expect(warn).not.toHaveBeenCalled();
    expect(getOpenRemoteAdapterIssues()).toHaveLength(1);
  });

  it("records structured operation failures while returning safe fallbacks", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runtime = createRuntimeMock();
    const fleetRepository = new OpenRemoteFleetRepository(
      runtime,
      { listFleetAssets: vi.fn().mockRejectedValue(new Error("manager unavailable")) } as never,
      { getVehicleTelemetryAsset: vi.fn().mockResolvedValue(null) } as never,
    );

    await expect(fleetRepository.listVehicles()).resolves.toEqual([]);

    expect(getOpenRemoteAdapterIssues()).toMatchObject([
      {
        source: "OpenRemoteFleetRepository",
        operation: "listVehicles",
        reason: "operation-failed",
        errorMessage: "manager unavailable",
      },
    ]);
  });
});
