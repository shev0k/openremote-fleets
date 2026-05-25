import { describe, expect, it } from "vitest";
import { ReportDefinition, ReportParameterDefinition } from "../../../domain/models/reports";
import {
  buildReportGenerationRequest,
  createInitialReportBuilderDraft,
  formatReportPreviewValue,
  toggleReportParameter,
} from "./reportBuilderViewModel";

const definitions: ReportDefinition[] = [
  {
    id: "daily-summary",
    name: "Daily Summary",
    category: "operations",
    description: "Daily operational summary.",
    supportedOutputModes: ["preview", "print", "export", "email", "schedule"],
    defaultOutputMode: "preview",
    parameterIds: ["speed", "fuelLevel"],
    vehicleSelection: { mode: "all" },
    period: { type: "preset", preset: "today" },
    schedule: { enabled: false },
  },
];

const parameters: ReportParameterDefinition[] = [
  {
    id: "speed",
    attributeName: "speed",
    displayName: "Speed",
    valueType: "numeric",
    source: "teltonika",
    unit: "km/h",
    teltonikaAvlId: "24",
    reportCategoryIds: ["operations"],
  },
  {
    id: "fuelLevel",
    attributeName: "fuelLevel",
    displayName: "Fuel",
    valueType: "numeric",
    source: "teltonika",
    unit: "%",
    teltonikaAvlId: "48",
    reportCategoryIds: ["fuel", "operations"],
  },
  {
    id: "engineRpm",
    attributeName: "engineRpm",
    displayName: "RPM",
    valueType: "numeric",
    source: "teltonika",
    unit: "rpm",
    teltonikaAvlId: "36",
    reportCategoryIds: ["operations"],
  },
];

describe("reportBuilderViewModel", () => {
  it("creates the initial draft from the selected report definition", () => {
    const draft = createInitialReportBuilderDraft(definitions);

    expect(draft).toMatchObject({
      definitionId: "daily-summary",
      outputMode: "preview",
      periodPreset: "today",
      vehicleSelectionMode: "all",
      selectedParameterIds: ["speed", "fuelLevel"],
    });
  });

  it("toggles parameters while preserving available parameter order and at least one selected parameter", () => {
    expect(toggleReportParameter(["fuelLevel"], "speed", parameters)).toEqual(["speed", "fuelLevel"]);
    expect(toggleReportParameter(["speed", "fuelLevel"], "speed", parameters)).toEqual(["fuelLevel"]);
    expect(toggleReportParameter(["speed"], "speed", parameters)).toEqual(["speed"]);
  });

  it("builds email and schedule requests without sending anything from the UI", () => {
    const emailRequest = buildReportGenerationRequest({
      ...createInitialReportBuilderDraft(definitions),
      outputMode: "email",
      recipientEmails: "ops@example.com, dispatcher@example.com",
      emailSubject: "Daily fleet summary",
    });
    const scheduleRequest = buildReportGenerationRequest({
      ...createInitialReportBuilderDraft(definitions),
      outputMode: "schedule",
      scheduleFrequency: "weekly",
      recipientEmails: "ops@example.com",
    });

    expect(emailRequest.delivery).toEqual({
      recipientEmails: ["ops@example.com", "dispatcher@example.com"],
      emailSubject: "Daily fleet summary",
      message: "Attached is the generated fleet report preview.",
    });
    expect(scheduleRequest.schedule).toEqual({
      enabled: true,
      frequency: "weekly",
      recipientEmails: ["ops@example.com"],
      time: "08:00",
    });
  });

  it("keeps preset periods even when custom date inputs contain stale values", () => {
    const request = buildReportGenerationRequest({
      ...createInitialReportBuilderDraft(definitions),
      periodPreset: "last7Days",
      customStartDateIso: "2026-05-01",
      customEndDateIso: "2026-05-03",
    });

    expect(request.period).toEqual({ type: "preset", preset: "last7Days" });
  });

  it("formats preview values from Teltonika-backed report parameters", () => {
    expect(formatReportPreviewValue(parameters[0], 42)).toBe("42 km/h");
    expect(formatReportPreviewValue(parameters[1], null)).toBe("--");
    expect(
      formatReportPreviewValue(
        {
          ...parameters[0],
          id: "alarm",
          attributeName: "alarm",
          displayName: "Alarm",
          valueType: "event",
        },
        {
          eventType: "overspeed",
          severity: "warning",
          state: "active",
        },
      ),
    ).toBe("overspeed / warning / active");
  });
});
