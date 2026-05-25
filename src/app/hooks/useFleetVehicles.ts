import { useCallback } from "react";
import type { Vehicle } from "../../domain/models/vehicle";
import { useAppServices } from "../providers/AppServicesProvider";
import { useRepositoryQuery } from "./useRepositoryQuery";

export function useFleetVehicles() {
  const { fleetRepository } = useAppServices();
  const query = useCallback(() => fleetRepository.listVehicles(), [fleetRepository]);

  return useRepositoryQuery<Vehicle[]>({
    initialData: [],
    query,
  });
}
