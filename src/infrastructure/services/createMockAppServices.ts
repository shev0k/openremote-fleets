import type { AppServices } from "../../domain/services/appServices";
import { MockAlertsRepository } from "../repositories/mock/mockAlertsRepository";
import { MockAssetsRepository } from "../repositories/mock/mockAssetsRepository";
import { MockFleetRepository } from "../repositories/mock/mockFleetRepository";
import { MockLiveFleetSimulationService } from "../repositories/mock/mockLiveFleetSimulation";
import { MockPlaybackRepository } from "../repositories/mock/mockPlaybackRepository";
import { MockPreferencesRepository } from "../repositories/mock/mockPreferencesRepository";
import { MockReportsRepository } from "../repositories/mock/mockReportsRepository";

export function createMockAppServices(): AppServices {
  return {
    dataMode: "mock",
    fleetRepository: new MockFleetRepository(),
    playbackRepository: new MockPlaybackRepository(),
    alertsRepository: new MockAlertsRepository(),
    assetsRepository: new MockAssetsRepository(),
    reportsRepository: new MockReportsRepository(),
    preferencesRepository: new MockPreferencesRepository(),
    liveFleetStateService: new MockLiveFleetSimulationService(),
  };
}
