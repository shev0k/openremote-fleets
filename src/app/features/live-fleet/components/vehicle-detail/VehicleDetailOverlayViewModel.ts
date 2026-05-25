import type { LucideIcon } from "lucide-react";
import { Activity, Clock3, Fuel, Gauge, MapPinned, Route } from "lucide-react";
import type { AlertState, FleetAlert } from "../../../../../domain/models/alerts";
import type { TeltonikaAttributeSample } from "../../../../../domain/models/teltonika";
import type { Vehicle, VehicleDetail } from "../../../../../domain/models/vehicle";
import type { VehicleDisplayStatusMeta } from "../../../../components/map/vehicleDisplayStatus";
import { getVehicleDisplayStatusMeta } from "../../../../components/map/vehicleDisplayStatus";
import { buildLiveTelemetryCardModel, type LiveTelemetryMetric } from "../../telemetryCardViewModel";
import { formatVehicleIdentitySummary } from "../vehicleIdentityDisplay";

export interface VehicleDetailMetric {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface TrackerIdentityItem {
  label: string;
  value: string;
}

export interface TrackerAttributeViewModel {
  attributeName: string;
  avlId: string;
  value: string;
}

export interface VehicleOperationalContextItem {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface VehicleDetailOverlayViewModelInput {
  vehicle: Vehicle;
  detail: VehicleDetail | null;
  activeAlerts: FleetAlert[];
  googleMapsApiKey?: string;
  formatTime: (value: Date | string | number, timeZone?: string) => string;
}

export interface VehicleDetailOverlayViewModel {
  title: string;
  subtitle: string;
  statusMeta: VehicleDisplayStatusMeta;
  metrics: LiveTelemetryMetric[];
  detailMetrics: VehicleDetailMetric[];
  trackerIdentityItems: TrackerIdentityItem[];
  trackerAttributes: TrackerAttributeViewModel[];
  operationalContextItems: VehicleOperationalContextItem[];
  alerts: FleetAlert[];
  canShowStreetView: boolean;
}

export function formatVehicleOverlayDateTime(
  value: string,
  formatTime: (value: Date | string | number, timeZone?: string) => string,
) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "--";
  }

  const dateLabel = date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });

  return `${dateLabel}, ${formatTime(date)}`;
}

export function formatVehicleOverlayMinutes(value: number | undefined) {
  if (value === undefined) {
    return "--";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatTeltonikaValue(value: unknown, unit?: string) {
  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (typeof value === "number") {
    return `${Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
  }

  if (value && typeof value === "object" && "latitude" in value && "longitude" in value) {
    const location = value as { latitude: number; longitude: number };
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }

  return value ? String(value) : "--";
}

function getTimeValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const ALERT_SEVERITY_PRIORITY: Record<FleetAlert["severity"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function sortVisibleVehicleAlerts(alerts: FleetAlert[]): FleetAlert[] {
  return alerts
    .filter((alert) => alert.state !== "Resolved")
    .sort((left, right) => {
      const severityDifference = ALERT_SEVERITY_PRIORITY[right.severity] - ALERT_SEVERITY_PRIORITY[left.severity];
      return severityDifference || getTimeValue(right.timeIso) - getTimeValue(left.timeIso);
    });
}

const TRACKER_ATTRIBUTE_NAMES = [
  "speed",
  "ignition",
  "movement",
  "gsmSignal",
  "externalVoltage",
  "batteryLevel",
  "totalOdometer",
  "fuelLevel",
];

function buildTrackerAttributes(vehicle: Vehicle): TrackerAttributeViewModel[] {
  return TRACKER_ATTRIBUTE_NAMES.map((attributeName) => vehicle.teltonika?.attributes[attributeName])
    .filter((attribute): attribute is TeltonikaAttributeSample => Boolean(attribute))
    .map((attribute) => ({
      attributeName: attribute.attributeName,
      avlId: attribute.avlId,
      value: formatTeltonikaValue(attribute.value, attribute.unit),
    }));
}

function buildTrackerIdentityItems(vehicle: Vehicle): TrackerIdentityItem[] {
  return [
    { label: "IMEI", value: vehicle.teltonika?.imei ?? vehicle.trackerId },
    { label: "Driver ID", value: vehicle.driverIdentifier ?? "" },
  ].filter((item): item is TrackerIdentityItem => Boolean(item.value));
}

function buildDetailMetrics(
  vehicle: Vehicle,
  detail: VehicleDetail | null,
  formatTime: (value: Date | string | number, timeZone?: string) => string,
): VehicleDetailMetric[] {
  return [
    {
      id: "lastCommunication",
      label: "Last comms",
      value: formatVehicleOverlayDateTime(detail?.lastCommunicationIso ?? vehicle.lastUpdatedIso, formatTime),
      icon: Clock3,
    },
    {
      id: "gpsAccuracy",
      label: "GPS accuracy",
      value: detail ? `${detail.gpsAccuracyMeters} m` : "--",
      icon: MapPinned,
    },
    {
      id: "todayMileage",
      label: "Mileage today",
      value: detail ? `${detail.todayMileageKm.toFixed(1)} km` : "--",
      icon: Route,
    },
    {
      id: "odometer",
      label: "Odometer",
      value: detail ? `${detail.odometerKm.toLocaleString()} km` : "--",
      icon: Gauge,
    },
    {
      id: "fuelInTank",
      label: "Fuel in tank",
      value: detail ? `${detail.fuelInTankLiters.toFixed(0)} L` : "--",
      icon: Fuel,
    },
    {
      id: "averageFuelUse",
      label: "Avg fuel use",
      value: detail ? `${detail.averageFuelConsumptionLitersPer100Km.toFixed(1)} L/100km` : "--",
      icon: Activity,
    },
  ];
}

function formatOperationalContextNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function buildOperationalContextItems(vehicle: Vehicle, detail: VehicleDetail | null): VehicleOperationalContextItem[] {
  const fuelLevel = formatOperationalContextNumber(vehicle.fuelLevelPercent);

  return [
    {
      id: "currentSpeed",
      label: "Current speed",
      value: `${formatOperationalContextNumber(vehicle.speedKph)} km/h`,
      icon: Gauge,
    },
    {
      id: "fuelLevel",
      label: "Fuel level",
      value: fuelLevel === "--" ? "--" : `${fuelLevel}%`,
      icon: Fuel,
    },
    {
      id: "stationary",
      label: "Stationary",
      value: detail ? formatVehicleOverlayMinutes(detail.stoppedDurationMinutes) : "--",
      icon: Clock3,
    },
    {
      id: "alerts",
      label: "Alerts",
      value: `${vehicle.activeAlertCount}`,
      icon: Activity,
    },
  ];
}

const METRIC_DISPLAY_ORDER = ["speed", "fuelLevel", "batteryLevel", "ignition", "movement"];

function buildOverlayMetrics(vehicle: Vehicle, detail: VehicleDetail | null): LiveTelemetryMetric[] {
  const telemetryModel = buildLiveTelemetryCardModel(vehicle, detail);
  const metricsById = new Map(
    [...telemetryModel.primaryMetrics, ...telemetryModel.secondaryMetrics].map((metric) => [metric.id, metric]),
  );

  return METRIC_DISPLAY_ORDER.map((metricId) => metricsById.get(metricId)).filter(
    (metric): metric is LiveTelemetryMetric => Boolean(metric),
  );
}

export function buildVehicleDetailOverlayViewModel({
  vehicle,
  detail,
  activeAlerts,
  googleMapsApiKey,
  formatTime,
}: VehicleDetailOverlayViewModelInput): VehicleDetailOverlayViewModel {
  return {
    title: vehicle.name,
    subtitle: formatVehicleIdentitySummary(vehicle, { fallback: vehicle.trackerId }),
    statusMeta: getVehicleDisplayStatusMeta(vehicle),
    metrics: buildOverlayMetrics(vehicle, detail),
    detailMetrics: buildDetailMetrics(vehicle, detail, formatTime),
    trackerIdentityItems: buildTrackerIdentityItems(vehicle),
    trackerAttributes: buildTrackerAttributes(vehicle),
    operationalContextItems: buildOperationalContextItems(vehicle, detail),
    alerts: sortVisibleVehicleAlerts(activeAlerts),
    canShowStreetView: Boolean(googleMapsApiKey?.trim() && (vehicle.hasLocation ?? true)),
  };
}

export type { AlertState };
