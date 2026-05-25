import type { FleetAlert } from "../models/alerts";
import type { PlaybackRoute } from "../models/playback";
import type { Vehicle, VehicleDetail } from "../models/vehicle";

export interface FleetLiveStateInput {
  vehicles: Vehicle[];
  routesByVehicleId: Record<string, PlaybackRoute | null | undefined>;
  vehicleDetailsById?: Record<string, VehicleDetail>;
  selectedVehicleId?: string | null;
  nowMs?: number;
  useVehicleOffsets?: boolean;
  alerts?: FleetAlert[];
}

export interface FleetLiveStateSnapshot {
  vehicles: Vehicle[];
  vehicleDetailsById: Record<string, VehicleDetail>;
  selectedRoute: PlaybackRoute | null;
}

export interface FleetLiveStateService {
  supportsRouteBackedSimulation: boolean;
  createSnapshot(input: FleetLiveStateInput): FleetLiveStateSnapshot;
}

export class PassthroughFleetLiveStateService implements FleetLiveStateService {
  readonly supportsRouteBackedSimulation = false;

  createSnapshot({
    vehicles,
    routesByVehicleId,
    vehicleDetailsById = {},
    selectedVehicleId = null,
  }: FleetLiveStateInput): FleetLiveStateSnapshot {
    return {
      vehicles,
      vehicleDetailsById,
      selectedRoute: selectedVehicleId ? routesByVehicleId[selectedVehicleId] ?? null : null,
    };
  }
}
