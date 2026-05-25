import { startTransition, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { PlaybackRoute } from "../../../../domain/models/playback";
import type { Vehicle } from "../../../../domain/models/vehicle";
import type { FleetRepository } from "../../../../domain/repositories/fleetRepository";
import type { PlaybackRepository } from "../../../../domain/repositories/playbackRepository";
import { LIVE_DATA_REFRESH_INTERVAL_MS } from "../../../../domain/services/liveDataRefreshPolicy";
import { useAsyncPolling } from "../../../hooks/useAsyncPolling";
import {
  getCurrentTripId,
  getPlaybackProgressForRouteRefresh,
} from "../../../components/playback/playbackUtils";
import { LAST_24_HOURS_QUERY } from "./liveFleetWorkspace.types";

const LIVE_ENDPOINT_PROGRESS_THRESHOLD = 99.5;

interface LiveFleetRealModeRefreshState {
  selectedVehicleId: string | null;
  route: PlaybackRoute | null;
  isRouteBackedSimulationEnabled: boolean;
  isPlaybackRunning: boolean;
  isTimelineScrubbing: boolean;
  playbackProgress: number;
}

interface UseLiveFleetRealModeRefreshOptions extends LiveFleetRealModeRefreshState {
  fleetRepository: FleetRepository;
  playbackRepository: PlaybackRepository;
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
  setVehiclesLoadError: Dispatch<SetStateAction<string | null>>;
  setRoute: Dispatch<SetStateAction<PlaybackRoute | null>>;
  setSelectedSegmentId: Dispatch<SetStateAction<string | null>>;
  setPlaybackProgress: (nextProgress: number, options?: { markInspection?: boolean }) => void;
}

type SelectedRouteRefreshResult =
  | { status: "fulfilled"; route: PlaybackRoute | null }
  | { status: "rejected" }
  | null;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function shouldRefreshSelectedRoute({
  selectedVehicleId,
  isPlaybackRunning,
  isTimelineScrubbing,
}: LiveFleetRealModeRefreshState) {
  return Boolean(
    selectedVehicleId &&
      !isPlaybackRunning &&
      !isTimelineScrubbing,
  );
}

export function useLiveFleetRealModeRefresh({
  fleetRepository,
  playbackRepository,
  selectedVehicleId,
  route,
  isRouteBackedSimulationEnabled,
  isPlaybackRunning,
  isTimelineScrubbing,
  playbackProgress,
  setVehicles,
  setVehiclesLoadError,
  setRoute,
  setSelectedSegmentId,
  setPlaybackProgress,
}: UseLiveFleetRealModeRefreshOptions) {
  const stateRef = useRef<LiveFleetRealModeRefreshState>({
    selectedVehicleId,
    route,
    isRouteBackedSimulationEnabled,
    isPlaybackRunning,
    isTimelineScrubbing,
    playbackProgress,
  });

  useEffect(() => {
    stateRef.current = {
      selectedVehicleId,
      route,
      isRouteBackedSimulationEnabled,
      isPlaybackRunning,
      isTimelineScrubbing,
      playbackProgress,
    };
  }, [isPlaybackRunning, isRouteBackedSimulationEnabled, isTimelineScrubbing, playbackProgress, route, selectedVehicleId]);

  const refreshLiveFleetData = useCallback(async () => {
    const refreshState = stateRef.current;
    if (refreshState.isRouteBackedSimulationEnabled) {
      return;
    }

    const vehicleId = refreshState.selectedVehicleId;
    const shouldRefreshRoute = shouldRefreshSelectedRoute(refreshState);
    const vehiclesPromise = fleetRepository.listVehicles();
    const routePromise: Promise<SelectedRouteRefreshResult> =
      shouldRefreshRoute && vehicleId
        ? playbackRepository
            .getPlaybackRoute(vehicleId, LAST_24_HOURS_QUERY)
            .then((nextRoute) => ({ status: "fulfilled" as const, route: nextRoute }))
            .catch(() => ({ status: "rejected" as const }))
        : Promise.resolve(null);

    const [nextVehicles, routeResult] = await Promise.all([vehiclesPromise, routePromise]);
    const latestState = stateRef.current;
    const selectedVehicleStillPresent = vehicleId ? nextVehicles.some((vehicle) => vehicle.id === vehicleId) : false;
    const canApplySelectedRoute =
      shouldRefreshRoute &&
      selectedVehicleStillPresent &&
      latestState.selectedVehicleId === vehicleId &&
      !latestState.isRouteBackedSimulationEnabled &&
      !latestState.isPlaybackRunning &&
      !latestState.isTimelineScrubbing;

    startTransition(() => {
      setVehicles(nextVehicles);

      if (!canApplySelectedRoute || routeResult?.status !== "fulfilled") {
        return;
      }

      const currentRoute = latestState.route;
      const nextRoute = routeResult.route;
      if (!nextRoute?.points.length && currentRoute?.points.length) {
        return;
      }

      const isFollowingLiveEndpoint = latestState.playbackProgress >= LIVE_ENDPOINT_PROGRESS_THRESHOLD;
      const retainedProgress = isFollowingLiveEndpoint
        ? null
        : getPlaybackProgressForRouteRefresh(currentRoute, nextRoute, latestState.playbackProgress);
      setRoute(nextRoute);

      if (isFollowingLiveEndpoint || !currentRoute?.points.length) {
        setSelectedSegmentId(nextRoute?.tripSegments.at(-1)?.id ?? null);
        setPlaybackProgress(nextRoute?.points.length ? 100 : 0, { markInspection: false });
        return;
      }

      if (retainedProgress !== null && nextRoute) {
        setSelectedSegmentId(getCurrentTripId(nextRoute.tripSegments, retainedProgress));
        setPlaybackProgress(retainedProgress, { markInspection: false });
      }
    });
    setVehiclesLoadError(null);
  }, [
    fleetRepository,
    playbackRepository,
    setPlaybackProgress,
    setRoute,
    setSelectedSegmentId,
    setVehicles,
    setVehiclesLoadError,
  ]);

  useAsyncPolling(refreshLiveFleetData, LIVE_DATA_REFRESH_INTERVAL_MS.fleetVehicles, {
    enabled: !isRouteBackedSimulationEnabled,
    onError: (error) => {
      setVehiclesLoadError(getErrorMessage(error, "Unable to refresh live fleet vehicles."));
    },
  });
}
