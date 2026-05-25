import { TeltonikaTrackerSnapshot } from "./teltonika";
import { TelemetrySignalDefinition, TelemetrySignalSample } from "./telemetry";

export type VehicleStatus = "moving" | "idling" | "parked" | "stationary" | "offline" | "alerting";
export type VehicleMarkerStatusOverride =
  | "moving"
  | "idling"
  | "stopped"
  | "parked"
  | "stationary"
  | "offline"
  | "driverBreak"
  | "signalDegraded";

export type VehicleClass = "truck" | "van" | "car" | "unknown";

export interface VehicleTelemetryQuality {
  hasSpeed?: boolean;
  hasIgnition?: boolean;
  hasHeading?: boolean;
  hasLocation?: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: VehicleStatus;
  mapMarkerStatusOverride?: VehicleMarkerStatusOverride;
  speedKph: number;
  ignitionOn: boolean;
  latitude: number;
  longitude: number;
  hasLocation?: boolean;
  telemetryQuality?: VehicleTelemetryQuality;
  heading: number;
  lastUpdatedIso: string;
  driverName: string;
  trackerId: string;
  assetName: string;
  assetClass: VehicleClass;
  deviceType: string;
  activeAlertCount: number;
  driverIdentifier?: string;
  fuelLevelPercent?: number;
  batteryLevelPercent?: number;
  availableTelemetrySignals?: TelemetrySignalDefinition[];
  latestTelemetrySamples?: TelemetrySignalSample[];
  teltonika?: TeltonikaTrackerSnapshot;
}

export interface VehicleDetail extends Vehicle {
  lastCommunicationIso: string;
  gpsAccuracyMeters: number;
  todayMileageKm: number;
  odometerKm: number;
  fuelInTankLiters: number;
  averageFuelConsumptionLitersPer100Km: number;
  stoppedDurationMinutes: number;
}

export function hasValidVehicleLocation(vehicle: Pick<Vehicle, "hasLocation" | "latitude" | "longitude">): boolean {
  return vehicle.hasLocation !== false && Number.isFinite(vehicle.latitude) && Number.isFinite(vehicle.longitude);
}
