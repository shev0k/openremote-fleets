import type { Asset } from "@openremote/model";

export class OpenRemoteFleetAssetCache {
  private cached: { assets: Asset[]; expiresAt: number } | null = null;
  private inFlight: Promise<Asset[]> | null = null;

  constructor(private readonly ttlMs = 3000) {}

  async read(load: () => Promise<Asset[]>): Promise<Asset[]> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now) {
      return this.cached.assets;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = load()
      .then((assets) => {
        this.cached = {
          assets,
          expiresAt: Date.now() + this.ttlMs,
        };
        return assets;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  clear() {
    this.cached = null;
    this.inFlight = null;
  }
}
