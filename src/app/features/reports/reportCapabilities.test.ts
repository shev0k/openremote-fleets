import { describe, expect, it } from "vitest";
import { ReportDefinition } from "../../../domain/models/reports";
import { Vehicle } from "../../../domain/models/vehicle";
import {
  createDefaultVehicleGroups,
  deriveVehicleReportCapabilities,
  resolveReportVehicleSelection,
  summarizeReportCompatibility,
} from "./reportCapabilities";

function vehicle(id: string, signalIds: string[], overrides: Partial<Vehicle> = {}): Vehicle {
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
    availableTelemetrySignals: signalIds.map((signalId) => ({
      id: signalId,
      attributeName: signalId,
      displayName: signalId,
      valueType: signalId === "ignition" || signalId === "movement" ? "boolean" : "numeric",
      source: "teltonika",
    })),
    latestTelemetrySamples: signalIds.map((signalId) => ({
      signalId,
      timestampIso: "2026-05-06T09:00:00.000Z",
      value: signalId === "ignition" || signalId === "movement" ? true : 1,
      sourceAttribute: signalId,
    })),
    ...overrides,
  };
}

const fuelReport: ReportDefinition = {
  id: "fuel-usage",
  name: "Fuel Usage",
  category: "fuel",
  description: "Fuel use by vehicle.",
  supportedOutputModes: ["preview", "print", "export"],
  supportedExportFormats: ["csv", "json", "xlsx", "pdf"],
  defaultOutputMode: "preview",
  parameterIds: ["fuelLevel", "fuelUsedGps", "speed"],
  vehicleSelection: { mode: "all" },
  period: { type: "preset", preset: "today" },
  requiredCapabilities: ["fuelLevel"],
  optionalCapabilities: ["fuelConsumed", "speed"],
  defaultParameterIds: ["fuelLevel", "speed"],
};

describe("report capabilities", () => {
  it("derives capability profiles from observed vehicle telemetry", () => {
    const profiles = deriveVehicleReportCapabilities([
      vehicle("with-fuel", ["speed", "fuelLevel", "fuelUsedGps", "gnssHdop", "gsmSignal", "iButton"]),
      vehicle("gps-only", ["speed", "gnssHdop", "gsmSignal"]),
    ]);

    expect(profiles["with-fuel"].capabilityIds).toEqual(
      expect.arrayContaining(["speed", "fuelLevel", "fuelConsumed", "gnssHdop", "gsmSignal", "driverIdentification"]),
    );
    expect(profiles["gps-only"].capabilityIds).toEqual(expect.arrayContaining(["speed", "gnssHdop", "gsmSignal"]));
    expect(profiles["gps-only"].capabilityIds).not.toContain("fuelLevel");
  });

  it("does not treat telemetry catalog definitions as observed real vehicle capabilities", () => {
    const profiles = deriveVehicleReportCapabilities([
      vehicle("partial-real", [], {
        availableTelemetrySignals: ["speed", "fuelLevel", "engineRpm", "iButton"].map((signalId) => ({
          id: signalId,
          attributeName: signalId,
          displayName: signalId,
          valueType: "numeric",
          source: "teltonika",
        })),
        latestTelemetrySamples: [
          {
            signalId: "speed",
            timestampIso: "2026-05-06T09:00:00.000Z",
            value: 47,
            sourceAttribute: "speed",
          },
        ],
      }),
    ]);

    expect(profiles["partial-real"].signalIds).toEqual(["speed"]);
    expect(profiles["partial-real"].capabilityIds).toEqual(expect.arrayContaining(["speed"]));
    expect(profiles["partial-real"].capabilityIds).not.toEqual(
      expect.arrayContaining(["fuelLevel", "rpm", "driverIdentification"]),
    );
  });

  it("resolves all vehicles, explicit vehicles, and vehicle groups consistently", () => {
    const vehicles = [
      vehicle("truck-1", ["speed"], { assetClass: "truck" }),
      vehicle("van-1", ["speed"], { assetClass: "van" }),
      vehicle("alert-1", ["speed"], { status: "alerting" }),
    ];
    const groups = createDefaultVehicleGroups(vehicles);

    expect(resolveReportVehicleSelection({ mode: "all" }, vehicles, groups).map((item) => item.id)).toEqual([
      "truck-1",
      "van-1",
      "alert-1",
    ]);
    expect(
      resolveReportVehicleSelection({ mode: "selected", vehicleIds: ["van-1"] }, vehicles, groups).map((item) => item.id),
    ).toEqual(["van-1"]);
    expect(
      resolveReportVehicleSelection({ mode: "groups", groupIds: ["class-truck", "status-alerting"] }, vehicles, groups).map((item) => item.id),
    ).toEqual(["truck-1", "alert-1"]);
  });

  it("summarizes partial compatibility instead of silently failing report generation", () => {
    const vehicles = [
      vehicle("with-fuel", ["speed", "fuelLevel", "fuelUsedGps"]),
      vehicle("gps-only", ["speed", "gnssHdop"]),
    ];
    const profiles = deriveVehicleReportCapabilities(vehicles);
    const summary = summarizeReportCompatibility(fuelReport, vehicles, profiles);

    expect(summary.isAvailable).toBe(true);
    expect(summary.compatibleVehicleIds).toEqual(["with-fuel"]);
    expect(summary.excludedVehicles).toEqual([
      expect.objectContaining({
        vehicleId: "gps-only",
        missingCapabilities: ["fuelLevel"],
      }),
    ]);
    expect(summary.message).toBe("Fuel Usage is available for 1 of 2 selected vehicles. 1 vehicle will be excluded.");
  });
});
