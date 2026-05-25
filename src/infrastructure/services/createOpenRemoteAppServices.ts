import type { AppServices } from "../../domain/services/appServices";
import { OpenRemoteAlertsRepository } from "../openremote/repositories/OpenRemoteAlertsRepository";
import { OpenRemoteAssetsRepository } from "../openremote/repositories/OpenRemoteAssetsRepository";
import { OpenRemoteFleetRepository } from "../openremote/repositories/OpenRemoteFleetRepository";
import { OpenRemotePlaybackRepository } from "../openremote/repositories/OpenRemotePlaybackRepository";
import { OpenRemotePreferencesRepository } from "../openremote/repositories/OpenRemotePreferencesRepository";
import { OpenRemoteReportsRepository } from "../openremote/repositories/OpenRemoteReportsRepository";
import { PassthroughFleetLiveStateService } from "../../domain/services/liveFleetStateService";
import { getOpenRemoteRuntime } from "../openremote/runtime/openRemoteRuntime.singleton";
import { OpenRemoteAlertsService } from "../openremote/services/OpenRemoteAlertsService";
import { OpenRemoteFleetAssetService } from "../openremote/services/OpenRemoteFleetAssetService";
import { OpenRemotePreferencesService } from "../openremote/services/OpenRemotePreferencesService";
import { OpenRemoteReportsService } from "../openremote/services/OpenRemoteReportsService";
import { OpenRemoteRouteHistoryService } from "../openremote/services/OpenRemoteRouteHistoryService";
import { OpenRemoteVehicleTelemetryService } from "../openremote/services/OpenRemoteVehicleTelemetryService";

export function createOpenRemoteAppServices(): AppServices {
  const runtime = getOpenRemoteRuntime();
  const fleetAssetService = new OpenRemoteFleetAssetService(runtime);
  const routeHistoryService = new OpenRemoteRouteHistoryService(runtime);
  const telemetryService = new OpenRemoteVehicleTelemetryService(runtime, routeHistoryService);
  const alertsService = new OpenRemoteAlertsService(runtime);
  const reportsService = new OpenRemoteReportsService(fleetAssetService);
  const preferencesService = new OpenRemotePreferencesService(runtime);

  return {
    dataMode: "openRemote",
    fleetRepository: new OpenRemoteFleetRepository(runtime, fleetAssetService, telemetryService),
    playbackRepository: new OpenRemotePlaybackRepository(runtime, fleetAssetService, routeHistoryService),
    alertsRepository: new OpenRemoteAlertsRepository(runtime, alertsService),
    assetsRepository: new OpenRemoteAssetsRepository(runtime, fleetAssetService),
    reportsRepository: new OpenRemoteReportsRepository(runtime, reportsService),
    preferencesRepository: new OpenRemotePreferencesRepository(runtime, preferencesService),
    liveFleetStateService: new PassthroughFleetLiveStateService(),
  };
}
