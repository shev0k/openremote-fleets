import { describe, expect, it } from "vitest";
import { Vehicle } from "../../../domain/models/vehicle";
import { applyWallDisplayDemoTelemetry } from "./wallDisplayDemoTelemetry";

function createVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "veh-atlas",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 28,
    ignitionOn: true,
    latitude: 51.4416,
    longitude: 5.4697,
    heading: 80,
    lastUpdatedIso: "2026-05-07T12:00:00.000Z",
    driverName: "Lotte Bakker",
    trackerId: "352094085231592",
    assetName: "Atlas 12",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    fuelLevelPercent: 72,
    batteryLevelPercent: 91,
    teltonika: {
      imei: "352094085231592",
      model: "FMC003",
      protocol: "tcp",
      codec: "codec8e",
      timestampIso: "2026-05-07T12:00:00.000Z",
      attributes: {
        speed: {
          avlId: "24",
          attributeName: "speed",
          displayName: "Speed",
          value: 28,
          unit: "km/h",
          parameterGroup: "movement",
          timestampIso: "2026-05-07T12:00:00.000Z",
        },
        fuelLevel: {
          avlId: "48",
          attributeName: "fuelLevel",
          displayName: "Fuel level",
          value: 72,
          unit: "%",
          parameterGroup: "fuel",
          timestampIso: "2026-05-07T12:00:00.000Z",
        },
        tripOdometer: {
          avlId: "199",
          attributeName: "tripOdometer",
          displayName: "Trip odometer",
          value: 26500,
          unit: "m",
          parameterGroup: "odometer",
          timestampIso: "2026-05-07T12:00:00.000Z",
        },
      },
    },
    ...overrides,
  };
}

describe("applyWallDisplayDemoTelemetry", () => {
  it("creates live-looking demo telemetry without mutating the source vehicles", () => {
    const vehicle = createVehicle();
    const result = applyWallDisplayDemoTelemetry([vehicle], new Date("2026-05-07T12:00:05.000Z"));

    expect(result[0]).not.toBe(vehicle);
    expect(result[0].lastUpdatedIso).toBe("2026-05-07T12:00:05.000Z");
    expect(result[0].teltonika?.timestampIso).toBe("2026-05-07T12:00:05.000Z");
    expect(result[0].teltonika?.attributes.speed.value).toBe(result[0].speedKph);
    expect(result[0].teltonika?.attributes.tripOdometer.value).toBeGreaterThan(26500);
    expect(vehicle.teltonika?.attributes.tripOdometer.value).toBe(26500);
  });

  it("keeps offline vehicle freshness stable while still returning a cloned vehicle", () => {
    const vehicle = createVehicle({ status: "offline", speedKph: 0, ignitionOn: false });
    const result = applyWallDisplayDemoTelemetry([vehicle], new Date("2026-05-07T12:00:05.000Z"));

    expect(result[0]).not.toBe(vehicle);
    expect(result[0].speedKph).toBe(0);
    expect(result[0].lastUpdatedIso).toBe("2026-05-07T12:00:00.000Z");
  });
});
