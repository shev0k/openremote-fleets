import { FleetReportSnapshot, ReportExportFile } from "../../../domain/models/reports";
import { Vehicle } from "../../../domain/models/vehicle";
import {
  GRAPH_WIDGET_CATALOG,
  GraphWidgetId,
  createGraphDashboardSummary,
} from "./graphsDashboardModel";

export type GraphExportFormat = "csv" | "json";

interface CreateGraphDashboardExportFilesInput {
  dateRangeLabel: string;
  snapshot: FleetReportSnapshot;
  vehicles: Vehicle[];
  selectedWidgetIds: GraphWidgetId[];
  formats: GraphExportFormat[];
  fileName: string;
}

const textEncoder = new TextEncoder();

function normalizeFileName(fileName: string): string {
  return (fileName || "fleet-graphs")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "fleet-graphs";
}

function bytesFromText(text: string): Uint8Array {
  return textEncoder.encode(text);
}

function escapeCsvValue(value: string): string {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safeValue) ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
}

function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map((value) => escapeCsvValue(value === null || value === undefined ? "" : String(value))).join(",");
}

function kilometersLabel(value: number | null): string {
  return value === null ? "--" : `${value} km`;
}

function tripKilometersLabel(value: number | null): string {
  return value === null ? "--" : `${value} km trip`;
}

function selectedWidgetTitles(selectedWidgetIds: GraphWidgetId[]): string[] {
  const selected = new Set(selectedWidgetIds);
  return GRAPH_WIDGET_CATALOG.filter((widget) => selected.has(widget.id)).map((widget) => widget.title);
}

function createCsv({
  dateRangeLabel,
  snapshot,
  vehicles,
  selectedWidgetIds,
}: CreateGraphDashboardExportFilesInput): string {
  const summary = createGraphDashboardSummary(snapshot, vehicles);
  const selected = new Set(selectedWidgetIds);
  const rows: string[] = [
    csvRow(["Section", "Metric", "Value", "Detail"]),
    csvRow(["Dashboard", "Date Range", dateRangeLabel, ""]),
    csvRow(["Selected Widgets", "Count", selectedWidgetIds.length, selectedWidgetTitles(selectedWidgetIds).join(" | ")]),
  ];

  if (selected.has("fleet-kpis")) {
    rows.push(csvRow(["Fleet KPIs", "Max Speed", `${snapshot.metrics.maxSpeedKph} km/h`, "Teltonika speed"]));
    rows.push(csvRow(["Fleet KPIs", "Average Trip Duration", snapshot.metrics.averageTripDurationLabel, "Reports snapshot"]));
    rows.push(csvRow(["Fleet KPIs", "Total Distance", `${snapshot.metrics.totalDistanceKm} km`, "Trip and odometer summary"]));
    rows.push(csvRow(["Fleet KPIs", "Overspeed Events", snapshot.metrics.overspeedEvents, "OpenRemote alarm context"]));
  }

  if (selected.has("daily-activity")) {
    snapshot.dailyTrips.forEach((point) => {
      rows.push(csvRow(["Daily Activity", point.dayLabel, `${point.trips} trips`, `${point.distanceKm} km`]));
    });
  }

  if (selected.has("speed-trend")) {
    snapshot.dailySpeed.forEach((point) => {
      rows.push(csvRow(["Speed Trend", point.dayLabel, `${point.averageSpeedKph} km/h average`, `${point.maxSpeedKph} km/h max`]));
    });
  }

  if (selected.has("speed-distribution")) {
    snapshot.speedDistribution.forEach((point) => {
      rows.push(csvRow(["Speed Distribution", point.bucketLabel, `${point.percentage}%`, "Reports snapshot"]));
    });
  }

  if (selected.has("vehicle-activity")) {
    snapshot.mostActiveVehicles.forEach((vehicle) => {
      rows.push(csvRow(["Vehicle Activity", vehicle.vehicleId, `${vehicle.tripCount} trips`, vehicle.distanceLabel]));
    });
  }

  if (selected.has("fleet-status")) {
    rows.push(csvRow(["Fleet Status", "Active Vehicles", summary.activeVehicleCount, `${summary.vehicleCount} total vehicles`]));
    summary.statusRows.forEach((row) => {
      rows.push(csvRow(["Fleet Status", row.label, row.count, `${row.percentage}%`]));
    });
  }

  if (selected.has("alerts-by-vehicle")) {
    summary.alertRows.forEach((row) => {
      rows.push(csvRow(["Alerts By Vehicle", row.vehicleName, row.activeAlertCount, `${row.speedKph} km/h`]));
    });
  }

  if (selected.has("fuel-battery")) {
    summary.fuelBatteryRows.forEach((row) => {
      rows.push(csvRow(["Fuel And Battery", row.vehicleName, row.fuelLevel === null ? "" : `${row.fuelLevel}%`, row.batteryLevel === null ? "" : `${row.batteryLevel}% battery`]));
    });
  }

  if (selected.has("tracker-health")) {
    summary.trackerHealthRows.forEach((row) => {
      rows.push(csvRow(["Tracker Health", row.label, row.averageLabel, row.detail]));
    });
  }

  if (selected.has("telemetry-coverage")) {
    summary.telemetryCoverageRows.forEach((row) => {
      rows.push(csvRow(["Telemetry Coverage", row.label, `${row.supportedVehicleCount}/${summary.vehicleCount}`, row.sourceLabel]));
    });
  }

  if (selected.has("driver-coverage")) {
    rows.push(csvRow(["Driver Coverage", "Assigned", summary.driverCoverage.assignedCount, `${summary.driverCoverage.percentage}% coverage`]));
    summary.driverCoverage.driverRows.forEach((row) => {
      rows.push(csvRow(["Driver Coverage", row.vehicleName, row.driverName, row.driverIdentifier]));
    });
  }

  if (selected.has("engine-load")) {
    summary.engineRows.forEach((row) => {
      rows.push(csvRow(["Engine Load", row.vehicleName, `${row.rpm} rpm`, `${row.speedKph} km/h`]));
    });
  }

  if (selected.has("odometer-distance")) {
    summary.odometerRows.forEach((row) => {
      rows.push(csvRow(["Odometer And Distance", row.vehicleName, kilometersLabel(row.totalOdometerKm), tripKilometersLabel(row.tripOdometerKm)]));
    });
  }

  return rows.join("\n");
}

function createJson(input: CreateGraphDashboardExportFilesInput): string {
  const selectedWidgets = GRAPH_WIDGET_CATALOG.filter((widget) => input.selectedWidgetIds.includes(widget.id));
  return JSON.stringify(
    {
      dateRangeLabel: input.dateRangeLabel,
      selectedWidgetIds: input.selectedWidgetIds,
      selectedWidgets,
      snapshot: input.snapshot,
      vehicleCount: input.vehicles.length,
      summary: createGraphDashboardSummary(input.snapshot, input.vehicles),
    },
    null,
    2,
  );
}

export function createGraphDashboardExportFiles(input: CreateGraphDashboardExportFilesInput): ReportExportFile[] {
  const baseName = normalizeFileName(input.fileName);

  return input.formats.map((format) => {
    const text = format === "csv" ? createCsv(input) : createJson(input);

    return {
      format,
      fileName: `${baseName}.${format}`,
      mimeType: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
      text,
      bytes: bytesFromText(text),
    };
  });
}

export function downloadGraphExportFile(file: ReportExportFile): void {
  const bytes = new ArrayBuffer(file.bytes.byteLength);
  new Uint8Array(bytes).set(file.bytes);
  const blob = new Blob([bytes], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
