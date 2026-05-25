import type { FleetAlert } from "../../../domain/models/alerts";
import type { PlaybackRoute, RoutePoint, TripSegment } from "../../../domain/models/playback";
import { hasValidVehicleLocation, type Vehicle } from "../../../domain/models/vehicle";
import type { AppDataMode } from "../../../domain/services/appServices";
import { addCriticalAlertEventMarkersToRoute } from "../../components/map/routeSegments/routeAlarmMarkers";
import {
  formatDurationLabel,
  formatPlaybackTimeLabel,
  getCurrentRouteHeadingDegrees,
  getSegmentPolyline,
  interpolatePlaybackRoutePosition,
  toMapPolyline,
} from "../../components/playback/playbackUtils";
import { getLiveMapVehicles } from "./liveMapVehicles";
import {
  applyLiveFleetAlertStateToVehicles,
  getCriticalLiveFleetAlerts,
  getTriggeredLiveFleetAlerts,
} from "./liveFleetAlertViewModel";

export interface LiveFleetAlertProjectionOptions {
  trustAlertRows: boolean;
}

export interface CriticalAlertPreview {
  type: string;
  rule: string;
  timeIso: string;
  total: number;
}

export interface LiveFleetTimelineStreetViewPosition {
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface LiveFleetProjectionInput {
  dataMode: AppDataMode;
  vehicles: Vehicle[];
  alerts: FleetAlert[];
  selectedVehicleId?: string | null;
  selectedVehicleFallback?: Vehicle | null;
  route?: PlaybackRoute | null;
  routeWithAlertMarkers?: PlaybackRoute | null;
  selectedSegmentId?: string | null;
  activeMapSegmentId?: string | null;
  playbackProgress?: number;
  playbackSpeed?: number;
  isTimelineInspecting?: boolean;
}

export interface LiveFleetProjection {
  alertProjectionOptions: LiveFleetAlertProjectionOptions;
  fleetVehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  triggeredAlerts: FleetAlert[];
  criticalAlerts: FleetAlert[];
  activeCriticalAlertsCount: number;
  criticalAlertPreviewByVehicleId: Record<string, CriticalAlertPreview>;
  activeAlertsByVehicleId: Record<string, FleetAlert[]>;
  routeWithAlertMarkers: PlaybackRoute | null;
  selectedSegmentWithAlertMarkers: TripSegment | null;
  activeMapSegmentId: string | null;
  routeLine: [number, number][];
  activeSegmentLine: [number, number][];
  playbackPosition: [number, number];
  playbackHeading: number | null;
  mapVehicles: Vehicle[];
  timelineStreetViewPosition: LiveFleetTimelineStreetViewPosition | null;
}

const LIVE_ROUTE_ENDPOINT_PROGRESS_THRESHOLD = 99.5;

function getAlertTimeValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getTimestampMs(timestampIso?: string | null): number | null {
  if (!timestampIso) {
    return null;
  }

  const timestampMs = Date.parse(timestampIso);
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function getLiveRoutePoint(vehicle: Vehicle): RoutePoint | null {
  if (!hasValidVehicleLocation(vehicle)) {
    return null;
  }

  const timestampMs = getTimestampMs(vehicle.lastUpdatedIso);
  if (timestampMs === null) {
    return null;
  }

  return {
    latitude: vehicle.latitude,
    longitude: vehicle.longitude,
    timestampIso: new Date(timestampMs).toISOString(),
    speedKph: vehicle.speedKph,
    directionDegrees: vehicle.heading,
    ignitionOn: vehicle.ignitionOn,
  };
}

function updateLastSegmentEndpoint(segments: TripSegment[], livePoint: RoutePoint): TripSegment[] {
  const lastSegmentIndex = segments.length - 1;
  if (lastSegmentIndex < 0) {
    return segments;
  }

  return segments.map((segment, index) => {
    if (index !== lastSegmentIndex) {
      return segment;
    }

    const startMs = getTimestampMs(segment.startTimeIso);
    const endMs = getTimestampMs(livePoint.timestampIso);
    const durationMinutes =
      startMs !== null && endMs !== null && endMs > startMs
        ? (endMs - startMs) / 60_000
        : segment.durationMinutes;

    return {
      ...segment,
      endLabel: formatPlaybackTimeLabel(livePoint.timestampIso),
      endTimeIso: livePoint.timestampIso,
      durationLabel: formatDurationLabel(durationMinutes),
      durationMinutes,
      endProgressPercent: 100,
    };
  });
}

function getLiveEndpointRoute(
  route: PlaybackRoute | null,
  selectedVehicle: Vehicle | null,
  input: LiveFleetProjectionInput,
  playbackProgress: number,
): PlaybackRoute | null {
  if (
    input.dataMode !== "openRemote" ||
    input.isTimelineInspecting ||
    playbackProgress < LIVE_ROUTE_ENDPOINT_PROGRESS_THRESHOLD ||
    !route ||
    !selectedVehicle ||
    route.vehicleId !== selectedVehicle.id
  ) {
    return route;
  }

  const livePoint = getLiveRoutePoint(selectedVehicle);
  const routeTail = route.points.at(-1);
  const liveTimestampMs = getTimestampMs(livePoint?.timestampIso);
  const routeTailTimestampMs = getTimestampMs(routeTail?.timestampIso);
  if (!livePoint || !routeTail || liveTimestampMs === null || routeTailTimestampMs === null) {
    return route;
  }

  if (liveTimestampMs <= routeTailTimestampMs) {
    return route;
  }

  return {
    ...route,
    points: [...route.points, livePoint],
    tripSegments: updateLastSegmentEndpoint(route.tripSegments, livePoint),
  };
}

function buildCriticalAlertPreviewByVehicleId(alerts: FleetAlert[]) {
  const next: Record<string, CriticalAlertPreview> = {};

  alerts.forEach((alert) => {
    if (!alert.vehicleId || alert.state === "Resolved") {
      return;
    }

    const existing = next[alert.vehicleId];
    if (!existing) {
      next[alert.vehicleId] = {
        type: alert.type,
        rule: alert.rule,
        timeIso: alert.timeIso,
        total: 1,
      };
      return;
    }

    const isLatest = getAlertTimeValue(alert.timeIso) > getAlertTimeValue(existing.timeIso);
    next[alert.vehicleId] = {
      type: isLatest ? alert.type : existing.type,
      rule: isLatest ? alert.rule : existing.rule,
      timeIso: isLatest ? alert.timeIso : existing.timeIso,
      total: existing.total + 1,
    };
  });

  return next;
}

function groupAlertsByVehicleId(alerts: FleetAlert[]) {
  return alerts.reduce<Record<string, FleetAlert[]>>((groups, alert) => {
    if (!alert.vehicleId || alert.state === "Resolved") {
      return groups;
    }

    groups[alert.vehicleId] = [...(groups[alert.vehicleId] ?? []), alert];
    return groups;
  }, {});
}

export function buildLiveFleetProjection(input: LiveFleetProjectionInput): LiveFleetProjection {
  const playbackProgress = input.playbackProgress ?? 0;
  const route = input.route ?? null;
  const alertProjectionOptions = { trustAlertRows: input.dataMode === "openRemote" };
  const fleetVehicles = applyLiveFleetAlertStateToVehicles(input.vehicles, input.alerts, alertProjectionOptions);
  const selectedVehicle = input.selectedVehicleId
    ? fleetVehicles.find((vehicle) => vehicle.id === input.selectedVehicleId) ?? input.selectedVehicleFallback ?? null
    : null;
  const triggeredAlerts = getTriggeredLiveFleetAlerts(input.alerts, fleetVehicles, alertProjectionOptions);
  const criticalAlerts = getCriticalLiveFleetAlerts(input.alerts, fleetVehicles, alertProjectionOptions);
  const routeWithAlertMarkers =
    getLiveEndpointRoute(
      input.routeWithAlertMarkers !== undefined
        ? input.routeWithAlertMarkers
        : addCriticalAlertEventMarkersToRoute(route, input.alerts),
      selectedVehicle,
      input,
      playbackProgress,
    );
  const selectedSegmentWithAlertMarkers = routeWithAlertMarkers?.tripSegments.find((segment) => segment.id === input.selectedSegmentId) ?? null;
  const requestedActiveMapSegmentId = input.activeMapSegmentId ?? input.selectedSegmentId ?? null;
  const activeMapSegmentWithAlertMarkers =
    routeWithAlertMarkers?.tripSegments.find((segment) => segment.id === requestedActiveMapSegmentId) ??
    selectedSegmentWithAlertMarkers;
  const activeMapSegmentId = activeMapSegmentWithAlertMarkers?.id ?? null;
  const routeLine = toMapPolyline(routeWithAlertMarkers);
  const activeSegmentLine = getSegmentPolyline(routeWithAlertMarkers, activeMapSegmentWithAlertMarkers);
  const playbackPosition = interpolatePlaybackRoutePosition(routeWithAlertMarkers, playbackProgress);
  const playbackHeading = getCurrentRouteHeadingDegrees(routeWithAlertMarkers, playbackProgress);
  const mapVehicles = getLiveMapVehicles({
    vehicles: fleetVehicles,
    selectedVehicle,
    selectedVehicleId: input.selectedVehicleId,
    routeLine,
    playbackPosition,
    playbackHeading,
    playbackProgress,
    playbackSpeed: input.playbackSpeed,
    isTimelineInspecting: input.isTimelineInspecting,
  });

  return {
    alertProjectionOptions,
    fleetVehicles,
    selectedVehicle,
    triggeredAlerts,
    criticalAlerts,
    activeCriticalAlertsCount: criticalAlerts.filter((alert) => alert.state === "Active").length,
    criticalAlertPreviewByVehicleId: buildCriticalAlertPreviewByVehicleId(triggeredAlerts),
    activeAlertsByVehicleId: groupAlertsByVehicleId(triggeredAlerts),
    routeWithAlertMarkers,
    selectedSegmentWithAlertMarkers,
    activeMapSegmentId,
    routeLine,
    activeSegmentLine,
    playbackPosition,
    playbackHeading,
    mapVehicles,
    timelineStreetViewPosition:
      input.isTimelineInspecting && routeWithAlertMarkers
        ? {
            latitude: playbackPosition[0],
            longitude: playbackPosition[1],
            heading: playbackHeading ?? undefined,
          }
        : null,
  };
}
