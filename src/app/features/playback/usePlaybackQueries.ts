import { useCallback } from "react";
import { PlaybackQuery, PlaybackRoute } from "../../../domain/models/playback";
import { Vehicle } from "../../../domain/models/vehicle";
import { PlaybackRepository } from "../../../domain/repositories/playbackRepository";
import { useRepositoryQuery } from "../../hooks/useRepositoryQuery";

export function usePlaybackVehiclesQuery(playbackRepository: PlaybackRepository) {
  const query = useCallback(
    () => playbackRepository.listPlaybackVehicles(),
    [playbackRepository],
  );

  return useRepositoryQuery<Vehicle[]>({
    initialData: [],
    query,
  });
}

export function usePlaybackRouteQuery(
  playbackRepository: PlaybackRepository,
  selectedVehicleId: string | null,
  playbackQuery: PlaybackQuery,
) {
  const query = useCallback(
    () => (selectedVehicleId ? playbackRepository.getPlaybackRoute(selectedVehicleId, playbackQuery) : Promise.resolve(null)),
    [playbackRepository, playbackQuery, selectedVehicleId],
  );

  return useRepositoryQuery<PlaybackRoute | null>({
    enabled: Boolean(selectedVehicleId),
    initialData: null,
    keepPreviousData: false,
    query,
  });
}
