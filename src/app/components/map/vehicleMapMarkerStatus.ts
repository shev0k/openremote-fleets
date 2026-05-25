import type { Vehicle, VehicleMarkerStatusOverride } from "../../../domain/models/vehicle";
import { getVehicleDisplayStatusMeta } from "./vehicleDisplayStatus";

export type VehicleMapMarkerStatus =
  | "alerting"
  | VehicleMarkerStatusOverride;

export interface VehicleMapMarkerStatusMeta {
  id: VehicleMapMarkerStatus;
  label: string;
  priority: number;
}

const VEHICLE_MAP_MARKER_STATUS_META: Record<VehicleMapMarkerStatus, VehicleMapMarkerStatusMeta> = {
  alerting: {
    id: "alerting",
    label: "Alerting",
    priority: 7,
  },
  offline: {
    id: "offline",
    label: "Offline",
    priority: 6,
  },
  parked: {
    id: "parked",
    label: "Parked",
    priority: 5,
  },
  driverBreak: {
    id: "driverBreak",
    label: "Driver break",
    priority: 4,
  },
  signalDegraded: {
    id: "signalDegraded",
    label: "Signal degraded",
    priority: 3,
  },
  stopped: {
    id: "stopped",
    label: "Stopped",
    priority: 2,
  },
  idling: {
    id: "idling",
    label: "Idling",
    priority: 2,
  },
  stationary: {
    id: "stationary",
    label: "Stationary",
    priority: 2,
  },
  moving: {
    id: "moving",
    label: "Moving",
    priority: 1,
  },
};

function getTeltonikaValue(vehicle: Vehicle, attributeName: string): unknown {
  return vehicle.teltonika?.attributes[attributeName]?.value;
}

function getNumericTeltonikaAttribute(vehicle: Vehicle, attributeName: string): number | null {
  const value = getTeltonikaValue(vehicle, attributeName);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBooleanTeltonikaAttribute(vehicle: Vehicle, attributeName: string): boolean | null {
  const value = getTeltonikaValue(vehicle, attributeName);
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value > 0;
  return null;
}

function getSpeedKph(vehicle: Vehicle): number {
  return getNumericTeltonikaAttribute(vehicle, "speed") ?? vehicle.speedKph;
}

function isStationary(vehicle: Vehicle): boolean {
  return getSpeedKph(vehicle) <= 0 || getBooleanTeltonikaAttribute(vehicle, "movement") === false;
}

function getKnownIgnitionState(vehicle: Vehicle): boolean | null {
  const teltonikaIgnition = getBooleanTeltonikaAttribute(vehicle, "ignition");
  if (teltonikaIgnition !== null) {
    return teltonikaIgnition;
  }

  return vehicle.telemetryQuality?.hasIgnition === false ? null : vehicle.ignitionOn;
}

function isParked(vehicle: Vehicle): boolean {
  return getKnownIgnitionState(vehicle) === false && isStationary(vehicle);
}

function isDriverBreak(vehicle: Vehicle): boolean {
  const trip = getBooleanTeltonikaAttribute(vehicle, "trip");
  const ignitionOn = getKnownIgnitionState(vehicle);
  return isStationary(vehicle) && ignitionOn === true && trip === false;
}

function hasPoorSignal(vehicle: Vehicle): boolean {
  const gsmSignal = getNumericTeltonikaAttribute(vehicle, "gsmSignal");
  const gnssStatus = getBooleanTeltonikaAttribute(vehicle, "gnssStatus");
  const gnssHdop = getNumericTeltonikaAttribute(vehicle, "gnssHdop");
  const satellites = getNumericTeltonikaAttribute(vehicle, "satellites");

  return (
    (gsmSignal !== null && gsmSignal <= 2) ||
    gnssStatus === false ||
    (gnssHdop !== null && gnssHdop >= 3) ||
    (satellites !== null && satellites < 4)
  );
}

export function resolveVehicleMapMarkerStatus(vehicle: Vehicle): VehicleMapMarkerStatus {
  const displayStatus = getVehicleDisplayStatusMeta(vehicle).id;

  if (displayStatus === "alerting") {
    return "alerting";
  }

  if (vehicle.mapMarkerStatusOverride) {
    return vehicle.mapMarkerStatusOverride;
  }

  if (displayStatus === "offline") {
    return "offline";
  }

  if (isParked(vehicle) || displayStatus === "parked") {
    return "parked";
  }

  if (isDriverBreak(vehicle)) {
    return "driverBreak";
  }

  if (hasPoorSignal(vehicle)) {
    return "signalDegraded";
  }

  if (displayStatus === "idling") {
    return "idling";
  }

  if (displayStatus === "stationary") {
    return "stationary";
  }

  return "moving";
}

export function getVehicleMapMarkerStatusMeta(vehicle: Vehicle): VehicleMapMarkerStatusMeta {
  return VEHICLE_MAP_MARKER_STATUS_META[resolveVehicleMapMarkerStatus(vehicle)];
}
