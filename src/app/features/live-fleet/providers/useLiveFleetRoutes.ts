import { useCallback, useEffect, useState } from "react";
import type { PlaybackRoute } from "../../../../domain/models/playback";
import { getCurrentTripId } from "../../../components/playback/playbackUtils";
import { usePlaybackController } from "../../../components/playback/usePlaybackController";

export function useLiveFleetRoutes() {
  const [route, setRoute] = useState<PlaybackRoute | null>(null);
  const [historicalRoute, setHistoricalRoute] = useState<PlaybackRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [graphSegmentId, setGraphSegmentId] = useState<string | null>(null);
  const playback = usePlaybackController(route);

  useEffect(() => {
    if (!route?.tripSegments.length) {
      setSelectedSegmentId(null);
      return;
    }

    setSelectedSegmentId(getCurrentTripId(route.tripSegments, playback.playbackProgress));
  }, [playback.playbackProgress, route]);

  const resetRoutes = useCallback(() => {
    setRoute(null);
    setHistoricalRoute(null);
    setSelectedSegmentId(null);
    setGraphSegmentId(null);
    setIsLoadingRoute(false);
  }, []);

  const beginRouteSelection = useCallback(() => {
    setRoute(null);
    setHistoricalRoute(null);
    setSelectedSegmentId(null);
    setGraphSegmentId(null);
    setIsLoadingRoute(true);
  }, []);

  const applySelectedRoutes = useCallback(
    (nextRoute: PlaybackRoute | null, nextHistoricalRoute: PlaybackRoute | null) => {
      setRoute(nextRoute);
      setHistoricalRoute(nextHistoricalRoute);
      setSelectedSegmentId(nextRoute?.tripSegments.at(-1)?.id ?? null);
      playback.setPlaybackProgress(nextRoute?.points.length ? 100 : 0, { markInspection: false });
    },
    [playback],
  );

  const createSelectSegment = useCallback(
    (setTimelineVisible: (isVisible: boolean) => void) => (segmentId: string) => {
      const trip = route?.tripSegments.find((entry) => entry.id === segmentId);
      if (!trip) {
        return;
      }

      playback.setPlaybackRunning(false);
      setSelectedSegmentId(segmentId);
      playback.setPlaybackProgress(trip.startProgressPercent);
      setTimelineVisible(true);
    },
    [playback, route],
  );

  return {
    route,
    historicalRoute,
    isLoadingRoute,
    selectedSegmentId,
    graphSegmentId,
    setRoute,
    setIsLoadingRoute,
    setSelectedSegmentId,
    setGraphSegmentId,
    playback,
    resetRoutes,
    beginRouteSelection,
    applySelectedRoutes,
    createSelectSegment,
  };
}
