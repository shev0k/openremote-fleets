import { FleetReportSnapshot } from "../../../domain/models/reports";
import { TelemetrySignalValue } from "../../../domain/models/telemetry";
import { Vehicle, VehicleStatus } from "../../../domain/models/vehicle";

export type GraphWidgetId =
  | "fleet-kpis"
  | "daily-activity"
  | "speed-trend"
  | "speed-distribution"
  | "vehicle-activity"
  | "fleet-status"
  | "alerts-by-vehicle"
  | "fuel-battery"
  | "tracker-health"
  | "telemetry-coverage"
  | "driver-coverage"
  | "engine-load"
  | "odometer-distance";

export type GraphWidgetCategory = "operations" | "safety" | "telemetry" | "assets" | "drivers";
export type GraphWidgetLayoutSize = "compact" | "medium" | "wide";
export type GraphDashboardLayoutMode = "packed" | "free";

export const GRAPH_DASHBOARD_COLUMN_COUNT = 12;

export interface GraphWidgetDefinition {
  id: GraphWidgetId;
  title: string;
  description: string;
  category: GraphWidgetCategory;
  size: GraphWidgetLayoutSize;
  sourceLabel: string;
}

export interface GraphWidgetLayoutItem {
  id: GraphWidgetId;
  size: GraphWidgetLayoutSize;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxW: number;
}

export interface StatusSummaryRow {
  id: VehicleStatus;
  label: string;
  count: number;
  percentage: number;
}

export interface TelemetryCoverageRow {
  signalId: string;
  label: string;
  sourceLabel: string;
  supportedVehicleCount: number;
  percentage: number;
}

export interface FuelBatteryRow {
  vehicleId: string;
  vehicleName: string;
  fuelLevel: number | null;
  batteryLevel: number | null;
  activeAlertCount: number;
}

export interface TrackerHealthRow {
  id: string;
  label: string;
  averageLabel: string;
  detail: string;
  tone: "normal" | "warning" | "critical";
}

export interface DriverCoverageSummary {
  assignedCount: number;
  unassignedCount: number;
  percentage: number;
  driverRows: Array<{
    vehicleId: string;
    vehicleName: string;
    driverName: string;
    driverIdentifier: string;
  }>;
}

export interface AlertVehicleRow {
  vehicleId: string;
  vehicleName: string;
  activeAlertCount: number;
  speedKph: number;
}

export interface EngineLoadRow {
  vehicleId: string;
  vehicleName: string;
  rpm: number;
  speedKph: number;
}

export interface OdometerDistanceRow {
  vehicleId: string;
  vehicleName: string;
  totalOdometerKm: number | null;
  tripOdometerKm: number | null;
}

export interface GraphDashboardSummary {
  vehicleCount: number;
  activeVehicleCount: number;
  alertVehicleCount: number;
  averageSpeedKph: number;
  averageFuelLevel: number | null;
  averageBatteryLevel: number | null;
  statusRows: StatusSummaryRow[];
  telemetryCoverageRows: TelemetryCoverageRow[];
  fuelBatteryRows: FuelBatteryRow[];
  trackerHealthRows: TrackerHealthRow[];
  driverCoverage: DriverCoverageSummary;
  alertRows: AlertVehicleRow[];
  engineRows: EngineLoadRow[];
  odometerRows: OdometerDistanceRow[];
}

const statusLabels: Record<VehicleStatus, string> = {
  moving: "Moving",
  idling: "Idling",
  parked: "Parked",
  stationary: "Stationary",
  alerting: "Alerting",
  offline: "Offline",
};

const valuableSignalIds = [
  "speed",
  "ignition",
  "movement",
  "alarm",
  "fuelLevel",
  "fuelUsedGps",
  "fuelRateGps",
  "batteryLevel",
  "batteryVoltage",
  "externalVoltage",
  "engineRpm",
  "gnssStatus",
  "gnssHdop",
  "gsmSignal",
  "totalOdometer",
  "tripOdometer",
  "iButton",
];

export const GRAPH_WIDGET_CATALOG: GraphWidgetDefinition[] = [
  {
    id: "fleet-kpis",
    title: "Fleet KPIs",
    description: "Max speed, trip duration, overspeed events, and total distance.",
    category: "operations",
    size: "wide",
    sourceLabel: "Reports snapshot",
  },
  {
    id: "daily-activity",
    title: "Daily Activity",
    description: "Trips and distance by day or period bucket.",
    category: "operations",
    size: "wide",
    sourceLabel: "Reports snapshot",
  },
  {
    id: "speed-trend",
    title: "Speed Trend",
    description: "Average and maximum speed over the selected period.",
    category: "operations",
    size: "wide",
    sourceLabel: "Teltonika speed",
  },
  {
    id: "speed-distribution",
    title: "Speed Distribution",
    description: "Share of vehicle samples by speed band.",
    category: "safety",
    size: "medium",
    sourceLabel: "Reports snapshot",
  },
  {
    id: "vehicle-activity",
    title: "Vehicle Activity",
    description: "Most active vehicles by distance, trips, and activity score.",
    category: "operations",
    size: "medium",
    sourceLabel: "Reports snapshot",
  },
  {
    id: "fleet-status",
    title: "Fleet Status",
    description: "Moving, idling, parked, stationary, alerting, and offline fleet mix.",
    category: "operations",
    size: "compact",
    sourceLabel: "OpenRemote asset state",
  },
  {
    id: "alerts-by-vehicle",
    title: "Alerts By Vehicle",
    description: "Vehicles with active alerts and current operating context.",
    category: "safety",
    size: "compact",
    sourceLabel: "OpenRemote alarms",
  },
  {
    id: "fuel-battery",
    title: "Fuel And Battery",
    description: "Low fuel and low tracker battery watchlist.",
    category: "telemetry",
    size: "medium",
    sourceLabel: "Teltonika fuel and battery",
  },
  {
    id: "tracker-health",
    title: "Tracker Health",
    description: "GSM, GNSS, external power, and satellite quality.",
    category: "assets",
    size: "medium",
    sourceLabel: "Teltonika diagnostics",
  },
  {
    id: "telemetry-coverage",
    title: "Telemetry Coverage",
    description: "Available tracker attributes across the selected fleet.",
    category: "telemetry",
    size: "medium",
    sourceLabel: "Teltonika attribute map",
  },
  {
    id: "driver-coverage",
    title: "Driver Coverage",
    description: "iButton or driver identifier coverage by vehicle.",
    category: "drivers",
    size: "compact",
    sourceLabel: "Teltonika iButton",
  },
  {
    id: "engine-load",
    title: "Engine Load",
    description: "Latest engine RPM and current speed by vehicle.",
    category: "telemetry",
    size: "compact",
    sourceLabel: "Teltonika engine RPM",
  },
  {
    id: "odometer-distance",
    title: "Odometer And Distance",
    description: "Latest total odometer and trip odometer readings.",
    category: "operations",
    size: "medium",
    sourceLabel: "Teltonika odometer",
  },
];

export const DEFAULT_GRAPH_WIDGET_IDS: GraphWidgetId[] = [
  "fleet-kpis",
  "daily-activity",
  "speed-trend",
  "fleet-status",
  "alerts-by-vehicle",
  "fuel-battery",
  "tracker-health",
  "telemetry-coverage",
  "vehicle-activity",
  "speed-distribution",
];

export interface GraphWidgetGridLayoutUpdate {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GraphWidgetGridDimensions {
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxW: number;
}

export interface GraphWidgetLayoutInputItem {
  id: GraphWidgetId;
  size: GraphWidgetLayoutSize;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

const defaultWidgetGridDimensions: Record<GraphWidgetLayoutSize, GraphWidgetGridDimensions> = {
  compact: { w: 3, h: 3, minW: 2, minH: 2, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
  medium: { w: 4, h: 4, minW: 3, minH: 3, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
  wide: { w: 6, h: 4, minW: 3, minH: 3, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
};

const kpiWidgetGridDimensions: Record<GraphWidgetLayoutSize, GraphWidgetGridDimensions> = {
  compact: { w: 3, h: 3, minW: 2, minH: 3, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
  medium: { w: 4, h: 4, minW: 3, minH: 4, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
  wide: { w: 6, h: 3, minW: 4, minH: 3, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
};

const fleetStatusWidgetGridDimensions: Record<GraphWidgetLayoutSize, GraphWidgetGridDimensions> = {
  compact: { w: 3, h: 3, minW: 2, minH: 3, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
  medium: { w: 4, h: 4, minW: 3, minH: 4, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
  wide: { w: 6, h: 4, minW: 3, minH: 4, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
};

const alertsByVehicleWidgetGridDimensions: Record<GraphWidgetLayoutSize, GraphWidgetGridDimensions> = {
  compact: { w: 3, h: 3, minW: 2, minH: 3, maxW: GRAPH_DASHBOARD_COLUMN_COUNT },
  medium: defaultWidgetGridDimensions.medium,
  wide: defaultWidgetGridDimensions.wide,
};

function defaultWidgetSize(widgetId: GraphWidgetId): GraphWidgetLayoutSize {
  return GRAPH_WIDGET_CATALOG.find((widget) => widget.id === widgetId)?.size ?? "medium";
}

export function getGraphWidgetGridDimensions(widgetId: GraphWidgetId, size: GraphWidgetLayoutSize): GraphWidgetGridDimensions {
  if (widgetId === "fleet-kpis") return kpiWidgetGridDimensions[size];
  if (widgetId === "fleet-status") return fleetStatusWidgetGridDimensions[size];
  if (widgetId === "alerts-by-vehicle") return alertsByVehicleWidgetGridDimensions[size];
  return defaultWidgetGridDimensions[size];
}

function widgetSizeForGridWidth(width: number): GraphWidgetLayoutSize {
  if (width <= 3) return "compact";
  if (width <= 4) return "medium";
  return "wide";
}

function withGraphWidgetGridConstraints(item: Omit<GraphWidgetLayoutItem, "minW" | "minH" | "maxW">): GraphWidgetLayoutItem {
  const dimensions = getGraphWidgetGridDimensions(item.id, item.size);
  const w = Math.max(dimensions.minW, Math.min(dimensions.maxW, item.w));
  const h = Math.max(dimensions.minH, item.h);
  return {
    ...item,
    x: Math.max(0, Math.min(GRAPH_DASHBOARD_COLUMN_COUNT - w, item.x)),
    y: Math.max(0, item.y),
    w,
    h,
    minW: dimensions.minW,
    minH: dimensions.minH,
    maxW: dimensions.maxW,
  };
}

function placeGraphWidgetLayout(items: Array<{ id: GraphWidgetId; size: GraphWidgetLayoutSize }>): GraphWidgetLayoutItem[] {
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  return items.map((item) => {
    const dimensions = getGraphWidgetGridDimensions(item.id, item.size);
    if (cursorX > 0 && cursorX + dimensions.w > GRAPH_DASHBOARD_COLUMN_COUNT) {
      cursorX = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }

    const placedItem = withGraphWidgetGridConstraints({
      id: item.id,
      size: item.size,
      x: cursorX,
      y: cursorY,
      w: dimensions.w,
      h: dimensions.h,
    });

    cursorX += dimensions.w;
    rowHeight = Math.max(rowHeight, dimensions.h);
    return placedItem;
  });
}

export function createGraphWidgetLayout(widgetIds: GraphWidgetId[]): GraphWidgetLayoutItem[] {
  return placeGraphWidgetLayout(widgetIds.map((id) => ({ id, size: defaultWidgetSize(id) })));
}

export const DEFAULT_GRAPH_WIDGET_LAYOUT: GraphWidgetLayoutItem[] = createGraphWidgetLayout(DEFAULT_GRAPH_WIDGET_IDS);

function isFiniteLayoutNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeGraphWidgetLayout(items: GraphWidgetLayoutInputItem[]): GraphWidgetLayoutItem[] {
  if (!items.length) return [];

  const hasExplicitGridPlacement = items.every(
    (item) =>
      isFiniteLayoutNumber(item.x) &&
      isFiniteLayoutNumber(item.y) &&
      isFiniteLayoutNumber(item.w) &&
      isFiniteLayoutNumber(item.h),
  );

  if (!hasExplicitGridPlacement) {
    return placeGraphWidgetLayout(items.map((item) => ({ id: item.id, size: item.size })));
  }

  return items.map((item) => {
    const gridWidth = item.w ?? getGraphWidgetGridDimensions(item.id, item.size).w;
    const size = widgetSizeForGridWidth(gridWidth);
    return withGraphWidgetGridConstraints({
      id: item.id,
      size,
      x: item.x ?? 0,
      y: item.y ?? 0,
      w: gridWidth,
      h: item.h ?? getGraphWidgetGridDimensions(item.id, size).h,
    });
  });
}

export function toggleGraphWidget(layout: GraphWidgetLayoutItem[], widgetId: GraphWidgetId): GraphWidgetLayoutItem[] {
  if (layout.some((item) => item.id === widgetId)) {
    return layout.filter((item) => item.id !== widgetId);
  }

  const size = defaultWidgetSize(widgetId);
  const dimensions = getGraphWidgetGridDimensions(widgetId, size);
  const bottomY = layout.reduce((bottom, item) => Math.max(bottom, item.y + item.h), 0);
  return [
    ...layout,
    withGraphWidgetGridConstraints({
      id: widgetId,
      size,
      x: 0,
      y: bottomY,
      w: dimensions.w,
      h: dimensions.h,
    }),
  ];
}

export function resizeGraphWidget(
  layout: GraphWidgetLayoutItem[],
  widgetId: GraphWidgetId,
  size: GraphWidgetLayoutSize,
): GraphWidgetLayoutItem[] {
  return layout.map((item) => {
    if (item.id !== widgetId) return item;
    const dimensions = getGraphWidgetGridDimensions(widgetId, size);
    return withGraphWidgetGridConstraints({
      ...item,
      size,
      x: Math.min(item.x, GRAPH_DASHBOARD_COLUMN_COUNT - dimensions.w),
      w: dimensions.w,
      h: dimensions.h,
    });
  });
}

export function moveGraphWidget(
  layout: GraphWidgetLayoutItem[],
  draggedWidgetId: GraphWidgetId,
  targetWidgetId: GraphWidgetId,
): GraphWidgetLayoutItem[] {
  if (draggedWidgetId === targetWidgetId) return layout;

  const draggedItem = layout.find((item) => item.id === draggedWidgetId);
  if (!draggedItem || !layout.some((item) => item.id === targetWidgetId)) return layout;

  const withoutDragged = layout.filter((item) => item.id !== draggedWidgetId);
  const targetIndex = withoutDragged.findIndex((item) => item.id === targetWidgetId);
  const reordered = [
    ...withoutDragged.slice(0, targetIndex),
    draggedItem,
    ...withoutDragged.slice(targetIndex),
  ];
  return placeGraphWidgetLayout(reordered.map((item) => ({ id: item.id, size: item.size })));
}

export function updateGraphWidgetGridLayout(
  layout: GraphWidgetLayoutItem[],
  updates: ReadonlyArray<GraphWidgetGridLayoutUpdate>,
): GraphWidgetLayoutItem[] {
  const updatesById = new Map(updates.map((item) => [item.i, item]));

  return layout.map((item) => {
    const update = updatesById.get(item.id);
    if (!update) return item;
    const size = widgetSizeForGridWidth(update.w);
    return withGraphWidgetGridConstraints({
      ...item,
      size,
      x: update.x,
      y: update.y,
      w: update.w,
      h: update.h,
    });
  });
}

export function packGraphWidgetLayout(layout: GraphWidgetLayoutItem[]): GraphWidgetLayoutItem[] {
  const ordered = [...layout].sort((left, right) => left.y - right.y || left.x - right.x);
  return placeGraphWidgetLayout(ordered.map((item) => ({ id: item.id, size: item.size })));
}

function getLatestSampleValue(vehicle: Vehicle, signalId: string): TelemetrySignalValue | null {
  const sample = vehicle.latestTelemetrySamples?.find((entry) => entry.signalId === signalId);
  if (sample) return sample.value;
  const signal = vehicle.availableTelemetrySignals?.find((entry) => entry.id === signalId);
  const attributeName = signal?.attributeName ?? signalId;
  const attributeValue = vehicle.teltonika?.attributes[attributeName]?.value;
  if (typeof attributeValue === "string" || typeof attributeValue === "number" || typeof attributeValue === "boolean") {
    return attributeValue;
  }
  return null;
}

function getLatestNumber(vehicle: Vehicle, signalId: string): number | null {
  const value = getLatestSampleValue(vehicle, signalId);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function signalSourceLabel(vehicle: Vehicle, signalId: string): string {
  const definition = vehicle.availableTelemetrySignals?.find((signal) => signal.id === signalId);
  if (definition?.teltonikaAvlId) return `Teltonika ${definition.teltonikaAvlId}`;
  if (definition?.source === "openRemote") return "OpenRemote";
  if (definition?.source === "derived") return "Derived";
  return "Teltonika";
}

function signalDisplayName(vehicle: Vehicle, signalId: string): string {
  return vehicle.availableTelemetrySignals?.find((signal) => signal.id === signalId)?.displayName ?? signalId;
}

function vehicleSupportsSignal(vehicle: Vehicle, signalId: string): boolean {
  const definition = vehicle.availableTelemetrySignals?.find((signal) => signal.id === signalId);
  const attributeName = definition?.attributeName ?? signalId;
  return Boolean(
    vehicle.latestTelemetrySamples?.some((sample) => sample.signalId === signalId) ||
      vehicle.teltonika?.attributes[attributeName],
  );
}

function average(numbers: number[]): number | null {
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function averageSignal(vehicles: Vehicle[], signalId: string): number | null {
  return average(vehicles.map((vehicle) => getLatestNumber(vehicle, signalId)).filter((value): value is number => value !== null));
}

function percentage(count: number, total: number): number {
  return total ? Math.round((count / total) * 100) : 0;
}

function createTrackerHealthRows(vehicles: Vehicle[]): TrackerHealthRow[] {
  const gsmSignal = averageSignal(vehicles, "gsmSignal");
  const gnssHdop = averageSignal(vehicles, "gnssHdop");
  const externalVoltage = averageSignal(vehicles, "externalVoltage");
  const satellites = averageSignal(vehicles, "satellites");

  return [
    {
      id: "gsmSignal",
      label: "GSM Signal",
      averageLabel: gsmSignal === null ? "--" : `${round(gsmSignal, 1).toFixed(1)} / 5`,
      detail: "Signal strength from Teltonika AVL 21.",
      tone: gsmSignal !== null && gsmSignal < 2.5 ? "warning" : "normal",
    },
    {
      id: "gnssHdop",
      label: "GNSS HDOP",
      averageLabel: gnssHdop === null ? "--" : round(gnssHdop, 1).toFixed(1),
      detail: "Lower is better. Uses Teltonika AVL 182 when present.",
      tone: gnssHdop !== null && gnssHdop > 2 ? "warning" : "normal",
    },
    {
      id: "externalVoltage",
      label: "External Voltage",
      averageLabel: externalVoltage === null ? "--" : `${round(externalVoltage, 1).toFixed(1)} V`,
      detail: "Tracker power input from Teltonika AVL 66.",
      tone: externalVoltage !== null && externalVoltage < 12 ? "warning" : "normal",
    },
    {
      id: "satellites",
      label: "Satellites",
      averageLabel: satellites === null ? "--" : round(satellites, 1).toFixed(1),
      detail: "GNSS satellite count from the tracker frame.",
      tone: satellites !== null && satellites < 8 ? "warning" : "normal",
    },
  ];
}

function createTelemetryCoverageRows(vehicles: Vehicle[]): TelemetryCoverageRow[] {
  const referenceVehicle = vehicles.find((vehicle) => vehicle.availableTelemetrySignals?.length) ?? vehicles[0];

  return valuableSignalIds.map((signalId) => {
    const supportedVehicleCount = vehicles.filter((vehicle) => vehicleSupportsSignal(vehicle, signalId)).length;
    return {
      signalId,
      label: referenceVehicle ? signalDisplayName(referenceVehicle, signalId) : signalId,
      sourceLabel: referenceVehicle ? signalSourceLabel(referenceVehicle, signalId) : "Teltonika",
      supportedVehicleCount,
      percentage: percentage(supportedVehicleCount, vehicles.length),
    };
  });
}

function createDriverCoverage(vehicles: Vehicle[]): DriverCoverageSummary {
  const driverRows = vehicles
    .filter((vehicle) => vehicle.driverIdentifier || (vehicle.driverName && vehicle.driverName !== "Unassigned"))
    .map((vehicle) => ({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      driverName: vehicle.driverName,
      driverIdentifier: vehicle.driverIdentifier ?? "--",
    }));

  return {
    assignedCount: driverRows.length,
    unassignedCount: Math.max(0, vehicles.length - driverRows.length),
    percentage: percentage(driverRows.length, vehicles.length),
    driverRows,
  };
}

export function createGraphDashboardSummary(
  snapshot: FleetReportSnapshot,
  vehicles: Vehicle[],
): GraphDashboardSummary {
  const vehicleCount = vehicles.length;
  const statusRows = (["moving", "idling", "parked", "stationary", "alerting", "offline"] as VehicleStatus[]).map((status) => {
    const count = vehicles.filter((vehicle) => vehicle.status === status).length;
    return {
      id: status,
      label: statusLabels[status],
      count,
      percentage: percentage(count, vehicleCount),
    };
  });
  const averageSpeedKph = snapshot.dailySpeed.length
    ? Math.round(snapshot.dailySpeed.reduce((sum, point) => sum + point.averageSpeedKph, 0) / snapshot.dailySpeed.length)
    : Math.round(average(vehicles.map((vehicle) => vehicle.speedKph)) ?? 0);
  const averageFuelLevel = average(vehicles.map((vehicle) => vehicle.fuelLevelPercent).filter((value): value is number => typeof value === "number"));
  const averageBatteryLevel = average(vehicles.map((vehicle) => vehicle.batteryLevelPercent).filter((value): value is number => typeof value === "number"));

  return {
    vehicleCount,
    activeVehicleCount: vehicles.filter((vehicle) => vehicle.status !== "offline").length,
    alertVehicleCount: vehicles.filter((vehicle) => vehicle.activeAlertCount > 0).length,
    averageSpeedKph,
    averageFuelLevel: averageFuelLevel === null ? null : Math.round(averageFuelLevel),
    averageBatteryLevel: averageBatteryLevel === null ? null : Math.round(averageBatteryLevel),
    statusRows,
    telemetryCoverageRows: createTelemetryCoverageRows(vehicles),
    fuelBatteryRows: vehicles
      .map((vehicle) => ({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        fuelLevel: vehicle.fuelLevelPercent ?? getLatestNumber(vehicle, "fuelLevel"),
        batteryLevel: vehicle.batteryLevelPercent ?? getLatestNumber(vehicle, "batteryLevel"),
        activeAlertCount: vehicle.activeAlertCount,
      }))
      .sort((left, right) => (left.fuelLevel ?? 101) - (right.fuelLevel ?? 101)),
    trackerHealthRows: createTrackerHealthRows(vehicles),
    driverCoverage: createDriverCoverage(vehicles),
    alertRows: vehicles
      .filter((vehicle) => vehicle.activeAlertCount > 0)
      .map((vehicle) => ({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        activeAlertCount: vehicle.activeAlertCount,
        speedKph: vehicle.speedKph,
      }))
      .sort((left, right) => right.activeAlertCount - left.activeAlertCount),
    engineRows: vehicles
      .flatMap((vehicle) => {
        const rpm = getLatestNumber(vehicle, "engineRpm");
        return rpm === null
          ? []
          : [{
              vehicleId: vehicle.id,
              vehicleName: vehicle.name,
              rpm,
              speedKph: vehicle.speedKph,
            }];
      })
      .sort((left, right) => right.rpm - left.rpm),
    odometerRows: vehicles
      .flatMap((vehicle) => {
        const totalOdometer = getLatestNumber(vehicle, "totalOdometer");
        const tripOdometer = getLatestNumber(vehicle, "tripOdometer");
        return totalOdometer === null && tripOdometer === null
          ? []
          : [{
              vehicleId: vehicle.id,
              vehicleName: vehicle.name,
              totalOdometerKm: totalOdometer === null ? null : Math.round(totalOdometer / 1000),
              tripOdometerKm: tripOdometer === null ? null : Math.round(tripOdometer / 1000),
            }];
      })
      .sort((left, right) => (right.totalOdometerKm ?? -1) - (left.totalOdometerKm ?? -1)),
  };
}
