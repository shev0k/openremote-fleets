import type { Asset } from "@openremote/model";
import type { OpenRemoteDatapointHistory } from "../models/openRemoteDatapoints";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteRouteHistoryService, type OpenRemoteDatapointHistoryWindow } from "./OpenRemoteRouteHistoryService";

export class OpenRemoteVehicleTelemetryService {
  constructor(
    private readonly runtime: OpenRemoteRuntime,
    private readonly routeHistoryService: OpenRemoteRouteHistoryService,
  ) {}

  async getVehicleTelemetryAsset(assetId: string): Promise<Asset | null> {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      return null;
    }

    const response = await this.runtime.getApi().AssetResource.get(assetId);
    return response.data ?? null;
  }

  async getVehicleTelemetryHistoryForWindow(
    assetId: string,
    window: OpenRemoteDatapointHistoryWindow,
    attributeNames: string[],
  ): Promise<OpenRemoteDatapointHistory | null> {
    return this.routeHistoryService.getVehicleRouteHistoryForWindow(assetId, window, attributeNames);
  }
}
