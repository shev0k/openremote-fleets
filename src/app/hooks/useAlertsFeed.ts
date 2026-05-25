import { useCallback } from "react";
import type { FleetAlert } from "../../domain/models/alerts";
import { useAppServices } from "../providers/AppServicesProvider";
import { useRepositoryQuery } from "./useRepositoryQuery";

export function useAlertsFeed() {
  const { alertsRepository } = useAppServices();
  const query = useCallback(() => alertsRepository.listAlerts(), [alertsRepository]);

  return useRepositoryQuery<FleetAlert[]>({
    initialData: [],
    query,
  });
}
