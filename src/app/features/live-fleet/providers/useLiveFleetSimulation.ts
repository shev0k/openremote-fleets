import { startTransition, useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { PlaybackRoute } from "../../../../domain/models/playback";
import type { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";
import type { FleetLiveStateService } from "../../../../domain/services/liveFleetStateService";
import {
  getCurrentTripId,
  getPlaybackProgressForRouteRefresh,
} from "../../../components/playback/playbackUtils";
import type { LiveFleetSimulationRefs } from "./useLiveFleetData";

const SIMULATION_SPEED_OPTIONS = [1, 2, 4, 8, 16];
const DEFAULT_SIMULATION_SPEED = 2;

interface UseLiveFleetSimulationOptions {
  isRouteBackedSimulationEnabled: boolean;
  liveFleetStateService: FleetLiveStateService;
  simulationRefs: LiveFleetSimulationRefs;
  selectedVehicleId: string | null;
  route: PlaybackRoute | null;
  isPlaybackRunning: boolean;
  isTimelineScrubbing: boolean;
  playbackProgress: number;
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
  setVehicleDetailsById: Dispatch<SetStateAction<Record<string, VehicleDetail>>>;
  setRoute: Dispatch<SetStateAction<PlaybackRoute | null>>;
  setPlaybackProgress: (nextProgress: number, options?: { markInspection?: boolean }) => void;
  setSelectedSegmentId: Dispatch<SetStateAction<string | null>>;
}

export function useLiveFleetSimulation({
  isRouteBackedSimulationEnabled,
  liveFleetStateService,
  simulationRefs,
  selectedVehicleId,
  route,
  isPlaybackRunning,
  isTimelineScrubbing,
  playbackProgress,
  setVehicles,
  setVehicleDetailsById,
  setRoute,
  setPlaybackProgress,
  setSelectedSegmentId,
}: UseLiveFleetSimulationOptions) {
  const [simulationSpeed, setSimulationSpeedState] = useState(DEFAULT_SIMULATION_SPEED);
  const isPlaybackRunningRef = useRef(isPlaybackRunning);
  const isTimelineScrubbingRef = useRef(isTimelineScrubbing);
  const simulationSpeedRef = useRef(simulationSpeed);
  const playbackProgressRef = useRef(playbackProgress);
  const selectedVehicleIdRef = useRef(selectedVehicleId);
  const routeRef = useRef(route);

  useEffect(() => {
    isPlaybackRunningRef.current = isPlaybackRunning;
  }, [isPlaybackRunning]);

  useEffect(() => {
    isTimelineScrubbingRef.current = isTimelineScrubbing;
  }, [isTimelineScrubbing]);

  useEffect(() => {
    simulationSpeedRef.current = simulationSpeed;
  }, [simulationSpeed]);

  useEffect(() => {
    playbackProgressRef.current = playbackProgress;
  }, [playbackProgress]);

  useEffect(() => {
    selectedVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    if (!isRouteBackedSimulationEnabled) {
      return;
    }

    const tick = () => {
      const baseVehicles = simulationRefs.baseVehiclesRef.current;
      const routesByVehicleId = simulationRefs.routesByVehicleIdRef.current;

      if (!baseVehicles.length || !Object.keys(routesByVehicleId).length) {
        return;
      }

      const tickAtMs = Date.now();
      const previousTickAtMs = simulationRefs.lastTickAtMsRef.current ?? tickAtMs;
      simulationRefs.elapsedMsRef.current += Math.max(0, tickAtMs - previousTickAtMs) * simulationSpeedRef.current;
      simulationRefs.lastTickAtMsRef.current = tickAtMs;

      const liveSelectedVehicleId = selectedVehicleIdRef.current;
      const snapshot = liveFleetStateService.createSnapshot({
        vehicles: baseVehicles,
        routesByVehicleId,
        vehicleDetailsById: simulationRefs.baseVehicleDetailsRef.current,
        selectedVehicleId: liveSelectedVehicleId,
        nowMs: simulationRefs.elapsedMsRef.current,
      });

      startTransition(() => {
        setVehicles(snapshot.vehicles);

        if (Object.keys(snapshot.vehicleDetailsById).length) {
          setVehicleDetailsById((current) => ({
            ...current,
            ...Object.fromEntries(Object.entries(snapshot.vehicleDetailsById).filter(([vehicleId]) => current[vehicleId])),
          }));
        }

        const currentProgress = playbackProgressRef.current;
        const shouldFollowLiveRoute = !isPlaybackRunningRef.current && currentProgress >= 99.5;

        if (liveSelectedVehicleId && snapshot.selectedRoute && !isTimelineScrubbingRef.current) {
          const retainedProgress = shouldFollowLiveRoute
            ? null
            : getPlaybackProgressForRouteRefresh(routeRef.current, snapshot.selectedRoute, currentProgress);
          setRoute(snapshot.selectedRoute);

          if (shouldFollowLiveRoute) {
            setPlaybackProgress(100, { markInspection: false });
            setSelectedSegmentId(snapshot.selectedRoute.tripSegments.at(-1)?.id ?? null);
            return;
          }

          if (retainedProgress !== null) {
            setPlaybackProgress(retainedProgress, { markInspection: false });
            setSelectedSegmentId(getCurrentTripId(snapshot.selectedRoute.tripSegments, retainedProgress));
          }
        }
      });
    };

    tick();
    const timer = window.setInterval(tick, 1_500);

    return () => window.clearInterval(timer);
  }, [
    isRouteBackedSimulationEnabled,
    liveFleetStateService,
    setPlaybackProgress,
    setRoute,
    setSelectedSegmentId,
    setVehicleDetailsById,
    setVehicles,
    simulationRefs,
  ]);

  const setSimulationSpeed = useCallback((nextSpeed: number) => {
    setSimulationSpeedState(
      SIMULATION_SPEED_OPTIONS.includes(nextSpeed) ? nextSpeed : DEFAULT_SIMULATION_SPEED,
    );
  }, []);

  return {
    simulationSpeed,
    setSimulationSpeed,
  };
}
