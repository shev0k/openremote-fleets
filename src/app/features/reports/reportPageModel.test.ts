import { describe, expect, it } from "vitest";
import type { ReportDefinition } from "../../../domain/models/reports";
import { getAvailableReportOutputModes, getReportDeliveryActionMessage } from "./reportPageModel";

const baseDefinition: ReportDefinition = {
  id: "daily-activity",
  name: "Daily Activity",
  description: "Activity report",
  category: "operations",
  requiredCapabilities: [],
  optionalCapabilities: [],
  period: { type: "preset", preset: "today" },
  vehicleSelection: { mode: "all" },
  parameterIds: ["speed"],
  supportedOutputModes: ["preview", "print", "export", "email", "schedule"],
  defaultOutputMode: "preview",
  supportedExportFormats: ["csv", "json"],
};

describe("reportPageModel", () => {
  it("allows all configured report output modes in real mode", () => {
    expect(getAvailableReportOutputModes(baseDefinition, "openRemote")).toEqual([
      "preview",
      "print",
      "export",
      "email",
      "schedule",
    ]);
  });

  it("allows all configured report output modes in mock mode", () => {
    expect(getAvailableReportOutputModes(baseDefinition, "mock")).toEqual([
      "preview",
      "print",
      "export",
      "email",
      "schedule",
    ]);
  });

  it("uses mode-neutral delivery action messages", () => {
    expect(getReportDeliveryActionMessage("email")).not.toMatch(/mock/i);
    expect(getReportDeliveryActionMessage("schedule")).not.toMatch(/mock/i);
  });
});
