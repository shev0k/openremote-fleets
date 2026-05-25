import {
  FleetReportSnapshot,
  ReportDefinition,
  ReportGenerationRequest,
  ReportParameterDefinition,
  ReportPreviewChartPoint,
  ReportPreviewRow,
  ReportPreviewSection,
} from "../../../domain/models/reports";
import { TelemetryEventValue } from "../../../domain/models/telemetry";
import {
  averageReportValues,
  formatReportNumber,
  reportEventValue,
  reportRowNumber,
} from "./mockReportPreviewUtils";

export function createReportSummaryItems(
  snapshot: FleetReportSnapshot,
  rows: ReportPreviewRow[],
  request: ReportGenerationRequest,
  excludedVehicleCount: number,
): ReportPreviewSection["items"] {
  const totalTrips = snapshot.dailyTrips.reduce((sum, point) => sum + point.trips, 0);
  const activeVehicles = rows.filter((row) => row.values.movement === true || row.values.ignition === true || (reportRowNumber(row, "speed") ?? 0) > 0).length;
  const alarmCount = rows.filter((row) => {
    const alarm = reportEventValue(row.values.alarm);
    return alarm && alarm.state !== "clear";
  }).length;
  const averageSpeed = averageReportValues(rows.map((row) => reportRowNumber(row, "speed"))) ?? averageReportValues(snapshot.dailySpeed.map((point) => point.averageSpeedKph)) ?? 0;
  const averageFuel = request.parameterIds.includes("fuelLevel") ? averageReportValues(rows.map((row) => reportRowNumber(row, "fuelLevel"))) : null;
  const averageGnssHdop = request.parameterIds.includes("gnssHdop") ? averageReportValues(rows.map((row) => reportRowNumber(row, "gnssHdop"))) : null;
  const averageGsmSignal = request.parameterIds.includes("gsmSignal") ? averageReportValues(rows.map((row) => reportRowNumber(row, "gsmSignal"))) : null;
  const items = [
    {
      label: "Total distance",
      value: `${formatReportNumber(snapshot.metrics.totalDistanceKm)} km`,
      detail: "Distance covered by compatible vehicles in this report period.",
    },
    {
      label: "Trips",
      value: formatReportNumber(totalTrips),
      detail: "Generated from mock trip history for the selected date period.",
    },
    {
      label: "Active vehicles",
      value: `${activeVehicles} of ${rows.length}`,
      detail: "Vehicles moving, reporting speed, or with ignition on.",
    },
    {
      label: "Alarms",
      value: formatReportNumber(alarmCount),
      detail: "Active warning or critical event states in the report sample.",
    },
    {
      label: "Average speed",
      value: `${formatReportNumber(averageSpeed)} km/h`,
      detail: "Average of compatible speed samples.",
    },
    {
      label: "Max speed",
      value: `${formatReportNumber(snapshot.metrics.maxSpeedKph)} km/h`,
      detail: "Highest speed observed in the report period.",
    },
  ];

  if (averageFuel !== null) {
    items.push({
      label: "Average fuel",
      value: `${formatReportNumber(averageFuel)} %`,
      detail: "Average fuel level for vehicles exposing Teltonika fuel data.",
    });
  }

  if (averageGnssHdop !== null) {
    items.push({
      label: "GNSS HDOP",
      value: formatReportNumber(averageGnssHdop, 1),
      detail: "Lower values indicate stronger positioning quality.",
    });
  }

  if (averageGsmSignal !== null) {
    items.push({
      label: "GSM signal",
      value: `${formatReportNumber(averageGsmSignal, 1)} / 5`,
      detail: "Average tracker cellular signal quality.",
    });
  }

  if (excludedVehicleCount > 0) {
    items.push({
      label: "Excluded",
      value: formatReportNumber(excludedVehicleCount),
      detail: "Selected vehicles missing the required report capabilities.",
    });
  }

  return items;
}

function createChartPoint(label: string, value: number, unit?: string): ReportPreviewChartPoint {
  return { label, value, unit };
}

function reportChartTitle(chartId: string): string {
  const titles: Record<string, string> = {
    "activity-by-vehicle": "Activity by vehicle",
    "alarm-severity": "Alarm severity",
    "alarm-timeline": "Alarm timeline",
    "distance-by-day": "Distance by day",
    "driver-activity": "Driver activity",
    "driver-trip-count": "Driver trip count",
    "fuel-level-history": "Fuel level history",
    "fuel-rate-by-vehicle": "Fuel rate by vehicle",
    "gnss-hdop": "GNSS HDOP",
    "idle-time-by-vehicle": "Idling time by vehicle",
    "min-max-band": "Min / max band",
    "severity-distribution": "Severity distribution",
    "signal-history": "Signal history",
    "signal-quality": "Signal quality",
    "speed-profile": "Speed profile",
    "stops-by-day": "Stops by day",
    "trip-count": "Trip count",
    "voltage-trend": "Voltage trend",
  };

  return titles[chartId] ?? chartId.replace(/-/g, " ");
}

function createAlarmSeverityPoints(rows: ReportPreviewRow[]): ReportPreviewChartPoint[] {
  const counts = new Map<string, number>([
    ["clear", 0],
    ["warning", 0],
    ["critical", 0],
  ]);

  rows.forEach((row) => {
    const alarm = reportEventValue(row.values.alarm);
    if (!alarm) return;
    const key = alarm.state === "clear" ? "clear" : alarm.severity ?? "warning";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([label, value]) => ({
    label,
    value,
    tone: label === "critical" ? "critical" : label === "warning" ? "warning" : "normal",
  }));
}

export function createReportChartSection(
  chartId: string,
  snapshot: FleetReportSnapshot,
  rows: ReportPreviewRow[],
  columns: ReportParameterDefinition[],
): ReportPreviewSection {
  let points: ReportPreviewChartPoint[] = [];
  let unit: string | undefined;

  if (chartId === "distance-by-day") {
    unit = "km";
    points = snapshot.dailyTrips.map((point) => createChartPoint(point.dayLabel, point.distanceKm, unit));
  } else if (chartId === "activity-by-vehicle" || chartId === "driver-activity" || chartId === "driver-trip-count" || chartId === "trip-count") {
    unit = "trips";
    points = snapshot.mostActiveVehicles.map((point) => createChartPoint(point.vehicleId, point.tripCount, unit));
  } else if (chartId === "speed-profile" || chartId === "signal-history") {
    unit = "km/h";
    points = snapshot.dailySpeed.map((point) => ({
      label: point.dayLabel,
      value: point.averageSpeedKph,
      secondaryValue: point.maxSpeedKph,
      unit,
    }));
  } else if (chartId === "min-max-band") {
    unit = "km/h";
    points = snapshot.dailySpeed.map((point) => createChartPoint(point.dayLabel, point.maxSpeedKph, unit));
  } else if (chartId === "severity-distribution" || chartId === "alarm-severity" || chartId === "alarm-timeline") {
    points = createAlarmSeverityPoints(rows);
  } else if (chartId === "fuel-level-history") {
    unit = "%";
    points = rows
      .map((row) => {
        const value = reportRowNumber(row, "fuelLevel");
        return value === null ? null : createChartPoint(row.vehicleId.replace("veh-", ""), value, unit);
      })
      .filter((point): point is ReportPreviewChartPoint => point !== null);
  } else if (chartId === "fuel-rate-by-vehicle") {
    unit = "L/100km";
    points = rows
      .map((row) => {
        const value = reportRowNumber(row, "fuelRateGps");
        return value === null ? null : createChartPoint(row.vehicleId.replace("veh-", ""), value, unit);
      })
      .filter((point): point is ReportPreviewChartPoint => point !== null);
  } else if (chartId === "signal-quality") {
    unit = "/5";
    points = rows
      .map((row) => {
        const value = reportRowNumber(row, "gsmSignal");
        return value === null ? null : createChartPoint(row.vehicleId.replace("veh-", ""), value, unit);
      })
      .filter((point): point is ReportPreviewChartPoint => point !== null);
  } else if (chartId === "voltage-trend") {
    unit = "V";
    points = rows
      .map((row) => {
        const value = reportRowNumber(row, "externalVoltage") ?? reportRowNumber(row, "batteryVoltage");
        return value === null ? null : createChartPoint(row.vehicleId.replace("veh-", ""), value, unit);
      })
      .filter((point): point is ReportPreviewChartPoint => point !== null);
  } else if (chartId === "gnss-hdop") {
    points = rows
      .map((row) => {
        const value = reportRowNumber(row, "gnssHdop");
        return value === null ? null : createChartPoint(row.vehicleId.replace("veh-", ""), value);
      })
      .filter((point): point is ReportPreviewChartPoint => point !== null);
  } else if (chartId === "idle-time-by-vehicle") {
    unit = "min";
    points = rows.map((row, index) => createChartPoint(row.vehicleId.replace("veh-", ""), row.values.movement === false ? 38 : 6 + index * 4, unit));
  } else if (chartId === "stops-by-day") {
    unit = "stops";
    points = snapshot.dailyTrips.map((point) => createChartPoint(point.dayLabel, Math.max(1, Math.round(point.trips * 0.45)), unit));
  }

  if (!points.length) {
    const numericColumn = columns.find((column) => rows.some((row) => reportRowNumber(row, column.id) !== null));
    unit = numericColumn?.unit;
    points = numericColumn
      ? rows
          .map((row) => {
            const value = reportRowNumber(row, numericColumn.id);
            return value === null ? null : createChartPoint(row.vehicleId.replace("veh-", ""), value, unit);
          })
          .filter((point): point is ReportPreviewChartPoint => point !== null)
      : [];
  }

  return {
    id: chartId,
    title: reportChartTitle(chartId),
    kind: "chart",
    description: "Mock chart generated from compatible vehicle telemetry and Teltonika-aligned parameters.",
    chart: {
      type: chartId.includes("distribution") || chartId.includes("severity") ? "distribution" : "bar",
      unit,
      points,
    },
  };
}

function createTimelineSection(rows: ReportPreviewRow[]): ReportPreviewSection {
  const activeEvents = rows
    .map((row) => reportEventValue(row.values.alarm))
    .filter((alarm): alarm is TelemetryEventValue => Boolean(alarm && alarm.state !== "clear"));

  return {
    id: "event-timeline",
    title: "Event timeline",
    kind: "timeline",
    description: "Operational events grouped from current mock alarm states.",
    items: [
      { label: "Active events", value: formatReportNumber(activeEvents.length), detail: "Warning or critical event states." },
      { label: "Acknowledged", value: formatReportNumber(activeEvents.filter((event) => event.state === "acknowledged").length), detail: "Events marked as acknowledged." },
      { label: "Critical", value: formatReportNumber(activeEvents.filter((event) => event.severity === "critical").length), detail: "High-priority tracker or vehicle alarms." },
    ],
  };
}

function createMapSection(snapshot: FleetReportSnapshot, rows: ReportPreviewRow[]): ReportPreviewSection {
  return {
    id: "route-map",
    title: "Route map",
    kind: "map",
    description: "Map-ready route summary based on selected vehicles and trip-capable telemetry.",
    items: [
      { label: "Route-capable vehicles", value: formatReportNumber(rows.length), detail: "Vehicles exposing location, movement, and speed." },
      { label: "Distance", value: `${formatReportNumber(snapshot.metrics.totalDistanceKm)} km`, detail: "Total distance available for route context." },
    ],
  };
}

function createRawSection(rows: ReportPreviewRow[], columns: ReportParameterDefinition[]): ReportPreviewSection {
  return {
    id: "raw-data",
    title: "Raw datapoints",
    kind: "raw",
    description: "Export-oriented view of the sampled telemetry payload.",
    items: [
      { label: "Rows", value: formatReportNumber(rows.length), detail: "Rows included in the report preview table." },
      { label: "Parameters", value: formatReportNumber(columns.length), detail: "Selected Teltonika/OpenRemote attributes." },
      { label: "Datapoints", value: formatReportNumber(rows.length * columns.length), detail: "Estimated cell-level datapoints in this preview." },
    ],
  };
}

export function createReportPreviewSections(
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
        description: "KPI summary for the selected report period and compatible vehicles.",
        items: createReportSummaryItems(snapshot, rows, request, excludedVehicleCount),
      });
      return;
    }

    if (section === "charts" && request.includeCharts !== false) {
      const chartIds = request.chartIds?.length
        ? request.chartIds
        : definition?.defaultChartIds?.length
          ? definition.defaultChartIds
          : definition?.availableCharts ?? [];
      chartIds.forEach((chartId) => sections.push(createReportChartSection(chartId, snapshot, rows, columns)));
      return;
    }

    if (section === "timeline") {
      sections.push(createTimelineSection(rows));
      return;
    }

    if (section === "map" && request.includeMap !== false) {
      sections.push(createMapSection(snapshot, rows));
      return;
    }

    if (section === "raw" && request.includeRawData !== false) {
      sections.push(createRawSection(rows, columns));
    }
  });

  if (request.includeMap && !sections.some((section) => section.kind === "map")) {
    sections.push(createMapSection(snapshot, rows));
  }

  if (request.includeRawData && !sections.some((section) => section.kind === "raw")) {
    sections.push(createRawSection(rows, columns));
  }

  return sections;
}
