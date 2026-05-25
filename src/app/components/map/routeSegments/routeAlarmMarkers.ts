import { FleetAlert } from "../../../../domain/models/alerts";
import { PlaybackRoute, RouteSegmentEventMarker, TripSegment } from "../../../../domain/models/playback";
import { getRouteSegmentPointIndex } from "./routeSegmentGeometry";

function parseTime(timestampIso: string): number {
  const time = new Date(timestampIso).valueOf();
  return Number.isFinite(time) ? time : 0;
}

function getNearestPointIndex(route: PlaybackRoute, timestampIso: string): number {
  const targetTime = parseTime(timestampIso);

  return route.points.reduce((nearestIndex, point, pointIndex) => {
    const nearestPoint = route.points[nearestIndex];
    const distance = Math.abs(parseTime(point.timestampIso) - targetTime);
    const nearestDistance = Math.abs(parseTime(nearestPoint.timestampIso) - targetTime);

    return distance < nearestDistance ? pointIndex : nearestIndex;
  }, 0);
}

function findSegmentForPointIndex(route: PlaybackRoute, pointIndex: number): TripSegment | null {
  return (
    route.tripSegments.find((segment) => {
      const startIndex = getRouteSegmentPointIndex(route.points.length, segment.startProgressPercent);
      const endIndex = getRouteSegmentPointIndex(route.points.length, segment.endProgressPercent);
      return pointIndex >= startIndex && pointIndex <= endIndex;
    }) ?? route.tripSegments.at(-1) ?? null
  );
}

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

function getSegmentTimeAtProgress(segment: TripSegment, progress: number): number | null {
  const startMs = parseTime(segment.startTimeIso);
  const endMs = parseTime(segment.endTimeIso);

  if (!startMs || !endMs || endMs <= startMs) {
    return null;
  }

  const progressSpan = Math.max(0.0001, segment.endProgressPercent - segment.startProgressPercent);
  const segmentRatio = Math.min(1, Math.max(0, (progress - segment.startProgressPercent) / progressSpan));
  return startMs + (endMs - startMs) * segmentRatio;
}

function getRouteTimeAtProgress(route: PlaybackRoute, progress: number): number | null {
  const normalizedProgress = clampProgress(progress);
  const activeSegment =
    route.tripSegments.find(
      (segment) =>
        normalizedProgress >= segment.startProgressPercent &&
        normalizedProgress < segment.endProgressPercent,
    ) ?? (normalizedProgress === 100 ? route.tripSegments.at(-1) : null);

  if (activeSegment) {
    return getSegmentTimeAtProgress(activeSegment, normalizedProgress);
  }

  const routeStartMs = parseTime(route.points[0]?.timestampIso ?? "");
  const routeEndMs = parseTime(route.points.at(-1)?.timestampIso ?? "");

  if (!routeStartMs || !routeEndMs || routeEndMs <= routeStartMs) {
    return null;
  }

  return routeStartMs + (routeEndMs - routeStartMs) * (normalizedProgress / 100);
}

function createEventMarker(alert: FleetAlert, timestampIso: string): RouteSegmentEventMarker {
  return {
    id: alert.id,
    eventType: "alarm",
    timestampIso,
    label: alert.type,
    severity: "critical",
    sourceAttribute: alert.sourceAttribute,
  };
}

export function getReachedCriticalRouteAlerts(
  route: PlaybackRoute | null,
  alerts: FleetAlert[],
  progress: number,
): FleetAlert[] {
  if (!route?.points.length || !route.tripSegments.length) {
    return [];
  }

  const routeStartMs = parseTime(route.points[0].timestampIso);
  const routeEndMs = parseTime(route.points.at(-1)?.timestampIso ?? route.points[0].timestampIso);
  const playbackTimeMs = getRouteTimeAtProgress(route, progress);

  if (playbackTimeMs === null) {
    return [];
  }

  return alerts.filter((alert) => {
    if (
      alert.vehicleId !== route.vehicleId ||
      alert.severity !== "high" ||
      alert.state === "Resolved" ||
      !alert.timeIso
    ) {
      return false;
    }

    const alertTimeMs = parseTime(alert.timeIso);
    return alertTimeMs >= routeStartMs && alertTimeMs <= routeEndMs && alertTimeMs <= playbackTimeMs;
  });
}

export function addCriticalAlertEventMarkersToRoute(route: PlaybackRoute | null, alerts: FleetAlert[]): PlaybackRoute | null {
  if (!route?.points.length || !route.tripSegments.length) {
    return route;
  }

  const criticalAlerts = alerts.filter(
    (alert) =>
      alert.vehicleId === route.vehicleId &&
      alert.severity === "high" &&
      Boolean(alert.timeIso),
  );

  if (!criticalAlerts.length) {
    return route;
  }

  const eventsBySegmentId = new Map<string, RouteSegmentEventMarker[]>();

  criticalAlerts.forEach((alert) => {
    const timestampIso = alert.timeIso;
    const timestampMs = parseTime(timestampIso);
    const routeStartMs = parseTime(route.points[0].timestampIso);
    const routeEndMs = parseTime(route.points.at(-1)?.timestampIso ?? route.points[0].timestampIso);

    if (timestampMs < routeStartMs || timestampMs > routeEndMs) {
      return;
    }

    const nearestPointIndex = getNearestPointIndex(route, timestampIso);
    const segment = findSegmentForPointIndex(route, nearestPointIndex);

    if (!segment) {
      return;
    }

    const existingEvents = eventsBySegmentId.get(segment.id) ?? [];
    eventsBySegmentId.set(segment.id, [...existingEvents, createEventMarker(alert, timestampIso)]);
  });

  if (!eventsBySegmentId.size) {
    return route;
  }

  return {
    ...route,
    tripSegments: route.tripSegments.map((segment) => {
      const alertEvents = eventsBySegmentId.get(segment.id) ?? [];
      const existingEvents = segment.eventMarkers ?? [];
      const existingIds = new Set(existingEvents.map((event) => event.id));
      const nextAlertEvents = alertEvents.filter((event) => !existingIds.has(event.id));

      if (!nextAlertEvents.length) {
        return segment;
      }

      return {
        ...segment,
        eventMarkers: [...existingEvents, ...nextAlertEvents],
      };
    }),
  };
}
