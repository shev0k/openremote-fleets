import { Vehicle } from "../../../domain/models/vehicle";

interface LiveMapVehiclesInput {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle | null;
  selectedVehicleId?: string | null;
  routeLine?: [number, number][];
  playbackPosition?: [number, number];
  playbackHeading?: number | null;
  playbackProgress?: number;
  playbackSpeed?: number;
  isTimelineInspecting?: boolean;
}

export function getLiveMapVehicles({
  vehicles,
  selectedVehicleId,
  playbackHeading,
  playbackPosition,
  playbackProgress,
  isTimelineInspecting = false,
}: LiveMapVehiclesInput): Vehicle[] {
  if (!isTimelineInspecting || !selectedVehicleId || !playbackPosition || playbackProgress === undefined || playbackProgress >= 100) {
    return vehicles;
  }

  return vehicles.map((vehicle) =>
    vehicle.id === selectedVehicleId
      ? {
          ...vehicle,
          latitude: playbackPosition[0],
          longitude: playbackPosition[1],
          heading: playbackHeading ?? vehicle.heading,
        }
      : vehicle,
  );
}
