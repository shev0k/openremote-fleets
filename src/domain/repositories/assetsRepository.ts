import { AssetDevice } from "../models/assets";

export interface AssetsRepository {
  listAssets(): Promise<AssetDevice[]>;
}
