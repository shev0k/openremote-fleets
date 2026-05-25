import {
  DEFAULT_APP_PREFERENCES,
  formatTimeByPreference,
  type AppTimeFormat,
} from "../../../domain/models/preferences";
import { Vehicle } from "../../../domain/models/vehicle";
import { TeltonikaAttributeValue } from "../../../domain/models/teltonika";
import { getVehicleDisplayStatusMeta, type VehicleDisplayStatus } from "../../components/map/vehicleDisplayStatus";

type WallDisplayTone = "brand" | "info" | "warning" | "danger" | "muted";

export interface WallDisplayCard {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: WallDisplayTone;
}

export interface WallDisplayTimelineItem {
  id: string;
  vehicleName: string;
  plate: string;
  statusId: VehicleDisplayStatus;
  statusLabel: string;
  statusBadgeClassName: string;
  statusColorClassName: string;
  detail: string;
  timeLabel: string;
  tone: WallDisplayTone;
}

export interface WallDisplayViewModel {
  generatedAtLabel: string;
  fleet: {
    totalVehicles: number;
    connectedVehicles: number;
    offlineVehicles: number;
    movingVehicles: number;
    idlingVehicles: number;
    parkedVehicles: number;
    stationaryVehicles: number;
    activeAlarmCount: number;
    occupancyPercent: number;
  };
  metricCards: WallDisplayCard[];
  telemetryCards: WallDisplayCard[];
  timelineItems: WallDisplayTimelineItem[];
}

function getNumberAttribute(vehicle: Vehicle, attributeName: string): number | null {
  const value = getAttributeValue(vehicle, attributeName);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getAttributeValue(vehicle: Vehicle, attributeName: string): TeltonikaAttributeValue | null {
  return vehicle.teltonika?.attributes[attributeName]?.value ?? null;
}

function hasAttributeValue(vehicle: Vehicle, attributeName: string): boolean {
  const value = getAttributeValue(vehicle, attributeName);
  return value !== null && value !== "";
}

function average(values: Array<number | null | undefined>): number | null {
  const numericValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function formatNumber(value: number | null, digits = 0): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatTimeAgo(timestampIso: string, now: Date): string {
  const timestamp = new Date(timestampIso).valueOf();
  if (!Number.isFinite(timestamp)) {
    return "--";
  }

  const diffMinutes = Math.max(0, Math.round((now.valueOf() - timestamp) / 60000));
  if (diffMinutes < 1) {
    return "now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
}

function isFresh(timestampIso: string, now: Date): boolean {
  const timestamp = new Date(timestampIso).valueOf();
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const diffMinutes = (now.valueOf() - timestamp) / 60000;
  return diffMinutes >= 0 && diffMinutes <= 5;
}

function getStatusPriority(vehicle: Vehicle): number {
  const statusId = getVehicleDisplayStatusMeta(vehicle).id;
  if (statusId === "alerting") return 0;
  if (statusId === "offline") return 1;
  if (statusId === "idling") return 2;
  if (statusId === "parked") return 3;
  if (statusId === "stationary") return 4;
  return 5;
}

function getTimelineTone(statusId: VehicleDisplayStatus): WallDisplayTone {
  if (statusId === "alerting") return "danger";
  if (statusId === "offline") return "muted";
  if (statusId === "idling") return "warning";
  if (statusId === "parked" || statusId === "stationary") return "info";
  return "brand";
}

export function buildWallDisplayViewModel(
  vehicles: Vehicle[],
  now = new Date(),
  options: { timeFormat?: AppTimeFormat } = {},
): WallDisplayViewModel {
  const totalVehicles = vehicles.length;
  const connectedVehicles = vehicles.filter((vehicle) => vehicle.status !== "offline").length;
  const offlineVehicles = totalVehicles - connectedVehicles;
  const movingVehicles = vehicles.filter((vehicle) => vehicle.status === "moving").length;
  const idlingVehicles = vehicles.filter((vehicle) => vehicle.status === "idling").length;
  const parkedVehicles = vehicles.filter((vehicle) => vehicle.status === "parked").length;
  const stationaryVehicles = vehicles.filter((vehicle) => vehicle.status === "stationary").length;
  const activeAlarmCount = vehicles.reduce((total, vehicle) => total + vehicle.activeAlertCount, 0);
  const occupancyPercent = totalVehicles ? Math.round((connectedVehicles / totalVehicles) * 100) : 0;

  const totalTripOdometerMeters = sum(vehicles.map((vehicle) => getNumberAttribute(vehicle, "tripOdometer")));
  const totalFleetOdometerMeters = sum(vehicles.map((vehicle) => getNumberAttribute(vehicle, "totalOdometer")));
  const averageConsumption = average(vehicles.map((vehicle) => getNumberAttribute(vehicle, "fuelRateGps")));
  const averageFuel = average(vehicles.map((vehicle) => vehicle.fuelLevelPercent ?? getNumberAttribute(vehicle, "fuelLevel")));
  const averageBattery = average(vehicles.map((vehicle) => vehicle.batteryLevelPercent ?? getNumberAttribute(vehicle, "batteryLevel")));
  const averageExternalVoltage = average(vehicles.map((vehicle) => getNumberAttribute(vehicle, "externalVoltage")));
  const averageEngineRpm = average(vehicles.map((vehicle) => getNumberAttribute(vehicle, "engineRpm")));
  const averageGsm = average(vehicles.map((vehicle) => getNumberAttribute(vehicle, "gsmSignal")));
  const averageGnssHdop = average(vehicles.map((vehicle) => getNumberAttribute(vehicle, "gnssHdop")));
  const averageSatellites = average(vehicles.map((vehicle) => getNumberAttribute(vehicle, "satellites")));
  const averageSpeed = average(vehicles.map((vehicle) => vehicle.speedKph));
  const freshVehicleCount = vehicles.filter((vehicle) => isFresh(vehicle.lastUpdatedIso, now)).length;
  const driverIdentifiedVehicles = vehicles.filter((vehicle) => vehicle.driverIdentifier || hasAttributeValue(vehicle, "iButton")).length;

  return {
    generatedAtLabel: formatTimeByPreference(
      now,
      options.timeFormat ?? DEFAULT_APP_PREFERENCES.behavior.timeFormat,
    ),
    fleet: {
      totalVehicles,
      connectedVehicles,
      offlineVehicles,
      movingVehicles,
      idlingVehicles,
      parkedVehicles,
      stationaryVehicles,
      activeAlarmCount,
      occupancyPercent,
    },
    metricCards: [
      {
        id: "mileage",
        label: "Mileage today",
        value: `${formatNumber(totalTripOdometerMeters / 1000, 1)} km`,
        detail: "Trip odometer total",
        tone: "brand",
      },
      {
        id: "consumption",
        label: "Avg consumption",
        value: averageConsumption === null ? "--" : `${formatNumber(averageConsumption, 1)} L/100km`,
        detail: "GPS fuel rate",
        tone: "info",
      },
      {
        id: "occupancy",
        label: "Fleet occupancy",
        value: `${occupancyPercent}%`,
        detail: `${connectedVehicles}/${totalVehicles} connected`,
        tone: "brand",
      },
      {
        id: "alarms",
        label: "Active alarms",
        value: String(activeAlarmCount),
        detail: activeAlarmCount ? "Needs attention" : "No active alarms",
        tone: activeAlarmCount ? "danger" : "brand",
      },
      {
        id: "connected",
        label: "Connected",
        value: String(connectedVehicles),
        detail: `${offlineVehicles} offline`,
        tone: offlineVehicles ? "warning" : "brand",
      },
      {
        id: "moving",
        label: "Moving / idling",
        value: `${movingVehicles} / ${idlingVehicles}`,
        detail: `${parkedVehicles} parked, ${stationaryVehicles} stationary`,
        tone: "info",
      },
      {
        id: "freshness",
        label: "Data fresh",
        value: `${freshVehicleCount}/${totalVehicles}`,
        detail: "Updated within 5 min",
        tone: freshVehicleCount < connectedVehicles ? "warning" : "brand",
      },
      {
        id: "drivers",
        label: "Driver IDs",
        value: String(driverIdentifiedVehicles),
        detail: "iButton or driver id",
        tone: driverIdentifiedVehicles < connectedVehicles ? "warning" : "info",
      },
    ],
    telemetryCards: [
      {
        id: "avgSpeed",
        label: "Avg speed",
        value: averageSpeed === null ? "--" : `${formatNumber(averageSpeed)} km/h`,
        detail: "Current fleet mean",
        tone: "info",
      },
      {
        id: "fuel",
        label: "Fuel",
        value: averageFuel === null ? "--" : `${formatNumber(averageFuel)}%`,
        detail: "Average tank level",
        tone: "brand",
      },
      {
        id: "battery",
        label: "Battery",
        value: averageBattery === null ? "--" : `${formatNumber(averageBattery)}%`,
        detail: "Tracker battery",
        tone: "brand",
      },
      {
        id: "externalVoltage",
        label: "Ext voltage",
        value: averageExternalVoltage === null ? "--" : `${formatNumber(averageExternalVoltage, 1)} V`,
        detail: "Vehicle power feed",
        tone: averageExternalVoltage !== null && averageExternalVoltage < 11.8 ? "warning" : "info",
      },
      {
        id: "engineRpm",
        label: "RPM",
        value: averageEngineRpm === null ? "--" : `${formatNumber(averageEngineRpm)} rpm`,
        detail: "Engine speed mean",
        tone: averageEngineRpm !== null && averageEngineRpm > 2600 ? "warning" : "info",
      },
      {
        id: "gsm",
        label: "GSM",
        value: averageGsm === null ? "--" : `${formatNumber(averageGsm, 1)}/5`,
        detail: "Signal quality",
        tone: averageGsm !== null && averageGsm < 3 ? "warning" : "info",
      },
      {
        id: "gnss",
        label: "GNSS",
        value: averageGnssHdop === null ? "--" : `${formatNumber(averageGnssHdop, 1)} HDOP`,
        detail: "Lower is better",
        tone: averageGnssHdop !== null && averageGnssHdop > 1.6 ? "warning" : "info",
      },
      {
        id: "satellites",
        label: "Satellites",
        value: averageSatellites === null ? "--" : formatNumber(averageSatellites),
        detail: "Average GNSS view",
        tone: averageSatellites !== null && averageSatellites < 8 ? "warning" : "info",
      },
      {
        id: "odometer",
        label: "Fleet odometer",
        value: totalFleetOdometerMeters ? `${formatNumber(totalFleetOdometerMeters / 1000)} km` : "--",
        detail: "Total odometer sum",
        tone: "muted",
      },
    ],
    timelineItems: vehicles
      .slice()
      .sort((left, right) => {
        const priorityDiff = getStatusPriority(left) - getStatusPriority(right);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return new Date(right.lastUpdatedIso).valueOf() - new Date(left.lastUpdatedIso).valueOf();
      })
      .slice(0, 8)
      .map((vehicle) => {
        const statusMeta = getVehicleDisplayStatusMeta(vehicle);

        return {
          id: vehicle.id,
          vehicleName: vehicle.name,
          plate: vehicle.plate,
          statusId: statusMeta.id,
          statusLabel: statusMeta.label,
          statusBadgeClassName: statusMeta.badgeClassName,
          statusColorClassName: statusMeta.colorClassName,
          detail:
            statusMeta.id === "offline"
              ? `Last sync ${formatTimeAgo(vehicle.lastUpdatedIso, now)}`
              : `${vehicle.speedKph} km/h - ${vehicle.driverIdentifier ?? vehicle.driverName}`,
          timeLabel: formatTimeAgo(vehicle.lastUpdatedIso, now),
          tone: getTimelineTone(statusMeta.id),
        };
      }),
  };
}
