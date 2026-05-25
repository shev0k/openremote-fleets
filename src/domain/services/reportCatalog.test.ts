import { describe, expect, it } from "vitest";
import { createReportDefinitions, createReportParameters } from "./reportCatalog";
import type { ReportOutputMode } from "../models/reports";

const allOutputModes: ReportOutputMode[] = ["preview", "print", "export", "email", "schedule"];
const expectedReportIds = [
  "daily-summary",
  "alarms",
  "fuel-management",
  "asset-health",
  "trip-activity",
  "vehicle-stops",
  "telemetry-history",
  "driver-activity",
  "canbus-details",
  "temperature",
];

describe("report catalog", () => {
  it("exposes every report type with email and schedule output modes", () => {
    const definitions = createReportDefinitions();

    expect(definitions.map((definition) => definition.id)).toEqual(expectedReportIds);
    expect(definitions.every((definition) => allOutputModes.every((mode) => definition.supportedOutputModes.includes(mode)))).toBe(true);
  });

  it("keeps mock demo defaults separate from neutral real-mode defaults", () => {
    const realFuelReport = createReportDefinitions().find((definition) => definition.id === "fuel-management");
    const mockFuelReport = createReportDefinitions({ demoDefaults: true }).find((definition) => definition.id === "fuel-management");

    expect(realFuelReport?.vehicleSelection).toEqual({ mode: "all" });
    expect(mockFuelReport?.vehicleSelection).toEqual({
      mode: "selected",
      vehicleIds: ["veh-atlas-12", "veh-courier-19"],
    });
    expect(mockFuelReport?.schedule?.recipientEmails).toEqual(["fleet.ops@example.com"]);
  });

  it("exposes Teltonika-backed report parameters shared by real and mock mode", () => {
    expect(createReportParameters().map((parameter) => parameter.id)).toEqual(
      expect.arrayContaining(["speed", "fuelLevel", "fuelRateGps", "externalVoltage", "gnssHdop", "gsmSignal", "iButton", "alarm"]),
    );
  });
});
