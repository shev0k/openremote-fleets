import { describe, expect, it } from "vitest";
import { GeneratedReportPreview, ReportExportOptions } from "../../../domain/models/reports";
import { createReportExportFiles } from "./reportExportService";

const preview: GeneratedReportPreview = {
  request: {
    definitionId: "vehicle-trips",
    period: { type: "preset", preset: "today" },
    vehicleSelection: { mode: "all" },
    parameterIds: ["speed", "fuelLevel"],
    outputMode: "export",
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
      id: "fuelLevel",
      attributeName: "fuelLevel",
      displayName: "Fuel Level",
      valueType: "numeric",
      source: "teltonika",
      unit: "%",
      reportCategoryIds: ["fuel"],
    },
  ],
  rows: [
    {
      vehicleId: "veh-atlas-12",
      timestampIso: "2026-05-06T09:00:00.000Z",
      values: { speed: 42, fuelLevel: 72 },
    },
  ],
  summary: { vehicleCount: 1, parameterCount: 2 },
  metadata: {
    title: "Vehicle Trips",
    selectedVehiclesLabel: "All vehicles",
    periodLabel: "Today / Full day",
    filters: ["All vehicles", "Today", "Full day"],
  },
  sections: [
    {
      id: "summary",
      title: "Operational summary",
      kind: "summary",
      items: [
        { label: "Total distance", value: "196 km" },
        { label: "Trips", value: "18" },
      ],
    },
    {
      id: "distance-by-day",
      title: "Distance by day",
      kind: "chart",
      chart: {
        type: "bar",
        unit: "km",
        points: [
          { label: "08:00", value: 28 },
          { label: "10:00", value: 44 },
          { label: "12:00", value: 36 },
        ],
      },
    },
    {
      id: "raw-data",
      title: "Raw datapoints",
      kind: "raw",
      items: [{ label: "Datapoints", value: "24" }],
    },
  ],
};

const options: ReportExportOptions = {
  formats: ["csv", "json", "xlsx"],
  includeSummary: true,
  includeCharts: true,
  includeMap: false,
  includeRawData: true,
  includeMetadata: true,
  groupBy: "vehicle",
  unitSystem: "metric",
  dateTimeFormat: "local",
  pageOrientation: "portrait",
  fileName: "vehicle-trips",
};

describe("report export service", () => {
  it("creates concrete export files for multiple selected formats", () => {
    const files = createReportExportFiles(preview, options);

    expect(files.map((file) => file.format)).toEqual(["csv", "json", "xlsx"]);
    expect(files.map((file) => file.fileName)).toEqual([
      "vehicle-trips.csv",
      "vehicle-trips.json",
      "vehicle-trips.xlsx",
    ]);
    expect(files.find((file) => file.format === "csv")?.text).toContain("Vehicle,Time,Speed,Fuel Level");
    expect(files.find((file) => file.format === "json")?.text).toContain('"definitionId": "vehicle-trips"');
    expect(files.find((file) => file.format === "xlsx")?.bytes.byteLength).toBeGreaterThan(200);
  });

  it("creates polished multi-page PDF content with sections, charts, and table data", () => {
    const longPreview: GeneratedReportPreview = {
      ...preview,
      rows: Array.from({ length: 42 }, (_, index) => ({
        vehicleId: `veh-${String(index + 1).padStart(2, "0")}`,
        timestampIso: "2026-05-06T09:00:00.000Z",
        values: { speed: 32 + index, fuelLevel: 80 - (index % 30) },
      })),
    };
    const [pdf] = createReportExportFiles(longPreview, { ...options, formats: ["pdf"] });
    const text = new TextDecoder().decode(pdf.bytes);

    expect(text).toContain("Distance by day");
    expect(text).toContain("Report data");
    expect(text).toContain("Raw datapoints");
    expect(text.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1);
    expect(text).toContain(" re f");
  });
});
