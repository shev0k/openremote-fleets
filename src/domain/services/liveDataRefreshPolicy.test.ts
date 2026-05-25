import { describe, expect, it } from "vitest";
import { LIVE_DATA_REFRESH_INTERVAL_MS } from "./liveDataRefreshPolicy";

describe("live data refresh policy", () => {
  it("keeps real fleet vehicle refresh close to tracker update cadence", () => {
    expect(LIVE_DATA_REFRESH_INTERVAL_MS.fleetVehicles).toBeLessThanOrEqual(5_000);
  });

  it("keeps real assets refresh close to tracker update cadence", () => {
    expect(LIVE_DATA_REFRESH_INTERVAL_MS.assets).toBeLessThanOrEqual(5_000);
  });
});
