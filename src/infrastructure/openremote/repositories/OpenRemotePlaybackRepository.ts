import type { PlaybackQuery, PlaybackRoute } from "../../../domain/models/playback";
import type { TelemetryTimeline } from "../../../domain/models/telemetry";
import type { Vehicle } from "../../../domain/models/vehicle";
import type { PlaybackRepository } from "../../../domain/repositories/playbackRepository";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteFleetAssetService } from "../services/OpenRemoteFleetAssetService";
import { OpenRemoteRouteHistoryService } from "../services/OpenRemoteRouteHistoryService";
import { OpenRemoteRepositoryBase } from "./OpenRemoteRepositoryBase";
import {
  mapOpenRemoteAssetToVehicle,
  mapOpenRemoteDatapointsToPlaybackRoute,
  mapOpenRemoteDatapointsToTelemetryTimeline,
  OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES,
} from "./openRemoteMappers";
import { getOpenRemoteDatapointWindowFromPlaybackQuery } from "./openRemotePlaybackQueryWindow";

export class OpenRemotePlaybackRepository extends OpenRemoteRepositoryBase implements PlaybackRepository {
  constructor(
    runtime: OpenRemoteRuntime,
    private readonly fleetAssetService: OpenRemoteFleetAssetService,
    private readonly routeHistoryService: OpenRemoteRouteHistoryService,
  ) {
    super(runtime);
  }

  async listPlaybackVehicles(): Promise<Vehicle[]> {
    return this.withFallback("listPlaybackVehicles", [], async () => {
      const assets = await this.fleetAssetService.listFleetAssets();
      return assets.map(mapOpenRemoteAssetToVehicle);
    });
  }

  async getPlaybackRoute(vehicleId: string, query: PlaybackQuery): Promise<PlaybackRoute | null> {
    return this.withFallback("getPlaybackRoute", null, async () => {
      const history = await this.routeHistoryService.getVehicleRouteHistoryForWindow(
        vehicleId,
        getOpenRemoteDatapointWindowFromPlaybackQuery(query),
        OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES,
      );
      return mapOpenRemoteDatapointsToPlaybackRoute(vehicleId, history);
    });
  }

  async getPlaybackTelemetryTimeline(vehicleId: string, query: PlaybackQuery, signalIds: string[] = []): Promise<TelemetryTimeline | null> {
    return this.withFallback("getPlaybackTelemetryTimeline", null, async () => {
      const history = await this.routeHistoryService.getVehicleRouteHistoryForWindow(
        vehicleId,
        getOpenRemoteDatapointWindowFromPlaybackQuery(query),
        OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES,
      );
      return mapOpenRemoteDatapointsToTelemetryTimeline(vehicleId, history, signalIds);
    });
  }
}
