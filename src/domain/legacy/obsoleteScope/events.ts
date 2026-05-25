export type FleetEventType = "trip" | "ignition" | "alarm" | "stop" | "break" | "engineOff" | "telemetry";

export interface FleetEventLocation {
  latitude: number;
  longitude: number;
}

export interface FleetEvent {
  id: string;
  vehicleId: string;
  eventType: FleetEventType;
  timestampIso: string;
  title: string;
  state?: string;
  sourceAttribute?: string;
  driverIdentifier?: string;
  location?: FleetEventLocation;
  severity?: "info" | "warning" | "critical";
}

export interface TelemetryRangeSummary {
  signalId: string;
  min?: number;
  max?: number;
  average?: number;
  unit?: string;
}

export interface DailyActivitySummary {
  vehicleId: string;
  dateIso: string;
  driverIdentifiers: string[];
  tripCount: number;
  distanceKm: number;
  activeMinutes: number;
  idleMinutes: number;
  stopCount: number;
  alarmCount: number;
  fuelUsedLiters?: number;
  averageFuelConsumptionLitersPer100Km?: number;
  telemetryRanges: TelemetryRangeSummary[];
}
