import type { PlaybackQuery } from "../../../domain/models/playback";
import type { TelemetrySignalDefinition, TelemetryTimeline } from "../../../domain/models/telemetry";
import type { Vehicle, VehicleDetail } from "../../../domain/models/vehicle";
import type { FleetRepository } from "../../../domain/repositories/fleetRepository";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteFleetAssetService } from "../services/OpenRemoteFleetAssetService";
import { OpenRemoteVehicleTelemetryService } from "../services/OpenRemoteVehicleTelemetryService";
import { OpenRemoteRepositoryBase } from "./OpenRemoteRepositoryBase";
import {
  createOpenRemoteTelemetrySignalDefinitions,
  mapOpenRemoteAssetToVehicle,
  mapOpenRemoteAssetToVehicleDetail,
  mapOpenRemoteDatapointsToTelemetryTimeline,
  OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES,
} from "./openRemoteMappers";
import { getOpenRemoteDatapointWindowFromPlaybackQuery } from "./openRemotePlaybackQueryWindow";

export class OpenRemoteFleetRepository extends OpenRemoteRepositoryBase implements FleetRepository {
  constructor(
    runtime: OpenRemoteRuntime,
    private readonly fleetAssetService: OpenRemoteFleetAssetService,
    private readonly telemetryService: OpenRemoteVehicleTelemetryService,
  ) {
    super(runtime);
  }

  async listVehicles(): Promise<Vehicle[]> {
    return this.withFallback("listVehicles", [], async () => {
      const assets = await this.fleetAssetService.listFleetAssets();
      return assets.map(mapOpenRemoteAssetToVehicle);
    });
  }

  async getVehicleDetail(vehicleId: string): Promise<VehicleDetail | null> {
    return this.withFallback("getVehicleDetail", null, async () => {
      const asset = await this.telemetryService.getVehicleTelemetryAsset(vehicleId);
      return asset ? mapOpenRemoteAssetToVehicleDetail(asset) : null;
    });
  }

  async listAvailableTelemetrySignals(_vehicleId?: string): Promise<TelemetrySignalDefinition[]> {
    return this.withFallback("listAvailableTelemetrySignals", [], async () => createOpenRemoteTelemetrySignalDefinitions());
  }

  async getVehicleTelemetryTimeline(vehicleId: string, query: PlaybackQuery): Promise<TelemetryTimeline | null> {
    return this.withFallback("getVehicleTelemetryTimeline", null, async () => {
      const history = await this.telemetryService.getVehicleTelemetryHistoryForWindow(
        vehicleId,
        getOpenRemoteDatapointWindowFromPlaybackQuery(query),
        OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES,
      );
      return mapOpenRemoteDatapointsToTelemetryTimeline(vehicleId, history);
    });
  }
}
