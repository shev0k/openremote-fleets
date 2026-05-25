import type { Asset, AssetQuery } from "@openremote/model";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteFleetAssetCache } from "./OpenRemoteFleetAssetCache";

const FLEET_ASSET_TYPES = ["TeltonikaTrackerAsset"];

export class OpenRemoteFleetAssetService {
  constructor(
    private readonly runtime: OpenRemoteRuntime,
    private readonly assetCache = new OpenRemoteFleetAssetCache(),
  ) {}

  async listFleetAssets(): Promise<Asset[]> {
    return this.assetCache.read(() => this.queryFleetAssetsFromOpenRemote());
  }

  private async queryFleetAssetsFromOpenRemote(): Promise<Asset[]> {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      return [];
    }

    const query: AssetQuery = {
      recursive: true,
      types: FLEET_ASSET_TYPES,
    };
    const response = await this.runtime.getApi().AssetResource.queryAssets(query);
    return response.data ?? [];
  }

  async getFleetAsset(assetId: string): Promise<Asset | null> {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      return null;
    }

    const response = await this.runtime.getApi().AssetResource.get(assetId);
    return response.data ?? null;
  }
}
