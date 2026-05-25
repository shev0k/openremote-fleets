import type { Asset } from "@openremote/model";
import type {
  FleetReportSnapshot,
  GeneratedReportPreview,
  ReportDefinition,
  ReportGenerationRequest,
  ReportParameterDefinition,
  ReportPeriod,
  ReportPreviewChartPoint,
  ReportPreviewRow,
  ReportPreviewSection,
} from "../../../domain/models/reports";
import type { Vehicle } from "../../../domain/models/vehicle";
import {
  filterVehiclesByRequiredReportCapabilities,
  resolveReportVehicleSelection,
} from "../../../domain/services/reportCapabilities";
import {
  createReportDefinitions,
  createReportParameters,
} from "../../../domain/services/reportCatalog";
import { getOpenRemoteNumber } from "./openRemoteAssetAttributes";
import { mapOpenRemoteAssetToVehicle } from "./openRemoteVehicleMapper";

function reportPeriodPreset(period: ReportPeriod): string {
  return period.preset ?? period.startDateIso ?? "custom";
}

export function createOpenRemoteReportDefinitions(): ReportDefinition[] {
  return createReportDefinitions();
}

export function createOpenRemoteReportParameters(): ReportParameterDefinition[] {
  return createReportParameters();
}

export function createOpenRemoteFleetReportSnapshot(assets: Asset[] | null | undefined): FleetReportSnapshot {
  const vehicles = (assets ?? []).map(mapOpenRemoteAssetToVehicle);
  if (!vehicles.length) {
    return {
      metrics: {
        maxSpeedKph: 0,
        maxSpeedDeltaPercent: 0,
        averageTripDurationLabel: "--",
        overspeedEvents: 0,
        overspeedDeltaPercent: 0,
        totalDistanceKm: 0,
      },
      dailyTrips: [],
      dailySpeed: [],
      speedDistribution: [],
      mostActiveVehicles: [],
    };
  }
  const maxSpeedKph = vehicles.reduce((maxSpeed, vehicle) => Math.max(maxSpeed, vehicle.speedKph), 0);
  const totalDistanceKm = Math.round(
    (assets ?? []).reduce((sum, asset) => sum + (getOpenRemoteNumber(asset, "tripOdometer") ?? 0) / 1000, 0),
  );
  const overspeedEvents = vehicles.filter((vehicle) => vehicle.speedKph > 100).length;

  return {
    metrics: {
      maxSpeedKph,
      maxSpeedDeltaPercent: 0,
      averageTripDurationLabel: "--",
      overspeedEvents,
      overspeedDeltaPercent: 0,
      totalDistanceKm,
    },
    dailyTrips: [],
    dailySpeed: [],
    speedDistribution: createSpeedDistribution(vehicles),
    mostActiveVehicles: vehicles
      .map((vehicle, index) => ({
        vehicleId: vehicle.name,
        distanceLabel: `${Math.round(((assets ?? [])[index] ? (getOpenRemoteNumber((assets ?? [])[index], "tripOdometer") ?? 0) / 1000 : 0))} km`,
        tripCount: vehicle.status === "offline" ? 0 : 1,
        score: Math.min(100, Math.max(0, vehicle.speedKph + (vehicle.activeAlertCount > 0 ? 10 : 0))),
      }))
      .sort((left, right) => right.score - left.score),
  };
}

function createSpeedDistribution(vehicles: Vehicle[]) {
  const buckets = [
    { bucketLabel: "0-20", min: 0, max: 20 },
    { bucketLabel: "21-40", min: 21, max: 40 },
    { bucketLabel: "41-60", min: 41, max: 60 },
    { bucketLabel: "61-80", min: 61, max: 80 },
    { bucketLabel: "81+", min: 81, max: Infinity },
  ];
  return buckets.map((bucket) => {
    const count = vehicles.filter((vehicle) => vehicle.speedKph >= bucket.min && vehicle.speedKph <= bucket.max).length;
    return {
      bucketLabel: bucket.bucketLabel,
      percentage: vehicles.length ? Math.round((count / vehicles.length) * 100) : 0,
    };
  });
}

function reportRowNumber(row: ReportPreviewRow, signalId: string): number | null {
  const value = row.values[signalId];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function createOpenRemoteChartPoints(
  chartId: string,
  snapshot: FleetReportSnapshot,
  rows: ReportPreviewRow[],
): { points: ReportPreviewChartPoint[]; unit?: string } {
  if (chartId === "distance-by-day" && snapshot.dailyTrips.length) {
    return {
      points: snapshot.dailyTrips.map((point) => ({ label: point.dayLabel, value: point.distanceKm, unit: "km" })),
      unit: "km",
    };
  }

  if (chartId === "activity-by-vehicle" || chartId === "driver-activity" || chartId === "driver-trip-count" || chartId === "trip-count") {
    return {
      points: snapshot.mostActiveVehicles.map((point) => ({ label: point.vehicleId, value: point.tripCount, unit: "trips" })),
      unit: "trips",
    };
  }

  const signalId = chartId.includes("fuel")
    ? "fuelLevel"
    : chartId.includes("voltage")
      ? "externalVoltage"
      : chartId.includes("gnss")
        ? "gnssHdop"
        : chartId.includes("signal")
          ? "gsmSignal"
          : "speed";
  const firstValue = rows.map((row) => reportRowNumber(row, signalId)).find((value) => value !== null);
  const unit = signalId === "fuelLevel" ? "%" : signalId === "externalVoltage" ? "V" : signalId === "gsmSignal" ? "/5" : signalId === "speed" ? "km/h" : undefined;

  const points: ReportPreviewChartPoint[] =
    firstValue === undefined
      ? []
      : rows.flatMap((row) => {
          const value = reportRowNumber(row, signalId);
          if (value === null) {
            return [];
          }

          return [{ label: row.vehicleId, value, ...(unit ? { unit } : {}) }];
        });

  return { points, unit };
}

function createOpenRemotePreviewSections(
  definition: ReportDefinition | undefined,
  request: ReportGenerationRequest,
  snapshot: FleetReportSnapshot,
  rows: ReportPreviewRow[],
  columns: ReportParameterDefinition[],
  excludedVehicleCount: number,
): ReportPreviewSection[] {
  const sections: ReportPreviewSection[] = [];
  const previewSections = definition?.previewSections ?? ["summary", "charts", "table"];

  previewSections.forEach((section) => {
    if (section === "summary" && request.includeSummary !== false) {
      sections.push({
        id: "operational-summary",
        title: "Operational summary",
        kind: "summary",
        description: "Current OpenRemote asset snapshot summary for compatible vehicles.",
        items: [
          { label: "Vehicles", value: String(rows.length) },
          { label: "Parameters", value: String(columns.length) },
          { label: "Total distance", value: `${snapshot.metrics.totalDistanceKm} km` },
          { label: "Max speed", value: `${snapshot.metrics.maxSpeedKph} km/h` },
          ...(excludedVehicleCount > 0 ? [{ label: "Excluded", value: String(excludedVehicleCount) }] : []),
        ],
      });
      return;
    }

    if (section === "charts" && request.includeCharts !== false) {
      const chartIds = request.chartIds?.length
        ? request.chartIds
        : definition?.defaultChartIds?.length
          ? definition.defaultChartIds
          : definition?.availableCharts ?? [];
      chartIds.forEach((chartId) => {
        const chart = createOpenRemoteChartPoints(chartId, snapshot, rows);
        sections.push({
          id: chartId,
          title: chartId.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
          kind: "chart",
          description: "Current asset telemetry chart. Historical aggregation is not applied in this preview.",
          chart: {
            type: chartId.includes("distribution") || chartId.includes("severity") ? "distribution" : "bar",
            unit: chart.unit,
            points: chart.points,
          },
        });
      });
      return;
    }

    if (section === "timeline") {
      sections.push({
        id: "event-timeline",
        title: "Event timeline",
        kind: "timeline",
        description: "Current OpenRemote alarm context from compatible assets.",
        items: [
          { label: "Rows", value: String(rows.length) },
          { label: "Alarms", value: String(rows.filter((row) => row.values.alarm !== null && row.values.alarm !== undefined).length) },
        ],
      });
      return;
    }

    if (section === "map" && request.includeMap !== false) {
      sections.push({
        id: "route-map",
        title: "Route map",
        kind: "map",
        description: "Map-ready current location summary for compatible assets.",
        items: [
          { label: "Route-capable vehicles", value: String(rows.length) },
          { label: "Distance", value: `${snapshot.metrics.totalDistanceKm} km` },
        ],
      });
      return;
    }

    if (section === "raw" && request.includeRawData !== false) {
      sections.push({
        id: "raw-data",
        title: "Raw datapoints",
        kind: "raw",
        description: "Current asset telemetry cells included in the preview payload.",
        items: [
          { label: "Rows", value: String(rows.length) },
          { label: "Parameters", value: String(columns.length) },
          { label: "Datapoints", value: String(rows.length * columns.length) },
        ],
      });
    }
  });

  if (request.includeMap && !sections.some((section) => section.kind === "map")) {
    sections.push({
      id: "route-map",
      title: "Route map",
      kind: "map",
      items: [
        { label: "Route-capable vehicles", value: String(rows.length) },
        { label: "Distance", value: `${snapshot.metrics.totalDistanceKm} km` },
      ],
    });
  }

  if (request.includeRawData && !sections.some((section) => section.kind === "raw")) {
    sections.push({
      id: "raw-data",
      title: "Raw datapoints",
      kind: "raw",
      items: [
        { label: "Rows", value: String(rows.length) },
        { label: "Parameters", value: String(columns.length) },
        { label: "Datapoints", value: String(rows.length * columns.length) },
      ],
    });
  }

  return sections;
}

export function previewOpenRemoteReport(request: ReportGenerationRequest, assets: Asset[] | null | undefined): GeneratedReportPreview {
  const definitions = createOpenRemoteReportDefinitions();
  const definition = definitions.find((item) => item.id === request.definitionId);
  const selectedVehicles = resolveReportVehicleSelection(request.vehicleSelection, (assets ?? []).map(mapOpenRemoteAssetToVehicle));
  const compatibleVehicles = filterVehiclesByRequiredReportCapabilities(selectedVehicles, definition?.requiredCapabilities);
  const parameterIds = new Set(request.parameterIds);
  const requestedColumnIds = request.columnIds?.length ? request.columnIds : request.parameterIds;
  const parametersById = new Map(createOpenRemoteReportParameters().map((parameter) => [parameter.id, parameter]));
  const columns = requestedColumnIds
    .filter((parameterId) => parameterIds.has(parameterId))
    .map((parameterId) => parametersById.get(parameterId))
    .filter((parameter): parameter is ReportParameterDefinition => parameter !== undefined);
  const rows = compatibleVehicles.map<ReportPreviewRow>((vehicle) => ({
    vehicleId: vehicle.id,
    timestampIso: vehicle.lastUpdatedIso,
    values: Object.fromEntries(
      columns.map((column) => [
        column.id,
        vehicle.latestTelemetrySamples?.find((sample) => sample.signalId === column.id)?.value ?? null,
      ]),
    ),
  }));
  const snapshot = createOpenRemoteFleetReportSnapshot((assets ?? []).filter((asset) => compatibleVehicles.some((vehicle) => vehicle.id === asset.id)));

  return {
    request,
    generatedAtIso: new Date().toISOString(),
    columns,
    rows,
    summary: {
      vehicleCount: rows.length,
      parameterCount: columns.length,
      totalDistance: `${snapshot.metrics.totalDistanceKm} km`,
      maxSpeedKph: snapshot.metrics.maxSpeedKph,
      excludedVehicles: selectedVehicles.length - compatibleVehicles.length,
    },
    metadata: {
      title: definition?.name ?? request.definitionId,
      selectedVehiclesLabel: request.vehicleSelection.mode === "all" ? "All vehicles" : `${selectedVehicles.length} selected vehicles`,
      periodLabel: reportPeriodPreset(request.period),
      filters: [request.vehicleSelection.mode, request.period.preset ?? request.period.type],
      warnings:
        selectedVehicles.length > compatibleVehicles.length
      ? [`${selectedVehicles.length - compatibleVehicles.length} incompatible vehicles excluded from ${definition?.name ?? request.definitionId}.`]
          : [],
    },
    sections: createOpenRemotePreviewSections(
      definition,
      request,
      snapshot,
      rows,
      columns,
      selectedVehicles.length - compatibleVehicles.length,
    ),
  };
}
