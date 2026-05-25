import { useCallback, useEffect, useMemo, useState } from "react";
import type { FleetAlert } from "../../../domain/models/alerts";
import type { PlaybackQuery, PlaybackRoute, TripSegment } from "../../../domain/models/playback";
import type { Vehicle } from "../../../domain/models/vehicle";
import { addCriticalAlertEventMarkersToRoute, getReachedCriticalRouteAlerts } from "../../components/map/routeSegments/routeAlarmMarkers";
import {
  getCurrentRouteHeadingDegrees,
  getCurrentRouteSpeedKph,
  getCurrentRouteTelemetryState,
  getCurrentRouteTimestampIso,
  getCurrentTripId,
  getSegmentPolyline,
  interpolatePlaybackRoutePosition,
  toMapPolyline,
} from "../../components/playback/playbackUtils";
import { usePlaybackController } from "../../components/playback/usePlaybackController";
import { useRepositoryQuery } from "../../hooks/useRepositoryQuery";
import { useAppServices } from "../../providers/AppServicesProvider";
import { buildRoutePlaybackVehicleViewModel } from "../../components/playback/routePlaybackVehicleViewModel";
import { getPlaybackQueryCalendarDateValue, getPlaybackQueryCalendarMonth } from "./playbackDateUtils";
import { usePlaybackRouteQuery, usePlaybackVehiclesQuery } from "./usePlaybackQueries";

export interface RoutePlaybackWorkspace {
  activeCalendarDateValue: string;
  activeSegmentLine: [number, number][];
  alerts: FleetAlert[];
  beginTimelineScrub: () => void;
  calendarMonth: ReturnType<typeof getPlaybackQueryCalendarMonth>;
  currentRouteHeadingDegrees: number | null;
  currentRouteSpeedKph: number;
  currentRouteTimestampIso: string | null;
  endTimelineScrub: () => void;
  fastForwardPlayback: () => void;
  graphSegment: TripSegment | null;
  isLoadingRoute: boolean;
  isLoadingVehicles: boolean;
  isPlaybackRunning: boolean;
  playbackProgress: number;
  playbackSpeed: number;
  playbackVehicle: Vehicle | null;
  query: PlaybackQuery;
  reachedCriticalAlerts: FleetAlert[];
  resetPlayback: (options?: { progress?: number }) => void;
  rewindPlayback: () => void;
  route: PlaybackRoute | null;
  routeForSelectedVehicle: PlaybackRoute | null;
  routeLine: [number, number][];
  routeWithAlertMarkers: PlaybackRoute | null;
  selectTripSegment: (segmentId: string) => void;
  selectedSegment: TripSegment | null;
  selectedSegmentId: string | null;
  selectedVehicle: Vehicle | null;
  selectedVehicleId: string | null;
  setGraphSegmentId: (segmentId: string | null) => void;
  setPlaybackProgress: ReturnType<typeof usePlaybackController>["setPlaybackProgress"];
  setPlaybackRunning: ReturnType<typeof usePlaybackController>["setPlaybackRunning"];
  setPlaybackSpeed: ReturnType<typeof usePlaybackController>["setPlaybackSpeed"];
  setQuery: (query: PlaybackQuery) => void;
  setSelectedSegmentId: (segmentId: string | null) => void;
  setSelectedVehicleId: (vehicleId: string | null) => void;
  setTimelineHeightPx: (heightPx: number) => void;
  timelineHeightPx: number;
  togglePlayback: () => void;
  vehicles: Vehicle[];
}

export function useRoutePlaybackWorkspace(): RoutePlaybackWorkspace {
  const { alertsRepository, playbackRepository } = useAppServices();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [query, setQuery] = useState<PlaybackQuery>({ preset: "today" });
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [graphSegmentId, setGraphSegmentId] = useState<string | null>(null);
  const [timelineHeightPx, setTimelineHeightPx] = useState(0);

  const { data: vehicles, isLoading: isLoadingVehicles } = usePlaybackVehiclesQuery(playbackRepository);
  const effectiveSelectedVehicleId = useMemo(() => {
    if (selectedVehicleId && vehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      return selectedVehicleId;
    }

    return vehicles[0]?.id ?? null;
  }, [selectedVehicleId, vehicles]);
  const { data: alerts } = useRepositoryQuery<FleetAlert[]>({
    initialData: [],
    keepPreviousData: false,
    query: useCallback(() => alertsRepository.listAlerts(), [alertsRepository]),
  });
  const { data: route, isLoading: isLoadingRoute } = usePlaybackRouteQuery(playbackRepository, effectiveSelectedVehicleId, query);
  const {
    beginTimelineScrub,
    endTimelineScrub,
    fastForwardPlayback,
    isPlaybackRunning,
    playbackProgress,
    playbackSpeed,
    resetPlayback,
    rewindPlayback,
    setPlaybackProgress,
    setPlaybackRunning,
    setPlaybackSpeed,
    togglePlayback,
  } = usePlaybackController(route, { enabled: route?.vehicleId === effectiveSelectedVehicleId });

  useEffect(() => {
    setSelectedVehicleId((current) => {
      if (current && vehicles.some((vehicle) => vehicle.id === current)) {
        return current;
      }

      return vehicles[0]?.id ?? null;
    });
  }, [vehicles]);

  useEffect(() => {
    if (!effectiveSelectedVehicleId) {
      setSelectedSegmentId(null);
      return;
    }

    resetPlayback({ progress: 0 });
    setTimelineHeightPx(0);
  }, [effectiveSelectedVehicleId, query, resetPlayback]);

  useEffect(() => {
    setSelectedSegmentId(route?.tripSegments[0]?.id ?? null);
    setPlaybackProgress(route?.tripSegments[0]?.startProgressPercent ?? 0, { markInspection: false });
  }, [route, setPlaybackProgress]);

  useEffect(() => {
    if (!route?.tripSegments.length || route.vehicleId !== effectiveSelectedVehicleId) {
      setSelectedSegmentId(null);
      return;
    }

    setSelectedSegmentId(getCurrentTripId(route.tripSegments, playbackProgress));
  }, [effectiveSelectedVehicleId, playbackProgress, route]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === effectiveSelectedVehicleId) ?? null,
    [effectiveSelectedVehicleId, vehicles],
  );
  const routeForSelectedVehicle = useMemo(
    () => (selectedVehicle && route?.vehicleId === selectedVehicle.id ? route : null),
    [route, selectedVehicle],
  );
  const routeWithAlertMarkers = useMemo(
    () => addCriticalAlertEventMarkersToRoute(routeForSelectedVehicle, alerts),
    [alerts, routeForSelectedVehicle],
  );
  const selectedSegment = useMemo(
    () => routeWithAlertMarkers?.tripSegments.find((trip) => trip.id === selectedSegmentId) ?? null,
    [routeWithAlertMarkers, selectedSegmentId],
  );
  const routeLine = useMemo(() => toMapPolyline(routeWithAlertMarkers), [routeWithAlertMarkers]);
  const activeSegmentLine = useMemo(
    () => getSegmentPolyline(routeWithAlertMarkers, selectedSegment),
    [routeWithAlertMarkers, selectedSegment],
  );
  const playbackPosition = useMemo(
    () =>
      routeWithAlertMarkers
        ? interpolatePlaybackRoutePosition(routeWithAlertMarkers, playbackProgress)
        : selectedVehicle
          ? ([selectedVehicle.latitude, selectedVehicle.longitude] as [number, number])
          : null,
    [playbackProgress, routeWithAlertMarkers, selectedVehicle],
  );
  const currentRouteSpeedKph = useMemo(
    () => (routeWithAlertMarkers ? getCurrentRouteSpeedKph(routeWithAlertMarkers, playbackProgress) : selectedVehicle?.speedKph ?? 0),
    [playbackProgress, routeWithAlertMarkers, selectedVehicle?.speedKph],
  );
  const currentRouteHeadingDegrees = useMemo(
    () => (routeWithAlertMarkers ? getCurrentRouteHeadingDegrees(routeWithAlertMarkers, playbackProgress) : selectedVehicle?.heading ?? null),
    [playbackProgress, routeWithAlertMarkers, selectedVehicle?.heading],
  );
  const currentRouteTelemetryState = useMemo(
    () => (routeWithAlertMarkers ? getCurrentRouteTelemetryState(routeWithAlertMarkers, playbackProgress) : null),
    [playbackProgress, routeWithAlertMarkers],
  );
  const currentRouteTimestampIso = useMemo(
    () => (routeWithAlertMarkers ? getCurrentRouteTimestampIso(routeWithAlertMarkers, playbackProgress) : null),
    [playbackProgress, routeWithAlertMarkers],
  );
  const reachedCriticalAlerts = useMemo(
    () => getReachedCriticalRouteAlerts(routeWithAlertMarkers, alerts, playbackProgress),
    [alerts, playbackProgress, routeWithAlertMarkers],
  );
  const playbackVehicle = useMemo(() => {
    if (!selectedVehicle || !playbackPosition) {
      return null;
    }

    return buildRoutePlaybackVehicleViewModel({
      vehicle: selectedVehicle,
      playbackPosition,
      speedKph: currentRouteSpeedKph,
      headingDegrees: currentRouteHeadingDegrees,
      timestampIso: currentRouteTimestampIso,
      activeAlertCount: reachedCriticalAlerts.length,
      hasRouteTelemetry: routeWithAlertMarkers !== null,
      routeIgnitionOn: currentRouteTelemetryState?.ignitionOn ?? null,
      routeMovement: currentRouteTelemetryState?.movement ?? null,
      routeTrip: currentRouteTelemetryState?.trip ?? null,
      routeGsmSignal: currentRouteTelemetryState?.gsmSignal ?? null,
      routeGnssStatus: currentRouteTelemetryState?.gnssStatus ?? null,
      routeGnssHdop: currentRouteTelemetryState?.gnssHdop ?? null,
      routeSatellites: currentRouteTelemetryState?.satellites ?? null,
      routeMarkerStatus: currentRouteTelemetryState?.markerStatus ?? null,
    });
  }, [
    currentRouteHeadingDegrees,
    currentRouteSpeedKph,
    currentRouteTelemetryState,
    currentRouteTimestampIso,
    playbackPosition,
    reachedCriticalAlerts.length,
    routeWithAlertMarkers,
    selectedVehicle,
  ]);
  const graphSegment = useMemo(
    () => routeWithAlertMarkers?.tripSegments.find((trip) => trip.id === graphSegmentId) ?? null,
    [graphSegmentId, routeWithAlertMarkers],
  );
  const calendarMonth = useMemo(() => getPlaybackQueryCalendarMonth(query), [query]);
  const activeCalendarDateValue = useMemo(() => getPlaybackQueryCalendarDateValue(query), [query]);

  const selectTripSegment = useCallback(
    (segmentId: string) => {
      const nextTrip = routeWithAlertMarkers?.tripSegments.find((trip) => trip.id === segmentId);
      if (!nextTrip) {
        return;
      }

      setSelectedSegmentId(segmentId);
      setPlaybackRunning(false);
      setPlaybackProgress(nextTrip.startProgressPercent);
    },
    [routeWithAlertMarkers, setPlaybackProgress, setPlaybackRunning],
  );

  return {
    activeCalendarDateValue,
    activeSegmentLine,
    alerts,
    beginTimelineScrub,
    calendarMonth,
    currentRouteHeadingDegrees,
    currentRouteSpeedKph,
    currentRouteTimestampIso,
    endTimelineScrub,
    fastForwardPlayback,
    graphSegment,
    isLoadingRoute,
    isLoadingVehicles,
    isPlaybackRunning,
    playbackProgress,
    playbackSpeed,
    playbackVehicle,
    query,
    reachedCriticalAlerts,
    resetPlayback,
    rewindPlayback,
    route,
    routeForSelectedVehicle,
    routeLine,
    routeWithAlertMarkers,
    selectTripSegment,
    selectedSegment,
    selectedSegmentId,
    selectedVehicle,
    selectedVehicleId: effectiveSelectedVehicleId,
    setGraphSegmentId,
    setPlaybackProgress,
    setPlaybackRunning,
    setPlaybackSpeed,
    setQuery,
    setSelectedSegmentId,
    setSelectedVehicleId,
    setTimelineHeightPx,
    timelineHeightPx,
    togglePlayback,
    vehicles,
  };
}
