import type { AssetDevice } from "../../../domain/models/assets";
import type { AssetsRepository } from "../../../domain/repositories/assetsRepository";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteFleetAssetService } from "../services/OpenRemoteFleetAssetService";
import { OpenRemoteRepositoryBase } from "./OpenRemoteRepositoryBase";
import { mapOpenRemoteAssetToAssetDevice } from "./openRemoteMappers";

export class OpenRemoteAssetsRepository extends OpenRemoteRepositoryBase implements AssetsRepository {
  constructor(
    runtime: OpenRemoteRuntime,
    private readonly fleetAssetService: OpenRemoteFleetAssetService,
  ) {
    super(runtime);
  }

  async listAssets(): Promise<AssetDevice[]> {
    return this.withFallback("listAssets", [], async () => {
      const assets = await this.fleetAssetService.listFleetAssets();
      return assets.map(mapOpenRemoteAssetToAssetDevice);
    });
  }
}
