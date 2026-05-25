import {
  deriveTripSegmentState,
  getTripSegmentSpeedBand,
  type PlaybackRoute,
  type RoutePoint,
  type RouteSegmentMarker,
  formatDistanceLabel,
  formatDurationLabel,
  formatSpeedLabel,
  type TripSegment,
} from "../../../domain/models/playback";
import { getDistanceMeters } from "../../../domain/utils/geo";
import type { DatapointLike, OpenRemoteDatapointHistory } from "../models/openRemoteDatapoints";
import { getOpenRemoteLocationFromValue, toOpenRemoteIso } from "./openRemoteAssetAttributes";
import {
  findNearestOpenRemoteNumber,
  getOpenRemoteDatapointTimestamp,
  getOpenRemoteDatapointValue,
  getSortedOpenRemoteDatapoints,
} from "./openRemoteDatapointMapper";
import { createOpenRemoteTimelineSamples } from "./openRemoteTelemetryMapper";

const DEFAULT_LOCATION_INTERVAL_MS = 60 * 1000;
const MIN_SIGNAL_CARRY_WINDOW_MS = 120 * 1000;
const MIN_OFFLINE_GAP_MS = 10 * 60 * 1000;
const FALLBACK_TRIP_END_STATIONARY_MS = 10 * 60 * 1000;
const MOVEMENT_SPEED_THRESHOLD_KPH = 5;
const MOVEMENT_DISPLACEMENT_THRESHOLD_METERS = 25;
const IDLE_MARKER_MS = 2 * 60 * 1000;
const BREAK_MARKER_MS = 10 * 60 * 1000;
const SIGNAL_MARKER_MS = 60 * 1000;
const SIGNAL_MARKER_MIN_POINTS = 2;

interface PlaybackTiming {
  medianIntervalMs: number;
  signalCarryWindowMs: number;
  offlineGapMs: number;
}

interface RoutePointSegment {
  startIndex: number;
  points: RoutePoint[];
}

interface OfflineGap {
  startIndex: number;
  endIndex: number;
  durationMs: number;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
}

export function mapOpenRemoteDatapointsToPlaybackRoute(
  vehicleId: string,
  history: OpenRemoteDatapointHistory | null | undefined,
): PlaybackRoute | null {
  if (!history) return null;
  const gpsLocationDatapoints = getSortedOpenRemoteDatapoints(history, "gpsLocation");
  const locationDatapoints = gpsLocationDatapoints.length
    ? gpsLocationDatapoints
    : getSortedOpenRemoteDatapoints(history, "location");
  const locationSamples = locationDatapoints
    .map<{ timestamp: number; location: { latitude: number; longitude: number } } | null>((datapoint) => {
      const timestamp = getOpenRemoteDatapointTimestamp(datapoint);
      const location = getOpenRemoteLocationFromValue(getOpenRemoteDatapointValue(datapoint));
      if (timestamp === null || !location) return null;
      return { timestamp, location };
    })
    .filter((sample): sample is { timestamp: number; location: { latitude: number; longitude: number } } => sample !== null);

  const timing = createPlaybackTiming(locationSamples.map((sample) => sample.timestamp));
  const points = locationSamples.map<RoutePoint>(({ timestamp, location }) => ({
    latitude: location.latitude,
    longitude: location.longitude,
    timestampIso: toOpenRemoteIso(timestamp),
    speedKph: findNearestOpenRemoteNumberWithin(history, "speed", timestamp, timing.signalCarryWindowMs),
    directionDegrees: findNearestOpenRemoteNumberWithin(history, "direction", timestamp, timing.signalCarryWindowMs),
    ignitionOn: findNearestOpenRemoteBooleanWithin(history, "ignition", timestamp, timing.signalCarryWindowMs),
    movement: findNearestOpenRemoteBooleanWithin(history, "movement", timestamp, timing.signalCarryWindowMs),
    trip: findNearestOpenRemoteBooleanWithin(history, "trip", timestamp, timing.signalCarryWindowMs),
    gsmSignal: findNearestOpenRemoteNumberWithin(history, "gsmSignal", timestamp, timing.signalCarryWindowMs),
    gnssStatus: findNearestOpenRemoteBooleanWithin(history, "gnssStatus", timestamp, timing.signalCarryWindowMs),
    gnssHdop: findNearestOpenRemoteNumberWithin(history, "gnssHdop", timestamp, timing.signalCarryWindowMs),
    satellites: findNearestOpenRemoteNumberWithin(history, "satellites", timestamp, timing.signalCarryWindowMs),
  }));

  if (!points.length) return null;

  const pointSegments = splitRoutePointSegments(points, timing.offlineGapMs);
  const routePoints = pointSegments.length
    ? deduplicateRoutePointSegments(pointSegments).flatMap((segment) => segment.points)
    : points;
  const tripSegments = createTripSegments(vehicleId, routePoints, history, timing);
  return { vehicleId, points: routePoints, tripSegments };
}

function createPlaybackTiming(timestamps: number[]): PlaybackTiming {
  const medianIntervalMs = getMedianIntervalMs(timestamps) ?? DEFAULT_LOCATION_INTERVAL_MS;
  return {
    medianIntervalMs,
    signalCarryWindowMs: Math.max(MIN_SIGNAL_CARRY_WINDOW_MS, medianIntervalMs * 3),
    offlineGapMs: Math.max(MIN_OFFLINE_GAP_MS, medianIntervalMs * 3),
  };
}

function getMedianIntervalMs(timestamps: number[]): number | null {
  const intervals = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index])
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .sort((left, right) => left - right);
  if (!intervals.length) return null;
  const midpoint = Math.floor(intervals.length / 2);
  return intervals.length % 2 === 0
    ? (intervals[midpoint - 1] + intervals[midpoint]) / 2
    : intervals[midpoint];
}

function findNearestOpenRemoteValueWithin(
  history: OpenRemoteDatapointHistory,
  attributeName: string,
  timestamp: number,
  carryWindowMs: number,
): unknown {
  let nearest: DatapointLike | undefined;
  getSortedOpenRemoteDatapoints(history, attributeName).forEach((point) => {
    const pointTimestamp = getOpenRemoteDatapointTimestamp(point);
    if (pointTimestamp === null || pointTimestamp > timestamp) return;
    if (timestamp - pointTimestamp <= carryWindowMs) {
      nearest = point;
    }
  });
  return nearest ? getOpenRemoteDatapointValue(nearest) : undefined;
}

function findNearestOpenRemoteNumberWithin(
  history: OpenRemoteDatapointHistory,
  attributeName: string,
  timestamp: number,
  carryWindowMs: number,
): number | undefined {
  const value = findNearestOpenRemoteValueWithin(history, attributeName, timestamp, carryWindowMs);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function findNearestOpenRemoteBooleanWithin(
  history: OpenRemoteDatapointHistory,
  attributeName: string,
  timestamp: number,
  carryWindowMs: number,
): boolean | undefined {
  const value = findNearestOpenRemoteValueWithin(history, attributeName, timestamp, carryWindowMs);
  return typeof value === "boolean" ? value : typeof value === "number" ? value > 0 : undefined;
}

function createTripSegments(
  vehicleId: string,
  points: RoutePoint[],
  history: OpenRemoteDatapointHistory,
  timing: PlaybackTiming,
): TripSegment[] {
  if (points.length <= 1) {
    return [];
  }

  const offlineGaps = getOfflineGaps(points, timing.offlineGapMs);
  const routeLineSegments = splitRoutePointSegments(points, timing.offlineGapMs);
  const tripPointSegments = routeLineSegments.flatMap((segment) =>
    segment.points.some((point) => typeof point.trip === "boolean")
      ? splitTripStatePointSegment(segment)
      : splitFallbackTripPointSegment(segment),
  );

  return tripPointSegments.map((segment, segmentIndex) =>
    createTripSegment({
      vehicleId,
      points: segment.points,
      history,
      offlineGaps,
      segmentIndex,
      startPointIndex: segment.startIndex,
      totalPointCount: points.length,
    }),
  );
}

function splitRoutePointSegments(points: RoutePoint[], offlineGapMs: number): RoutePointSegment[] {
  const segments: RoutePointSegment[] = [];
  let startIndex = 0;

  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    const previousMs = getRoutePointTimestampMs(points[pointIndex - 1]);
    const currentMs = getRoutePointTimestampMs(points[pointIndex]);
    const gapMs = currentMs - previousMs;

    if (isOfflineRouteGap(points[pointIndex - 1], points[pointIndex], gapMs, offlineGapMs)) {
      appendRoutePointSegment(segments, startIndex, points.slice(startIndex, pointIndex));
      startIndex = pointIndex;
    }
  }

  appendRoutePointSegment(segments, startIndex, points.slice(startIndex));
  return segments;
}

function deduplicateRoutePointSegments(
  segments: RoutePointSegment[],
): RoutePointSegment[] {
  const latestSegmentBySignature = new Map<string, RoutePointSegment>();
  segments.forEach((segment) => {
    latestSegmentBySignature.set(getRoutePointSegmentSignature(segment.points), segment);
  });

  return segments.filter((segment) => latestSegmentBySignature.get(getRoutePointSegmentSignature(segment.points)) === segment);
}

function getRoutePointSegmentSignature(points: RoutePoint[]): string {
  return points.map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`).join("|");
}

function appendRoutePointSegment(
  segments: RoutePointSegment[],
  startIndex: number,
  points: RoutePoint[],
) {
  if (points.length > 1) {
    segments.push({ startIndex, points });
  }
}

function getOfflineGaps(points: RoutePoint[], offlineGapMs: number): OfflineGap[] {
  const gaps: OfflineGap[] = [];
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    const previousPoint = points[pointIndex - 1];
    const currentPoint = points[pointIndex];
    const durationMs = getRoutePointTimestampMs(currentPoint) - getRoutePointTimestampMs(previousPoint);
    if (isOfflineRouteGap(previousPoint, currentPoint, durationMs, offlineGapMs)) {
      gaps.push({
        startIndex: pointIndex - 1,
        endIndex: pointIndex,
        durationMs,
        startPoint: previousPoint,
        endPoint: currentPoint,
      });
    }
  }
  return gaps;
}

function isOfflineRouteGap(previousPoint: RoutePoint, currentPoint: RoutePoint, gapMs: number, offlineGapMs: number): boolean {
  if (!Number.isFinite(gapMs) || gapMs <= offlineGapMs) {
    return false;
  }

  const stationaryAtSameLocation = isStationaryRoutePoint(previousPoint)
    && isStationaryRoutePoint(currentPoint)
    && getDistanceMeters(previousPoint, currentPoint) <= MOVEMENT_DISPLACEMENT_THRESHOLD_METERS;
  return !stationaryAtSameLocation;
}

function splitTripStatePointSegment(segment: RoutePointSegment): RoutePointSegment[] {
  const segments: RoutePointSegment[] = [];
  let currentStartIndex: number | null = null;

  segment.points.forEach((point, localIndex) => {
    if (point.trip === true && currentStartIndex === null) {
      currentStartIndex = localIndex;
    }

    if (point.trip === false && currentStartIndex !== null) {
      appendRoutePointSegment(
        segments,
        segment.startIndex + currentStartIndex,
        segment.points.slice(currentStartIndex, localIndex + 1),
      );
      currentStartIndex = null;
    }
  });

  if (currentStartIndex !== null) {
    appendRoutePointSegment(
      segments,
      segment.startIndex + currentStartIndex,
      segment.points.slice(currentStartIndex),
    );
  }

  return segments;
}

function splitFallbackTripPointSegment(segment: RoutePointSegment): RoutePointSegment[] {
  const segments: RoutePointSegment[] = [];
  let currentStartIndex: number | null = null;
  let stationaryStartIndex: number | null = null;

  segment.points.forEach((point, localIndex) => {
    const previousPoint = localIndex > 0 ? segment.points[localIndex - 1] : undefined;
    const moving = hasMovementEvidence(point, previousPoint);
    const stationary = isStationaryRoutePoint(point);

    if (currentStartIndex === null && moving) {
      currentStartIndex = previousPoint && hasDisplacementMovementEvidence(previousPoint, point)
        ? Math.max(0, localIndex - 1)
        : localIndex;
      stationaryStartIndex = null;
    }

    if (currentStartIndex === null) {
      return;
    }

    if (stationary) {
      stationaryStartIndex ??= localIndex;
      const stationaryDurationMs = getRoutePointTimestampMs(point) - getRoutePointTimestampMs(segment.points[stationaryStartIndex]);
      if (Number.isFinite(stationaryDurationMs) && stationaryDurationMs >= FALLBACK_TRIP_END_STATIONARY_MS) {
        appendRoutePointSegment(
          segments,
          segment.startIndex + currentStartIndex,
          segment.points.slice(currentStartIndex, localIndex + 1),
        );
        currentStartIndex = null;
        stationaryStartIndex = null;
        return;
      }
    } else {
      stationaryStartIndex = null;
    }

    if (point.ignitionOn === false) {
      appendRoutePointSegment(
        segments,
        segment.startIndex + currentStartIndex,
        segment.points.slice(currentStartIndex, localIndex + 1),
      );
      currentStartIndex = null;
      stationaryStartIndex = null;
    }
  });

  if (currentStartIndex !== null) {
    appendRoutePointSegment(
      segments,
      segment.startIndex + currentStartIndex,
      segment.points.slice(currentStartIndex),
    );
  }

  return segments.length ? segments : [segment];
}

function hasMovementEvidence(point: RoutePoint, previousPoint?: RoutePoint): boolean {
  return (
    (typeof point.speedKph === "number" && point.speedKph > MOVEMENT_SPEED_THRESHOLD_KPH)
    || point.movement === true
    || (previousPoint ? hasDisplacementMovementEvidence(previousPoint, point) : false)
  );
}

function hasDisplacementMovementEvidence(previousPoint: RoutePoint, point: RoutePoint): boolean {
  return getDistanceMeters(previousPoint, point) > MOVEMENT_DISPLACEMENT_THRESHOLD_METERS;
}

function getRoutePointTimestampMs(point: RoutePoint): number {
  return new Date(point.timestampIso).valueOf();
}

function getRouteProgressPercent(pointIndex: number, totalPointCount: number): number {
  if (totalPointCount <= 1) {
    return 0;
  }

  return (pointIndex / (totalPointCount - 1)) * 100;
}

function isStationaryRoutePoint(point: RoutePoint): boolean {
  return (typeof point.speedKph === "number" && point.speedKph <= 0) || point.movement === false;
}

function countStopEvents(points: RoutePoint[]): number {
  let stopCount = 0;
  let previousPointWasStationary = false;

  points.forEach((point) => {
    const stationary = isStationaryRoutePoint(point);
    if (stationary && !previousPointWasStationary) {
      stopCount += 1;
    }
    previousPointWasStationary = stationary;
  });

  return stopCount;
}

interface CreateRouteSegmentMarkersInput {
  points: RoutePoint[];
  segmentIndex: number;
  startPointIndex: number;
  offlineGaps: OfflineGap[];
}

function createRouteSegmentMarkers({
  points,
  segmentIndex,
  startPointIndex,
  offlineGaps,
}: CreateRouteSegmentMarkersInput): RouteSegmentMarker[] {
  return [
    ...createStationaryMarkers(points, segmentIndex),
    ...createEngineOffMarkers(points, segmentIndex),
    ...createOfflineMarkers(points, segmentIndex, startPointIndex, offlineGaps),
    ...createSignalMarkers(points, segmentIndex),
  ].sort((left, right) => getMarkerSortKey(left) - getMarkerSortKey(right));
}

function getMarkerSortKey(marker: RouteSegmentMarker): number {
  const typeOrder: Record<RouteSegmentMarker["type"], number> = {
    stop: 1,
    idle: 2,
    break: 3,
    engineOff: 4,
    offline: 5,
    signal: 6,
    alarm: 7,
  };
  return new Date(marker.timestampIso).valueOf() * 10 + typeOrder[marker.type];
}

function createStationaryMarkers(points: RoutePoint[], segmentIndex: number): RouteSegmentMarker[] {
  const markers: RouteSegmentMarker[] = [];
  let runStartIndex: number | null = null;

  for (let pointIndex = 0; pointIndex <= points.length; pointIndex += 1) {
    const point = points[pointIndex];
    if (point && isStationaryRoutePoint(point)) {
      runStartIndex ??= pointIndex;
      continue;
    }

    if (runStartIndex === null) {
      continue;
    }

    const startPoint = points[runStartIndex];
    const endPoint = points[pointIndex - 1] ?? startPoint;
    const durationMs = getRoutePointTimestampMs(endPoint) - getRoutePointTimestampMs(startPoint);
    const durationMinutes = durationMs > 0 ? Math.max(1, Math.round(durationMs / 60000)) : undefined;
    const ignitionOn = points.slice(runStartIndex, pointIndex).some((candidate) => candidate.ignitionOn === true);

    markers.push(createRouteSegmentMarker(segmentIndex, "stop", startPoint, "Stop", durationMinutes));
    if (ignitionOn && durationMs >= IDLE_MARKER_MS) {
      markers.push(createRouteSegmentMarker(segmentIndex, "idle", startPoint, "Idling", durationMinutes));
    }
    if (durationMs >= BREAK_MARKER_MS) {
      markers.push(createRouteSegmentMarker(segmentIndex, "break", startPoint, "Driver break", durationMinutes));
    }

    runStartIndex = null;
  }

  return markers;
}

function createEngineOffMarkers(points: RoutePoint[], segmentIndex: number): RouteSegmentMarker[] {
  const markers: RouteSegmentMarker[] = [];
  let previousPointWasEngineOff = false;

  points.forEach((point) => {
    const engineOff = point.ignitionOn === false;
    if (engineOff && !previousPointWasEngineOff) {
      markers.push(createRouteSegmentMarker(segmentIndex, "engineOff", point, "Engine off"));
    }
    previousPointWasEngineOff = engineOff;
  });

  return markers;
}

function createOfflineMarkers(
  points: RoutePoint[],
  segmentIndex: number,
  startPointIndex: number,
  offlineGaps: OfflineGap[],
): RouteSegmentMarker[] {
  const endPointIndex = startPointIndex + points.length - 1;
  return offlineGaps
    .filter((gap) => gap.startIndex >= startPointIndex && gap.startIndex <= endPointIndex)
    .map((gap) => createRouteSegmentMarker(
      segmentIndex,
      "offline",
      gap.startPoint,
      "Offline period",
      Math.round(gap.durationMs / 60000),
    ));
}

function createSignalMarkers(points: RoutePoint[], segmentIndex: number): RouteSegmentMarker[] {
  const markers: RouteSegmentMarker[] = [];
  let runStartIndex: number | null = null;

  for (let pointIndex = 0; pointIndex <= points.length; pointIndex += 1) {
    const point = points[pointIndex];
    if (point && hasPoorSignal(point)) {
      runStartIndex ??= pointIndex;
      continue;
    }

    if (runStartIndex === null) {
      continue;
    }

    const startPoint = points[runStartIndex];
    const endPoint = points[pointIndex - 1] ?? startPoint;
    const durationMs = getRoutePointTimestampMs(endPoint) - getRoutePointTimestampMs(startPoint);
    const runLength = pointIndex - runStartIndex;
    if (durationMs >= SIGNAL_MARKER_MS || runLength >= SIGNAL_MARKER_MIN_POINTS) {
      markers.push(createRouteSegmentMarker(
        segmentIndex,
        "signal",
        startPoint,
        "Signal degraded",
        durationMs > 0 ? Math.round(durationMs / 60000) : undefined,
      ));
    }

    runStartIndex = null;
  }

  return markers;
}

function hasPoorSignal(point: RoutePoint): boolean {
  return (
    (typeof point.gsmSignal === "number" && point.gsmSignal <= 2)
    || point.gnssStatus === false
    || (typeof point.gnssHdop === "number" && point.gnssHdop >= 3)
    || (typeof point.satellites === "number" && point.satellites < 4)
  );
}

function createRouteSegmentMarker(
  segmentIndex: number,
  type: RouteSegmentMarker["type"],
  point: RoutePoint,
  label: string,
  durationMinutes?: number,
): RouteSegmentMarker {
  return {
    id: `segment-${segmentIndex + 1}-${type}-${point.timestampIso}`,
    type,
    timestampIso: point.timestampIso,
    latitude: point.latitude,
    longitude: point.longitude,
    label,
    durationMinutes,
  };
}

interface CreateTripSegmentInput {
  vehicleId: string;
  points: RoutePoint[];
  history: OpenRemoteDatapointHistory;
  offlineGaps: OfflineGap[];
  segmentIndex: number;
  startPointIndex: number;
  totalPointCount: number;
}

function createTripSegment({
  vehicleId,
  points,
  history,
  offlineGaps,
  segmentIndex,
  startPointIndex,
  totalPointCount,
}: CreateTripSegmentInput): TripSegment {
  const startPoint = points[0];
  const endPoint = points.at(-1) ?? startPoint;
  const startMs = new Date(startPoint.timestampIso).valueOf();
  const endMs = new Date(endPoint.timestampIso).valueOf();
  const endPointIndex = startPointIndex + points.length - 1;
  const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
  const distanceKm = points.slice(1).reduce((distance, point, index) => distance + getDistanceMeters(points[index], point) / 1000, 0);
  const speeds = points.map((point) => point.speedKph ?? 0);
  const maxSpeedKph = Math.max(...speeds);
  const averageSpeedKph = Math.round(speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length);
  const activeAlarmCount = Math.round(findNearestOpenRemoteNumber(history, "activeAlertCount", startMs) ?? 0);
  const markers = createRouteSegmentMarkers({
    points,
    segmentIndex,
    startPointIndex,
    offlineGaps,
  });
  const stopMarker = markers.find((marker) => marker.type === "stop");
  const breakMarker = markers.find((marker) => marker.type === "break");
  const hasEngineOffMarker = markers.some((marker) => marker.type === "engineOff");
  const state = deriveTripSegmentState({
    speedKph: averageSpeedKph,
    ignitionOn: hasEngineOffMarker ? false : startPoint.ignitionOn,
    movement: startPoint.movement,
    activeAlarmCount,
    stopDurationMinutes: stopMarker?.durationMinutes,
    breakDurationMinutes: breakMarker?.durationMinutes,
  });
  const telemetrySamples = createOpenRemoteTimelineSamples(history);

  return {
    id: `${vehicleId}-segment-${segmentIndex + 1}`,
    startLabel: "Start",
    endLabel: "End",
    startTimeIso: startPoint.timestampIso,
    endTimeIso: endPoint.timestampIso,
    durationLabel: formatDurationLabel(durationMinutes),
    durationMinutes,
    distanceLabel: formatDistanceLabel(distanceKm),
    distanceKm: Number(distanceKm.toFixed(1)),
    stopCount: countStopEvents(points),
    maxSpeedLabel: formatSpeedLabel(maxSpeedKph),
    maxSpeedKph: Math.round(maxSpeedKph),
    averageSpeedLabel: formatSpeedLabel(averageSpeedKph),
    averageSpeedKph,
    startProgressPercent: getRouteProgressPercent(startPointIndex, totalPointCount),
    endProgressPercent: getRouteProgressPercent(endPointIndex, totalPointCount),
    telemetryState: {
      state,
      speedBand: getTripSegmentSpeedBand(averageSpeedKph),
      speedKph: averageSpeedKph,
      ignitionOn: hasEngineOffMarker ? false : startPoint.ignitionOn,
      movement: startPoint.movement,
      activeAlarmCount,
      stopDurationMinutes: stopMarker?.durationMinutes,
      breakDurationMinutes: breakMarker?.durationMinutes,
    },
    state,
    speedBand: getTripSegmentSpeedBand(averageSpeedKph),
    markers,
    directionSamples: points
      .filter((point) => typeof point.directionDegrees === "number")
      .map((point) => ({
        timestampIso: point.timestampIso,
        latitude: point.latitude,
        longitude: point.longitude,
        directionDegrees: point.directionDegrees ?? 0,
      })),
    telemetrySamples,
    eventMarkers: [],
    graphSeries: points.map((point) => ({
      timestampIso: point.timestampIso,
      speedKph: point.speedKph ?? 0,
      fuelLevelPercent: findNearestOpenRemoteNumber(history, "fuelLevel", new Date(point.timestampIso).valueOf()) ?? 0,
    })),
  };
}
