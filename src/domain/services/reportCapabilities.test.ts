import { describe, expect, it } from "vitest";
import type { Vehicle } from "../models/vehicle";
import { deriveVehicleReportCapabilities } from "./reportCapabilities";

function vehicle(id: string, overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id,
    name: id,
    plate: id.toUpperCase(),
    status: "moving",
    speedKph: 24,
    ignitionOn: true,
    latitude: 51.44,
    longitude: 5.48,
    heading: 90,
    lastUpdatedIso: "2026-05-06T09:00:00.000Z",
    driverName: "Driver",
    trackerId: `imei-${id}`,
    assetName: `asset-${id}`,
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    ...overrides,
  };
}

describe("domain report capabilities", () => {
  it("derives location capability from explicit valid-location state instead of coordinate truthiness", () => {
    const profiles = deriveVehicleReportCapabilities([
      vehicle("null-island", { hasLocation: true, latitude: 0, longitude: 0 }),
      vehicle("missing-location", { hasLocation: false, latitude: 51.44, longitude: 5.48 }),
    ]);

    expect(profiles["null-island"].capabilityIds).toContain("location");
    expect(profiles["missing-location"].capabilityIds).not.toContain("location");
  });
});
