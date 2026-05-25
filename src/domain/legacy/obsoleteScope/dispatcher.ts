import { VehicleClass, VehicleStatus } from "../../models/vehicle";

export type DispatcherVehicleAvailability = "available" | "busy" | "offline" | "unknown";

export interface DispatcherMapFlag {
  id: string;
  label: string;
  createdAtIso: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface DispatcherVehicleCandidate {
  vehicleId: string;
  rank: number;
  distanceKm: number;
  etaMinutes?: number;
  availability: DispatcherVehicleAvailability;
  status?: VehicleStatus;
  activeAlertCount: number;
  routeSummary?: string;
  logbookSnippet?: string;
}

export interface DispatcherAssistanceRequest extends DispatcherMapFlag {
  requiredVehicleClasses?: VehicleClass[];
  candidates: DispatcherVehicleCandidate[];
}
