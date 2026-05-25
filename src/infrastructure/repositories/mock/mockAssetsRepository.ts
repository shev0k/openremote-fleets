import { AssetDevice } from "../../../domain/models/assets";
import { AssetsRepository } from "../../../domain/repositories/assetsRepository";
import { cloneFixture } from "./fixtures/cloneFixture";
import { MOCK_ASSET_FIXTURES } from "./fixtures/assetsFixtures";

export class MockAssetsRepository implements AssetsRepository {
  private assets: AssetDevice[];

  constructor(seedAssets: AssetDevice[] = MOCK_ASSET_FIXTURES) {
    this.assets = cloneFixture(seedAssets);
  }

  async listAssets(): Promise<AssetDevice[]> {
    return cloneFixture(this.assets);
  }
}
