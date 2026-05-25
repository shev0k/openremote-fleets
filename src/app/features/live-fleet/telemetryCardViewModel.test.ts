import { describe, expect, it } from "vitest";
import { Vehicle, VehicleDetail } from "../../../domain/models/vehicle";
import { buildLiveTelemetryCardModel, formatLiveTelemetryValue } from "./telemetryCardViewModel";

const vehicle: Vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "moving",
  speedKph: 52,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  heading: 92,
  lastUpdatedIso: "2026-03-29T09:12:00.000Z",
  driverName: "Mila Janssen",
  driverIdentifier: "0007104552",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 1,
  fuelLevelPercent: 68,
  batteryLevelPercent: 93,
  latestTelemetrySamples: [
    { signalId: "speed", timestampIso: "2026-03-29T09:12:00.000Z", value: 52, sourceAttribute: "speed" },
    { signalId: "ignition", timestampIso: "2026-03-29T09:12:00.000Z", value: true, sourceAttribute: "ignition" },
    { signalId: "movement", timestampIso: "2026-03-29T09:12:00.000Z", value: true, sourceAttribute: "movement" },
    { signalId: "fuelLevel", timestampIso: "2026-03-29T09:12:00.000Z", value: 68, sourceAttribute: "fuelLevel" },
    { signalId: "batteryLevel", timestampIso: "2026-03-29T09:12:00.000Z", value: 93, sourceAttribute: "batteryLevel" },
    { signalId: "externalVoltage", timestampIso: "2026-03-29T09:12:00.000Z", value: 12.18, sourceAttribute: "externalVoltage" },
    { signalId: "engineRpm", timestampIso: "2026-03-29T09:12:00.000Z", value: 1240, sourceAttribute: "engineRpm" },
    { signalId: "gnssHdop", timestampIso: "2026-03-29T09:12:00.000Z", value: 0.8, sourceAttribute: "gnssHdop" },
    { signalId: "gsmSignal", timestampIso: "2026-03-29T09:12:00.000Z", value: 5, sourceAttribute: "gsmSignal" },
    { signalId: "totalOdometer", timestampIso: "2026-03-29T09:12:00.000Z", value: 182431000, sourceAttribute: "totalOdometer" },
  ],
};

const detail: VehicleDetail = {
  ...vehicle,
  lastCommunicationIso: "2026-03-29T09:12:00.000Z",
  gpsAccuracyMeters: 8,
  todayMileageKm: 84.2,
  odometerKm: 182431,
  fuelInTankLiters: 246,
  averageFuelConsumptionLitersPer100Km: 28.4,
  stoppedDurationMinutes: 18,
};

describe("telemetryCardViewModel", () => {
  it("formats core live telemetry values", () => {
    expect(formatLiveTelemetryValue(52, "km/h")).toBe("52 km/h");
    expect(formatLiveTelemetryValue(12.184, "V")).toBe("12.18 V");
    expect(formatLiveTelemetryValue(true)).toBe("On");
    expect(formatLiveTelemetryValue(false)).toBe("Off");
    expect(formatLiveTelemetryValue(undefined)).toBe("--");
  });

  it("builds an ordered Teltonika-backed telemetry card model", () => {
    const model = buildLiveTelemetryCardModel(vehicle, detail);

    expect(model.identity).toEqual({
      name: "Atlas 12",
      plate: "BR-482-K",
      trackerId: "352093086403655",
      driverIdentifier: "0007104552",
    });
    expect(model.primaryMetrics.map((metric) => [metric.id, metric.value])).toEqual([
      ["speed", "52 km/h"],
      ["ignition", "On"],
      ["movement", "Moving"],
    ]);
    expect(model.secondaryMetrics.map((metric) => [metric.id, metric.value])).toEqual([
      ["fuelLevel", "68%"],
      ["batteryLevel", "93%"],
      ["engineRpm", "1,240 rpm"],
      ["externalVoltage", "12.18 V"],
      ["gsmSignal", "5/5"],
      ["gnssHdop", "0.8 HDOP"],
      ["todayMileage", "84.2 km"],
      ["odometer", "182,431 km"],
    ]);
    expect(model.secondaryMetrics.find((metric) => metric.id === "engineRpm")?.sourceAttribute).toBe("engineRpm");
  });

  it("keeps missing optional attributes UI-safe", () => {
    const model = buildLiveTelemetryCardModel(
      {
        ...vehicle,
        fuelLevelPercent: undefined,
        batteryLevelPercent: undefined,
        latestTelemetrySamples: [],
      },
      null,
    );

    expect(model.primaryMetrics.find((metric) => metric.id === "speed")?.value).toBe("52 km/h");
    expect(model.secondaryMetrics.find((metric) => metric.id === "fuelLevel")?.value).toBe("--");
    expect(model.secondaryMetrics.find((metric) => metric.id === "odometer")?.value).toBe("--");
  });
});
