import {
  PlaybackRoute,
  RouteSegmentMarker,
  RouteSegmentMarkerType,
  TripSegment,
  getPointIndex,
} from "../../../domain/models/playback";
import type { AppTimeFormat } from "../../../domain/models/preferences";
import type { VehicleMarkerStatusOverride } from "../../../domain/models/vehicle";
import { formatUtcTimestampTimeLabel } from "../../../domain/utils/dateTime";
import { getRoundedBearingDegrees as getBearingDegrees } from "../../../domain/utils/geo";

const DEFAULT_PLAYBACK_POSITION: [number, number] = [51.4416, 5.4697];
const SIMULATED_MINUTES_PER_REAL_SECOND = 1;
const INSTANT_ROUTE_MARKER_WINDOW_MS = 2 * 60 * 1000;

const ROUTE_MARKER_STATUS_BY_TYPE: Partial<Record<RouteSegmentMarkerType, VehicleMarkerStatusOverride>> = {
  stop: "stopped",
  idle: "idling",
  break: "driverBreak",
  engineOff: "parked",
  offline: "offline",
  signal: "signalDegraded",
};

const ROUTE_MARKER_STATUS_PRIORITY: Record<VehicleMarkerStatusOverride, number> = {
  offline: 7,
  parked: 6,
  driverBreak: 5,
  signalDegraded: 4,
  idling: 3,
  stopped: 2,
  stationary: 1,
  moving: 0,
};

export interface CurrentRouteTelemetryState {
  ignitionOn?: boolean;
  movement?: boolean;
  markerStatus?: VehicleMarkerStatusOverride;
  trip?: boolean;
  gsmSignal?: number;
  gnssStatus?: boolean;
  gnssHdop?: number;
  satellites?: number;
}

export {
  formatDistanceLabel,
  formatDurationLabel,
  formatSpeedLabel,
  getPointIndex,
} from "../../../domain/models/playback";

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

function getTimestampMs(timestampIso?: string | null): number | null {
  if (!timestampIso) {
    return null;
  }

  const timestampMs = new Date(timestampIso).valueOf();
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

export function toMapPolyline(route: PlaybackRoute | null): [number, number][] {
  if (!route) {
    return [];
  }

  return route.points.map((point) => [point.latitude, point.longitude]);
}

export function interpolatePlaybackPosition(points: [number, number][], progress: number): [number, number] {
  if (!points.length) {
    return DEFAULT_PLAYBACK_POSITION;
  }

  if (points.length === 1) {
    return points[0];
  }

  const progressRatio = progress / 100;
  const exactIndex = progressRatio * (points.length - 1);
  const lowerIndex = Math.floor(exactIndex);
  const upperIndex = Math.ceil(exactIndex);
  const fractional = exactIndex - lowerIndex;

  const lower = points[lowerIndex] ?? points[0];
  const upper = points[upperIndex] ?? points[points.length - 1];

  return [lower[0] + (upper[0] - lower[0]) * fractional, lower[1] + (upper[1] - lower[1]) * fractional];
}

function getSegmentPoints(route: PlaybackRoute, segment: TripSegment) {
  const startIndex = getPointIndex(route.points.length, segment.startProgressPercent);
  const endIndex = Math.max(startIndex, getPointIndex(route.points.length, segment.endProgressPercent));
  return route.points.slice(startIndex, endIndex + 1);
}

function getRouteBoundaryTimes(route: PlaybackRoute | null): { startMs: number; endMs: number } | null {
  const startMs = getTimestampMs(route?.points[0]?.timestampIso);
  const endMs = getTimestampMs(route?.points.at(-1)?.timestampIso);

  if (startMs === null || endMs === null || endMs <= startMs) {
    return null;
  }

  return { startMs, endMs };
}

function getSegmentForProgress(route: PlaybackRoute, progress: number): { segment: TripSegment; progress: number } | null {
  if (!route.tripSegments.length) {
    return null;
  }

  const normalizedProgress = clampProgress(progress);
  const segmentStartingAtProgress = route.tripSegments.find(
    (segment) => normalizedProgress === segment.startProgressPercent,
  );

  if (segmentStartingAtProgress) {
    return { segment: segmentStartingAtProgress, progress: normalizedProgress };
  }

  const activeSegment =
    route.tripSegments.find(
      (segment) =>
        normalizedProgress >= segment.startProgressPercent &&
        normalizedProgress < segment.endProgressPercent,
    ) ?? (normalizedProgress === 100 ? route.tripSegments.at(-1) : null);

  if (activeSegment) {
    return { segment: activeSegment, progress: normalizedProgress };
  }

  const nearestSegment = route.tripSegments.reduce<{ segment: TripSegment; distance: number } | null>((nearest, segment) => {
    const distance =
      normalizedProgress < segment.startProgressPercent
        ? segment.startProgressPercent - normalizedProgress
        : normalizedProgress - segment.endProgressPercent;

    if (!nearest || distance < nearest.distance) {
      return { segment, distance };
    }

    return nearest;
  }, null);

  if (!nearestSegment) {
    return null;
  }

  return {
    segment: nearestSegment.segment,
    progress: Math.min(
      nearestSegment.segment.endProgressPercent,
      Math.max(nearestSegment.segment.startProgressPercent, normalizedProgress),
    ),
  };
}

function getSegmentTimeAtProgress(segment: TripSegment, progress: number): number | null {
  const startMs = getTimestampMs(segment.startTimeIso);
  const endMs = getTimestampMs(segment.endTimeIso);

  if (startMs === null || endMs === null || endMs <= startMs) {
    return null;
  }

  const segmentSpan = Math.max(0.0001, segment.endProgressPercent - segment.startProgressPercent);
  const segmentRatio = Math.min(
    1,
    Math.max(0, (progress - segment.startProgressPercent) / segmentSpan),
  );

  return startMs + (endMs - startMs) * segmentRatio;
}

function getRouteTimeAtProgress(route: PlaybackRoute | null, progress: number): number | null {
  if (route?.tripSegments.length) {
    const segmentForProgress = getSegmentForProgress(route, progress);
    if (!segmentForProgress) {
      return null;
    }

    return getSegmentTimeAtProgress(segmentForProgress.segment, segmentForProgress.progress);
  }

  const boundaryTimes = getRouteBoundaryTimes(route);
  if (!boundaryTimes) {
    return null;
  }

  const progressRatio = clampProgress(progress) / 100;
  return boundaryTimes.startMs + (boundaryTimes.endMs - boundaryTimes.startMs) * progressRatio;
}

function getProgressForTimeWindow(
  targetMs: number,
  startMs: number,
  endMs: number,
  startProgress: number,
  endProgress: number,
) {
  if (endMs <= startMs || endProgress <= startProgress) {
    return clampProgress(startProgress);
  }

  const timeRatio = Math.min(1, Math.max(0, (targetMs - startMs) / (endMs - startMs)));
  return clampProgress(startProgress + (endProgress - startProgress) * timeRatio);
}

export function getPlaybackProgressForRouteTimestamp(route: PlaybackRoute | null, timestampIso: string): number | null {
  const targetMs = getTimestampMs(timestampIso);
  if (!route?.points.length || targetMs === null) {
    return null;
  }

  if (route.tripSegments.length) {
    const segmentWindows = route.tripSegments.flatMap((segment) => {
      const startMs = getTimestampMs(segment.startTimeIso);
      const endMs = getTimestampMs(segment.endTimeIso);

      return startMs !== null && endMs !== null && endMs > startMs
        ? [{ segment, startMs, endMs }]
        : [];
    });
    const matchingWindow = segmentWindows.find(({ startMs, endMs }) => targetMs >= startMs && targetMs <= endMs);
    const nearestWindow =
      matchingWindow ??
      segmentWindows.reduce<(typeof segmentWindows)[number] | null>((nearest, window) => {
        const nearestDistance = nearest
          ? Math.min(Math.abs(targetMs - nearest.startMs), Math.abs(targetMs - nearest.endMs))
          : Number.POSITIVE_INFINITY;
        const windowDistance = Math.min(Math.abs(targetMs - window.startMs), Math.abs(targetMs - window.endMs));

        return windowDistance < nearestDistance ? window : nearest;
      }, null);

    if (nearestWindow) {
      return getProgressForTimeWindow(
        targetMs,
        nearestWindow.startMs,
        nearestWindow.endMs,
        nearestWindow.segment.startProgressPercent,
        nearestWindow.segment.endProgressPercent,
      );
    }
  }

  const boundaryTimes = getRouteBoundaryTimes(route);
  if (!boundaryTimes) {
    return null;
  }

  return getProgressForTimeWindow(targetMs, boundaryTimes.startMs, boundaryTimes.endMs, 0, 100);
}

export function getPlaybackProgressForRouteRefresh(
  currentRoute: PlaybackRoute | null,
  nextRoute: PlaybackRoute | null,
  currentProgress: number,
): number | null {
  if (!currentRoute?.points.length || !nextRoute?.points.length) {
    return null;
  }

  const inspectedTimestampIso = getCurrentRouteTimestampIso(currentRoute, currentProgress);
  return inspectedTimestampIso ? getPlaybackProgressForRouteTimestamp(nextRoute, inspectedTimestampIso) : null;
}

function getRoutePointWindow(route: PlaybackRoute, progress: number) {
  const segmentForProgress = getSegmentForProgress(route, progress);
  const segmentPoints = segmentForProgress ? getSegmentPoints(route, segmentForProgress.segment) : route.points;
  const targetMs = segmentForProgress
    ? getSegmentTimeAtProgress(segmentForProgress.segment, segmentForProgress.progress)
    : getRouteTimeAtProgress(route, progress);

  if (targetMs === null) {
    return null;
  }

  for (let pointIndex = 0; pointIndex < segmentPoints.length - 1; pointIndex += 1) {
    const lower = segmentPoints[pointIndex];
    const upper = segmentPoints[pointIndex + 1];
    const lowerMs = new Date(lower.timestampIso).valueOf();
    const upperMs = new Date(upper.timestampIso).valueOf();

    if (targetMs >= lowerMs && targetMs <= upperMs) {
      const durationMs = Math.max(1, upperMs - lowerMs);
      return {
        lower,
        upper,
        fractional: Math.min(1, Math.max(0, (targetMs - lowerMs) / durationMs)),
      };
    }
  }

  const firstPoint = segmentPoints[0];
  if (firstPoint && targetMs <= new Date(firstPoint.timestampIso).valueOf()) {
    return { lower: firstPoint, upper: firstPoint, fractional: 0 };
  }

  const finalPoint = segmentPoints.at(-1);
  return finalPoint ? { lower: finalPoint, upper: finalPoint, fractional: 0 } : null;
}

export function interpolatePlaybackRoutePosition(route: PlaybackRoute | null, progress: number): [number, number] {
  if (!route?.points.length) {
    return DEFAULT_PLAYBACK_POSITION;
  }

  const pointWindow = getRoutePointWindow(route, progress);
  if (!pointWindow) {
    return interpolatePlaybackPosition(toMapPolyline(route), progress);
  }

  const { lower, upper, fractional } = pointWindow;
  return [
    lower.latitude + (upper.latitude - lower.latitude) * fractional,
    lower.longitude + (upper.longitude - lower.longitude) * fractional,
  ];
}

export function getCurrentRouteSpeedKph(route: PlaybackRoute | null, progress: number): number {
  if (!route?.points.length) {
    return 0;
  }

  const pointWindow = getRoutePointWindow(route, progress);
  if (!pointWindow) {
    return Math.round(route.points[0]?.speedKph ?? 0);
  }

  const lowerSpeed = pointWindow.lower.speedKph ?? 0;
  const upperSpeed = pointWindow.upper.speedKph ?? lowerSpeed;
  return Math.round(lowerSpeed + (upperSpeed - lowerSpeed) * pointWindow.fractional);
}

export function getCurrentRouteHeadingDegrees(route: PlaybackRoute | null, progress: number): number | null {
  if (!route?.points.length) {
    return null;
  }

  const pointWindow = getRoutePointWindow(route, progress);
  if (!pointWindow) {
    const firstPoint = route.points[0];
    const nextPoint = route.points[1];
    return typeof firstPoint.directionDegrees === "number"
      ? firstPoint.directionDegrees
      : nextPoint
        ? getBearingDegrees(firstPoint, nextPoint)
        : null;
  }

  if (typeof pointWindow.lower.directionDegrees === "number") {
    return Math.round(pointWindow.lower.directionDegrees);
  }

  if (
    pointWindow.lower.latitude !== pointWindow.upper.latitude ||
    pointWindow.lower.longitude !== pointWindow.upper.longitude
  ) {
    return getBearingDegrees(pointWindow.lower, pointWindow.upper);
  }

  const lowerIndex = route.points.findIndex((point) => point === pointWindow.lower);
  const previousPoint = route.points[lowerIndex - 1];
  return previousPoint ? getBearingDegrees(previousPoint, pointWindow.lower) : null;
}

function getCurrentBooleanRouteValue(
  route: PlaybackRoute,
  progress: number,
  key: "ignitionOn" | "movement" | "trip" | "gnssStatus",
): boolean | undefined {
  const pointWindow = getRoutePointWindow(route, progress);
  if (!pointWindow) {
    return route.points[0]?.[key];
  }

  return pointWindow.lower[key] ?? pointWindow.upper[key];
}

function getRouteMarkerStatusAtProgress(route: PlaybackRoute, progress: number): VehicleMarkerStatusOverride | undefined {
  const routeTimeMs = getRouteTimeAtProgress(route, progress);
  if (routeTimeMs === null) {
    return undefined;
  }

  const matchingStatuses = route.tripSegments
    .flatMap((segment) => segment.markers ?? [])
    .flatMap((marker: RouteSegmentMarker) => {
      const status = ROUTE_MARKER_STATUS_BY_TYPE[marker.type];
      const markerStartMs = getTimestampMs(marker.timestampIso);
      if (!status || markerStartMs === null) {
        return [];
      }

      const markerDurationMs =
        typeof marker.playbackWindowMinutes === "number" && marker.playbackWindowMinutes > 0
          ? marker.playbackWindowMinutes * 60_000
          : typeof marker.durationMinutes === "number" && marker.durationMinutes > 0
            ? marker.durationMinutes * 60_000
            : INSTANT_ROUTE_MARKER_WINDOW_MS;
      const markerEndMs = markerStartMs + markerDurationMs;

      return routeTimeMs >= markerStartMs && routeTimeMs <= markerEndMs ? [status] : [];
    });

  return matchingStatuses.sort(
    (left, right) => ROUTE_MARKER_STATUS_PRIORITY[right] - ROUTE_MARKER_STATUS_PRIORITY[left],
  )[0];
}

function getCurrentNumericRouteValue(
  route: PlaybackRoute,
  progress: number,
  key: "gsmSignal" | "gnssHdop" | "satellites",
): number | undefined {
  const pointWindow = getRoutePointWindow(route, progress);
  if (!pointWindow) {
    return route.points[0]?.[key];
  }

  return pointWindow.lower[key] ?? pointWindow.upper[key];
}

export function getCurrentRouteTelemetryState(
  route: PlaybackRoute | null,
  progress: number,
): CurrentRouteTelemetryState | null {
  if (!route?.points.length) {
    return null;
  }

  const state: CurrentRouteTelemetryState = {
    ignitionOn: getCurrentBooleanRouteValue(route, progress, "ignitionOn"),
    movement: getCurrentBooleanRouteValue(route, progress, "movement"),
  };

  const trip = getCurrentBooleanRouteValue(route, progress, "trip");
  const gsmSignal = getCurrentNumericRouteValue(route, progress, "gsmSignal");
  const gnssStatus = getCurrentBooleanRouteValue(route, progress, "gnssStatus");
  const gnssHdop = getCurrentNumericRouteValue(route, progress, "gnssHdop");
  const satellites = getCurrentNumericRouteValue(route, progress, "satellites");

  if (trip !== undefined) state.trip = trip;
  if (gsmSignal !== undefined) state.gsmSignal = gsmSignal;
  if (gnssStatus !== undefined) state.gnssStatus = gnssStatus;
  if (gnssHdop !== undefined) state.gnssHdop = gnssHdop;
  if (satellites !== undefined) state.satellites = satellites;
  const markerStatus = getRouteMarkerStatusAtProgress(route, progress);
  if (markerStatus !== undefined) state.markerStatus = markerStatus;

  return state;
}

export function getCurrentRouteTimestampIso(route: PlaybackRoute | null, progress: number): string | null {
  const routeTime = getRouteTimeAtProgress(route, progress);
  return routeTime === null ? null : new Date(routeTime).toISOString();
}

export function getPlaybackProgressStep(
  route: PlaybackRoute | null,
  deltaMs: number,
  playbackSpeed: number,
  currentProgress = 0,
): number {
  if (route?.tripSegments.length) {
    const segmentForProgress = getSegmentForProgress(route, currentProgress);
    if (!segmentForProgress) {
      return 0;
    }

    const startMs = new Date(segmentForProgress.segment.startTimeIso).valueOf();
    const endMs = new Date(segmentForProgress.segment.endTimeIso).valueOf();
    const durationMs = endMs - startMs;
    const progressSpan = segmentForProgress.segment.endProgressPercent - segmentForProgress.segment.startProgressPercent;

    if (!Number.isFinite(durationMs) || durationMs <= 0 || progressSpan <= 0) {
      return 0;
    }

    const simulatedMs = deltaMs * SIMULATED_MINUTES_PER_REAL_SECOND * 60 * playbackSpeed;
    return (simulatedMs / durationMs) * progressSpan;
  }

  const boundaryTimes = getRouteBoundaryTimes(route);
  if (!boundaryTimes) {
    return 0;
  }

  const routeDurationMs = boundaryTimes.endMs - boundaryTimes.startMs;
  const simulatedMs = deltaMs * SIMULATED_MINUTES_PER_REAL_SECOND * 60 * playbackSpeed;
  return (simulatedMs / routeDurationMs) * 100;
}

export function getCurrentTripId(trips: TripSegment[], progress: number): string | null {
  const route = { vehicleId: "", points: [], tripSegments: trips };
  return getSegmentForProgress(route, progress)?.segment.id ?? null;
}

export function formatPlaybackBoundaryLabel(route: PlaybackRoute | null, position: "start" | "end", timeFormat?: AppTimeFormat): string {
  const point = position === "start" ? route?.points[0] : route?.points.at(-1);

  if (!point?.timestampIso) {
    return "--:--";
  }

  return formatPlaybackTimeLabel(point.timestampIso, undefined, timeFormat);
}

export function getCurrentTimeLabel(route: PlaybackRoute | null, progress: number, timeFormat?: AppTimeFormat): string {
  const interpolatedTime = getRouteTimeAtProgress(route, progress);

  if (interpolatedTime === null) {
    return "--:--";
  }

  return formatPlaybackTimeLabel(new Date(interpolatedTime).toISOString(), undefined, timeFormat);
}

export function formatPlaybackTimeLabel(timestampIso: string, timeZone?: string, timeFormat?: AppTimeFormat): string {
  return formatUtcTimestampTimeLabel(timestampIso, timeZone, timeFormat);
}

export function getSegmentPolyline(route: PlaybackRoute | null, segment: TripSegment | null): [number, number][] {
  if (!route || !segment) {
    return [];
  }

  return getSegmentPoints(route, segment).map((point) => [point.latitude, point.longitude]);
}
