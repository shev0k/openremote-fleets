import { startTransition, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { FleetRepository } from "../../../../domain/repositories/fleetRepository";
import type { PlaybackRepository } from "../../../../domain/repositories/playbackRepository";
import type { PlaybackRoute } from "../../../../domain/models/playback";
import type { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";
import type { FleetLiveStateService } from "../../../../domain/services/liveFleetStateService";
import { LAST_24_HOURS_QUERY } from "./liveFleetWorkspace.types";

export interface LiveFleetSimulationRefs {
  baseVehiclesRef: MutableRefObject<Vehicle[]>;
  baseVehicleDetailsRef: MutableRefObject<Record<string, VehicleDetail>>;
  routesByVehicleIdRef: MutableRefObject<Record<string, PlaybackRoute>>;
  elapsedMsRef: MutableRefObject<number>;
  lastTickAtMsRef: MutableRefObject<number | null>;
}

interface UseLiveFleetDataOptions {
  fleetRepository: FleetRepository;
  playbackRepository: PlaybackRepository;
  liveFleetStateService: FleetLiveStateService;
  isRouteBackedSimulationEnabled: boolean;
}

interface UseLiveFleetDataResult {
  vehicles: Vehicle[];
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
  setVehiclesLoadError: Dispatch<SetStateAction<string | null>>;
  isLoadingVehicles: boolean;
  vehiclesLoadError: string | null;
  simulationRefs: LiveFleetSimulationRefs;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useLiveFleetData({
  fleetRepository,
  playbackRepository,
  liveFleetStateService,
  isRouteBackedSimulationEnabled,
}: UseLiveFleetDataOptions): UseLiveFleetDataResult {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesLoadError, setVehiclesLoadError] = useState<string | null>(null);
  const baseVehiclesRef = useRef<Vehicle[]>([]);
  const baseVehicleDetailsRef = useRef<Record<string, VehicleDetail>>({});
  const routesByVehicleIdRef = useRef<Record<string, PlaybackRoute>>({});
  const elapsedMsRef = useRef(0);
  const lastTickAtMsRef = useRef<number | null>(null);
  const simulationRefs = useMemo<LiveFleetSimulationRefs>(
    () => ({
      baseVehiclesRef,
      baseVehicleDetailsRef,
      routesByVehicleIdRef,
      elapsedMsRef,
      lastTickAtMsRef,
    }),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const loadVehicles = async () => {
      setIsLoadingVehicles(true);
      try {
        const nextVehicles = await fleetRepository.listVehicles();
        if (!isMounted) {
          return;
        }

        if (isRouteBackedSimulationEnabled) {
          const routeResults = await Promise.allSettled(
            nextVehicles.map(async (vehicle) => ({
              vehicleId: vehicle.id,
              route: await playbackRepository.getPlaybackRoute(vehicle.id, LAST_24_HOURS_QUERY),
            })),
          );

          if (!isMounted) {
            return;
          }

          const failedRouteCount = routeResults.filter((result) => result.status === "rejected").length;
          const routesByVehicleId = Object.fromEntries(
            routeResults.flatMap((result) =>
              result.status === "fulfilled" && result.value.route ? [[result.value.vehicleId, result.value.route]] : [],
            ),
          );
          baseVehiclesRef.current = nextVehicles;
          routesByVehicleIdRef.current = routesByVehicleId;
          elapsedMsRef.current = 0;
          lastTickAtMsRef.current = Date.now();
          setVehiclesLoadError(failedRouteCount ? `Unable to load route history for ${failedRouteCount} vehicle(s).` : null);

          const snapshot = liveFleetStateService.createSnapshot({
            vehicles: nextVehicles,
            routesByVehicleId,
            nowMs: 0,
          });

          startTransition(() => {
            setVehicles(snapshot.vehicles);
          });
          return;
        }

        startTransition(() => {
          setVehicles(nextVehicles);
        });
        setVehiclesLoadError(null);
      } catch (error) {
        if (isMounted) {
          setVehiclesLoadError(getErrorMessage(error, "Unable to load live fleet vehicles."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingVehicles(false);
        }
      }
    };

    void loadVehicles();

    return () => {
      isMounted = false;
    };
  }, [fleetRepository, isRouteBackedSimulationEnabled, liveFleetStateService, playbackRepository]);

  return {
    vehicles,
    setVehicles,
    setVehiclesLoadError,
    isLoadingVehicles,
    vehiclesLoadError,
    simulationRefs,
  };
}
