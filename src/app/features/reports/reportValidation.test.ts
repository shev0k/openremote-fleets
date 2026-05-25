import { describe, expect, it } from "vitest";
import { ReportDefinition, ReportParameterDefinition } from "../../../domain/models/reports";
import { Vehicle } from "../../../domain/models/vehicle";
import { ReportBuilderDraft } from "./reportBuilderViewModel";
import { validateReportBuilderDraft } from "./reportValidation";
import { deriveVehicleReportCapabilities } from "./reportCapabilities";

const parameters: ReportParameterDefinition[] = [
  {
    id: "speed",
    attributeName: "speed",
    displayName: "Speed",
    valueType: "numeric",
    source: "teltonika",
    reportCategoryIds: ["operations"],
  },
  {
    id: "fuelLevel",
    attributeName: "fuelLevel",
    displayName: "Fuel Level",
    valueType: "numeric",
    source: "teltonika",
    reportCategoryIds: ["fuel"],
  },
  {
    id: "engineRpm",
    attributeName: "engineRpm",
    displayName: "Engine RPM",
    valueType: "numeric",
    source: "teltonika",
    reportCategoryIds: ["assets"],
  },
];

const definition: ReportDefinition = {
  id: "fuel-usage",
  name: "Fuel Usage",
  category: "fuel",
  description: "Fuel use.",
  supportedOutputModes: ["preview", "export"],
  supportedExportFormats: ["csv"],
  defaultOutputMode: "preview",
  parameterIds: ["speed", "fuelLevel"],
  defaultParameterIds: ["speed", "fuelLevel"],
  requiredCapabilities: ["fuelLevel"],
  vehicleSelection: { mode: "all" },
  period: { type: "preset", preset: "today" },
};

function draft(overrides: Partial<ReportBuilderDraft> = {}): ReportBuilderDraft {
  return {
    definitionId: "fuel-usage",
    periodPreset: "today",
    customStartDateIso: "",
    customEndDateIso: "",
    timeWindowPreset: "fullDay",
    customStartTime: "08:00",
    customEndTime: "18:00",
    vehicleSelectionMode: "all",
    selectedVehicleIds: [],
    selectedGroupIds: [],
    selectedStatusIds: [],
    selectedParameterIds: ["speed", "fuelLevel"],
    selectedColumnIds: ["vehicle", "time", "speed", "fuelLevel"],
    selectedChartIds: ["table"],
    grouping: "vehicle",
    aggregation: "average",
    includeSummary: true,
    includeCharts: true,
    includeMap: false,
    includeRawData: false,
    outputMode: "preview",
    exportFormats: ["csv"],
    pageOrientation: "portrait",
    unitSystem: "metric",
    dateTimeFormat: "local",
    fileName: "fuel-usage",
    scheduleFrequency: "weekly",
    scheduleStartDateIso: "",
    scheduleTime: "08:00",
    recipientEmails: "",
    emailSubject: "Fuel Usage report",
    emailMessage: "",
    ...overrides,
  };
}

function vehicle(id: string, signalIds: string[]): Vehicle {
  return {
    id,
    name: id,
    plate: id,
    status: "moving",
    speedKph: 0,
    ignitionOn: false,
    latitude: 0,
    longitude: 0,
    heading: 0,
    lastUpdatedIso: "2026-05-06T09:00:00.000Z",
    driverName: "Driver",
    trackerId: id,
    assetName: id,
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    availableTelemetrySignals: signalIds.map((signalId) => ({
      id: signalId,
      attributeName: signalId,
      displayName: signalId,
      valueType: "numeric",
      source: "teltonika",
    })),
    latestTelemetrySamples: signalIds.map((signalId) => ({
      signalId,
      timestampIso: "2026-05-06T09:00:00.000Z",
      value: 1,
      sourceAttribute: signalId,
    })),
  };
}

describe("report validation", () => {
  it("blocks generation when required selections are missing", () => {
    const result = validateReportBuilderDraft({
      draft: draft({ selectedParameterIds: [], selectedVehicleIds: [], vehicleSelectionMode: "selected" }),
      definition,
      parameters,
      selectedVehicles: [],
      capabilityProfiles: {},
    });

    expect(result.canGenerate).toBe(false);
    expect(result.messages.map((message) => message.text)).toEqual([
      "Select at least one vehicle.",
      "Select at least one parameter.",
    ]);
  });

  it("prevents parameters that are not supported by the selected report type", () => {
    const result = validateReportBuilderDraft({
      draft: draft({ selectedParameterIds: ["speed", "engineRpm"] }),
      definition,
      parameters,
      selectedVehicles: [vehicle("with-fuel", ["speed", "fuelLevel"])],
      capabilityProfiles: deriveVehicleReportCapabilities([vehicle("with-fuel", ["speed", "fuelLevel"])]),
    });

    expect(result.canGenerate).toBe(false);
    expect(result.messages[0].text).toBe("Engine RPM is not available for Fuel Usage.");
  });

  it("blocks reports when no selected vehicle supports required capabilities", () => {
    const selectedVehicles = [vehicle("gps-only", ["speed"])];
    const result = validateReportBuilderDraft({
      draft: draft(),
      definition,
      parameters,
      selectedVehicles,
      capabilityProfiles: deriveVehicleReportCapabilities(selectedVehicles),
    });

    expect(result.canGenerate).toBe(false);
    expect(result.compatibility.message).toBe("Fuel Usage is unavailable because none of the selected vehicles expose fuel level data.");
  });

  it("requires both dates for a custom date range", () => {
    const selectedVehicles = [vehicle("with-fuel", ["speed", "fuelLevel"])];
    const result = validateReportBuilderDraft({
      draft: draft({ periodPreset: "custom", customStartDateIso: "2026-05-01", customEndDateIso: "" }),
      definition,
      parameters,
      selectedVehicles,
      capabilityProfiles: deriveVehicleReportCapabilities(selectedVehicles),
    });

    expect(result.canGenerate).toBe(false);
    expect(result.messages.map((message) => message.text)).toContain("Set a custom date range start and end date.");
  });
});
