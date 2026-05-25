import { describe, expect, it, vi } from "vitest";
import { OpenRemoteAlertsRepository } from "../openremote/repositories/OpenRemoteAlertsRepository";
import { OpenRemoteAssetsRepository } from "../openremote/repositories/OpenRemoteAssetsRepository";
import { OpenRemoteFleetRepository } from "../openremote/repositories/OpenRemoteFleetRepository";
import { OpenRemotePlaybackRepository } from "../openremote/repositories/OpenRemotePlaybackRepository";
import { OpenRemotePreferencesRepository } from "../openremote/repositories/OpenRemotePreferencesRepository";
import { OpenRemoteReportsRepository } from "../openremote/repositories/OpenRemoteReportsRepository";
import { MockAlertsRepository } from "../repositories/mock/mockAlertsRepository";
import { MockAssetsRepository } from "../repositories/mock/mockAssetsRepository";
import { MockFleetRepository } from "../repositories/mock/mockFleetRepository";
import { MockPlaybackRepository } from "../repositories/mock/mockPlaybackRepository";
import { MockPreferencesRepository } from "../repositories/mock/mockPreferencesRepository";
import { MockReportsRepository } from "../repositories/mock/mockReportsRepository";
import { createMockAppServices } from "./createMockAppServices";
import { createOpenRemoteAppServices } from "./createOpenRemoteAppServices";

vi.mock("../openremote/runtime/openRemoteRuntime.singleton", () => ({
  getOpenRemoteRuntime: () => ({
    ensureReady: vi.fn(),
  }),
}));

describe("createAppServices", () => {
  it("returns OpenRemote repositories for openRemote mode", () => {
    const services = createOpenRemoteAppServices();

    expect(services.fleetRepository).toBeInstanceOf(OpenRemoteFleetRepository);
    expect(services.playbackRepository).toBeInstanceOf(OpenRemotePlaybackRepository);
    expect(services.alertsRepository).toBeInstanceOf(OpenRemoteAlertsRepository);
    expect(services.assetsRepository).toBeInstanceOf(OpenRemoteAssetsRepository);
    expect(services.reportsRepository).toBeInstanceOf(OpenRemoteReportsRepository);
    expect(services.preferencesRepository).toBeInstanceOf(OpenRemotePreferencesRepository);
    expect(services.liveFleetStateService?.supportsRouteBackedSimulation).toBe(false);
    expect("vehicleSimulationService" in services).toBe(false);
  });

  it("returns mock repositories for mock mode", () => {
    const services = createMockAppServices();

    expect(services.fleetRepository).toBeInstanceOf(MockFleetRepository);
    expect(services.playbackRepository).toBeInstanceOf(MockPlaybackRepository);
    expect(services.alertsRepository).toBeInstanceOf(MockAlertsRepository);
    expect(services.assetsRepository).toBeInstanceOf(MockAssetsRepository);
    expect(services.reportsRepository).toBeInstanceOf(MockReportsRepository);
    expect(services.preferencesRepository).toBeInstanceOf(MockPreferencesRepository);
    expect(services.liveFleetStateService?.supportsRouteBackedSimulation).toBe(true);
    expect("vehicleSimulationService" in services).toBe(false);
  });
});
