import { startTransition, useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { FleetRepository } from "../../../../domain/repositories/fleetRepository";
import type { PlaybackRepository } from "../../../../domain/repositories/playbackRepository";
import type { PlaybackRoute } from "../../../../domain/models/playback";
import type { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";
import type { FleetLiveStateService } from "../../../../domain/services/liveFleetStateService";
import type { LiveFleetSimulationRefs } from "./useLiveFleetData";
import { LAST_24_HOURS_QUERY } from "./liveFleetWorkspace.types";

interface UseLiveFleetSelectionOptions {
  fleetRepository: FleetRepository;
  playbackRepository: PlaybackRepository;
  liveFleetStateService: FleetLiveStateService;
  isRouteBackedSimulationEnabled: boolean;
  vehicles: Vehicle[];
  simulationRefs: LiveFleetSimulationRefs;
  resetPlayback: (options?: { progress?: number; running?: boolean; speed?: number; timelineInspectionRevision?: number }) => void;
  showWidget: (widgetId: "tripHistory") => void;
  setTimelineVisible: (isVisible: boolean) => void;
  setTimelineSignalsVisible: (isVisible: boolean) => void;
  setTimelineHeightPx: (heightPx: number) => void;
  setActiveVehicleOverlayId: Dispatch<SetStateAction<string | null>>;
  resetRoutes: () => void;
  beginRouteSelection: () => void;
  applySelectedRoutes: (route: PlaybackRoute | null, historicalRoute: PlaybackRoute | null) => void;
  setIsLoadingRoute: Dispatch<SetStateAction<boolean>>;
}

export function useLiveFleetSelection({
  fleetRepository,
  playbackRepository,
  liveFleetStateService,
  isRouteBackedSimulationEnabled,
  vehicles,
  simulationRefs,
  resetPlayback,
  showWidget,
  setTimelineVisible,
  setTimelineSignalsVisible,
  setTimelineHeightPx,
  setActiveVehicleOverlayId,
  resetRoutes,
  beginRouteSelection,
  applySelectedRoutes,
  setIsLoadingRoute,
}: UseLiveFleetSelectionOptions) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleDetailsById, setVehicleDetailsById] = useState<Record<string, VehicleDetail>>({});
  const [isLoadingVehicleDetail, setIsLoadingVehicleDetail] = useState(false);
  const [selectionLoadError, setSelectionLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const clearSelectedVehicleState = useCallback(() => {
    setSelectedVehicleId(null);
    setActiveVehicleOverlayId(null);
    resetRoutes();
    resetPlayback({ progress: 0, speed: 1 });
    setIsLoadingVehicleDetail(false);
    setSelectionLoadError(null);
    setTimelineVisible(false);
    setTimelineSignalsVisible(false);
    setTimelineHeightPx(0);
  }, [
    resetPlayback,
    resetRoutes,
    setActiveVehicleOverlayId,
    setTimelineHeightPx,
    setTimelineSignalsVisible,
    setTimelineVisible,
  ]);

  const dismissSelectedVehicle = useCallback(() => {
    requestIdRef.current += 1;
    clearSelectedVehicleState();
  }, [clearSelectedVehicleState]);

  const selectVehicle = useCallback(
    async (vehicleId: string) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      setSelectedVehicleId(vehicleId);
      setActiveVehicleOverlayId(vehicleId);
      beginRouteSelection();
      resetPlayback({ progress: 0, speed: 1 });
      setTimelineVisible(true);
      setTimelineSignalsVisible(false);
      setTimelineHeightPx(0);
      showWidget("tripHistory");

      setIsLoadingVehicleDetail(true);
      setSelectionLoadError(null);

      const [detailResult, routeResult, historicalRouteResult] = await Promise.allSettled([
        Promise.resolve().then(() => fleetRepository.getVehicleDetail(vehicleId)),
        Promise.resolve().then(() => playbackRepository.getPlaybackRoute(vehicleId, LAST_24_HOURS_QUERY)),
        Promise.resolve().then(() => playbackRepository.getPlaybackRoute(vehicleId, { preset: "yesterday" })),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextDetail = detailResult.status === "fulfilled" ? detailResult.value : null;
      const nextRoute = routeResult.status === "fulfilled" ? routeResult.value : null;
      const nextHistoricalRoute = historicalRouteResult.status === "fulfilled" ? historicalRouteResult.value : null;
      const loadErrors = [
        detailResult.status === "rejected" ? "vehicle detail" : null,
        routeResult.status === "rejected" ? "current route" : null,
        historicalRouteResult.status === "rejected" ? "historical route" : null,
      ].filter((label): label is string => Boolean(label));

      setSelectionLoadError(loadErrors.length ? `Unable to load ${loadErrors.join(", ")} for the selected vehicle.` : null);

      startTransition(() => {
        if (isRouteBackedSimulationEnabled && nextDetail) {
          simulationRefs.baseVehicleDetailsRef.current = {
            ...simulationRefs.baseVehicleDetailsRef.current,
            [vehicleId]: nextDetail,
          };
        }

        if (isRouteBackedSimulationEnabled && nextRoute) {
          simulationRefs.routesByVehicleIdRef.current = {
            ...simulationRefs.routesByVehicleIdRef.current,
            [vehicleId]: nextRoute,
          };
        }

        setVehicleDetailsById((current) =>
          nextDetail
            ? {
                ...current,
                [vehicleId]: nextDetail,
              }
            : current,
        );

        const simulationSnapshot =
          isRouteBackedSimulationEnabled && nextRoute
            ? liveFleetStateService.createSnapshot({
                vehicles: simulationRefs.baseVehiclesRef.current.length ? simulationRefs.baseVehiclesRef.current : vehicles,
                routesByVehicleId: {
                  ...simulationRefs.routesByVehicleIdRef.current,
                  [vehicleId]: nextRoute,
                },
                vehicleDetailsById: nextDetail ? { [vehicleId]: nextDetail } : {},
                selectedVehicleId: vehicleId,
                nowMs: simulationRefs.elapsedMsRef.current,
              })
            : null;

        applySelectedRoutes(simulationSnapshot?.selectedRoute ?? nextRoute, nextHistoricalRoute);
      });

      if (requestId === requestIdRef.current) {
        setIsLoadingVehicleDetail(false);
        setIsLoadingRoute(false);
      }
    },
    [
      applySelectedRoutes,
      beginRouteSelection,
      fleetRepository,
      isRouteBackedSimulationEnabled,
      liveFleetStateService,
      playbackRepository,
      resetPlayback,
      setActiveVehicleOverlayId,
      setIsLoadingRoute,
      setTimelineHeightPx,
      setTimelineSignalsVisible,
      setTimelineVisible,
      showWidget,
      simulationRefs,
      vehicles,
    ],
  );

  const reconcileVehicleIds = useCallback(
    (validVehicleIds: ReadonlySet<string>) => {
      setVehicleDetailsById((current) => {
        const entries = Object.entries(current).filter(([vehicleId]) => validVehicleIds.has(vehicleId));
        return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
      });

      if (selectedVehicleId && !validVehicleIds.has(selectedVehicleId)) {
        requestIdRef.current += 1;
        clearSelectedVehicleState();
      }
    },
    [clearSelectedVehicleState, selectedVehicleId],
  );

  return {
    selectedVehicleId,
    vehicleDetailsById,
    isLoadingVehicleDetail,
    selectionLoadError,
    setVehicleDetailsById,
    reconcileVehicleIds,
    selectVehicle,
    dismissSelectedVehicle,
  };
}
