import { describe, expect, it } from "vitest";
import { GeneratedReportPreview, ReportExportOptions } from "../../../domain/models/reports";
import {
  createReportChartRows,
  createReportMetadataRows,
  createReportSectionRows,
  getReportPreviewTable,
} from "./reportExportTable";

const preview: GeneratedReportPreview = {
  request: {
    definitionId: "daily-summary",
    period: { type: "preset", preset: "today" },
    vehicleSelection: { mode: "all" },
    parameterIds: ["speed", "ignition"],
    outputMode: "preview",
  },
  generatedAtIso: "2026-05-06T09:00:00.000Z",
  columns: [
    {
      id: "speed",
      attributeName: "speed",
      displayName: "Speed",
      valueType: "numeric",
      source: "teltonika",
      unit: "km/h",
      reportCategoryIds: ["operations"],
    },
    {
      id: "ignition",
      attributeName: "ignition",
      displayName: "Ignition",
      valueType: "boolean",
      source: "teltonika",
      reportCategoryIds: ["operations"],
    },
  ],
  rows: [
    {
      vehicleId: "veh-atlas-12",
      timestampIso: "2026-05-06T09:00:00.000Z",
      values: { speed: 42, ignition: true },
    },
  ],
  summary: { vehicleCount: 1, parameterCount: 2 },
  metadata: {
    title: "Fleet Daily Summary",
    selectedVehiclesLabel: "All vehicles",
    periodLabel: "Today / Full day",
    filters: ["All vehicles", "Today"],
  },
  sections: [
    {
      id: "summary",
      title: "Operational summary",
      kind: "summary",
      items: [{ label: "Trips", value: "18", detail: "Mock trip count" }],
    },
    {
      id: "distance-by-day",
      title: "Distance by day",
      kind: "chart",
      chart: {
        type: "bar",
        unit: "km",
        points: [{ label: "08:00", value: 28, secondaryValue: 4, tone: "normal" }],
      },
    },
  ],
};

const options: ReportExportOptions = {
  formats: ["xlsx"],
  includeSummary: true,
  includeCharts: true,
  includeMap: false,
  includeRawData: true,
  includeMetadata: true,
  groupBy: "vehicle",
  unitSystem: "metric",
  dateTimeFormat: "local",
  pageOrientation: "portrait",
  fileName: "daily-summary",
};

describe("report export table helpers", () => {
  it("formats preview rows through report parameter definitions", () => {
    expect(getReportPreviewTable(preview)).toEqual([
      ["Vehicle", "Time", "Speed", "Ignition"],
      ["veh-atlas-12", "2026-05-06T09:00:00.000Z", "42 km/h", "On"],
    ]);
  });

  it("creates metadata, section, and chart sheets for workbook exports", () => {
    expect(createReportMetadataRows(preview, options)).toContainEqual(["Title", "Fleet Daily Summary"]);
    expect(createReportSectionRows(preview)).toContainEqual([
      "Operational summary",
      "summary",
      "Trips",
      "18",
      "Mock trip count",
    ]);
    expect(createReportChartRows(preview)).toContainEqual([
      "Distance by day",
      "08:00",
      "28",
      "4",
      "km",
      "normal",
    ]);
  });
});
