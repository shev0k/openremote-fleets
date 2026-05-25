import type { AlertsRepository } from "../repositories/alertsRepository";
import type { AssetsRepository } from "../repositories/assetsRepository";
import type { FleetRepository } from "../repositories/fleetRepository";
import type { PlaybackRepository } from "../repositories/playbackRepository";
import type { PreferencesRepository } from "../repositories/preferencesRepository";
import type { ReportsRepository } from "../repositories/reportsRepository";
import type { FleetLiveStateService } from "./liveFleetStateService";

export type AppDataMode = "openRemote" | "mock";

export interface AppServices {
  dataMode: AppDataMode;
  fleetRepository: FleetRepository;
  playbackRepository: PlaybackRepository;
  alertsRepository: AlertsRepository;
  assetsRepository: AssetsRepository;
  reportsRepository: ReportsRepository;
  preferencesRepository: PreferencesRepository;
  liveFleetStateService: FleetLiveStateService;
}
