import { PlaybackQuery } from "../models/playback";
import { TelemetrySignalDefinition, TelemetryTimeline } from "../models/telemetry";
import { Vehicle, VehicleDetail } from "../models/vehicle";

export interface FleetRepository {
  listVehicles(): Promise<Vehicle[]>;
  getVehicleDetail(vehicleId: string): Promise<VehicleDetail | null>;
  listAvailableTelemetrySignals(vehicleId?: string): Promise<TelemetrySignalDefinition[]>;
  getVehicleTelemetryTimeline(vehicleId: string, query: PlaybackQuery): Promise<TelemetryTimeline | null>;
}
