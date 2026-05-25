import {
  PlaybackRoute,
  RoutePoint,
  RouteSegmentEventMarker,
  RouteSegmentMarker,
  TripSegment,
  TripSegmentGraphPoint,
  formatDistanceLabel,
  formatDurationLabel,
  formatSpeedLabel,
  getPointIndex,
} from "../../../domain/models/playback";
import { TelemetrySignalSample } from "../../../domain/models/telemetry";
import { TeltonikaAttributeSample, TeltonikaAttributeValue } from "../../../domain/models/teltonika";
import { Vehicle, VehicleDetail } from "../../../domain/models/vehicle";
import { deriveVehicleOperationalStatus } from "../../../domain/models/vehicleOperationalStatus";
import { formatUtcTimestampTimeLabel } from "../../../domain/utils/dateTime";
import {
  getDistanceMeters,
  getRouteDistanceMeters,
  getRoundedBearingDegrees as getBearingDegrees,
} from "../../../domain/utils/geo";
import { FleetAlert } from "../../../domain/models/alerts";
import {
  FleetLiveStateInput,
  FleetLiveStateService,
  FleetLiveStateSnapshot,
} from "../../../domain/services/liveFleetStateService";
import { MOCK_ALERT_FIXTURES } from "./fixtures/alertsFixtures";
import { cloneFixture } from "./fixtures/cloneFixture";
import { rebaseIsoTimestampDate } from "./mockDateRebase";

const SIMULATED_ROUTE_MS_PER_REAL_MS = 1;
const DEFAULT_INITIAL_ROUTE_PROGRESS_MIN = 0.32;
const DEFAULT_INITIAL_ROUTE_PROGRESS_SPREAD = 0.34;
const SEEDED_INITIAL_ROUTE_PROGRESS_BY_VEHICLE_ID: Record<string, number> = {
  "veh-atlas-12": 0.42,
  "veh-harbor-07": 0.44,
  "veh-delta-24": 0.84,
  "veh-courier-19": 0.58,
};

type MockLiveFleetSimulationInput = FleetLiveStateInput;
export type MockLiveFleetSimulationSnapshot = FleetLiveStateSnapshot;

interface RouteWindow {
  lower: RoutePoint;
  upper: RoutePoint;
  lowerIndex: number;
  upperIndex: number;
  fractional: number;
  targetMs: number;
}

function getPointTime(point: Pick<RoutePoint, "timestampIso">): number {
  const time = new Date(point.timestampIso).valueOf();
  return Number.isFinite(time) ? time : 0;
}

function alignTimestampDate(timestampIso: string, targetDateIso: string): string {
  const sourceDateIso = timestampIso.slice(0, 10);
  if (!sourceDateIso || sourceDateIso === targetDateIso) {
    return timestampIso;
  }

  return rebaseIsoTimestampDate(timestampIso, targetDateIso);
}

function getReachedVehicleAlerts(vehicle: Vehicle, livePoint: RoutePoint, alerts: FleetAlert[]): FleetAlert[] {
  const liveDateIso = livePoint.timestampIso.slice(0, 10);
  const livePointMs = getPointTime(livePoint);

  return alerts.filter((alert) => {
    if (alert.vehicleId !== vehicle.id || alert.state === "Resolved" || !alert.timeIso) {
      return false;
    }

    return parseTime(alignTimestampDate(alert.timeIso, liveDateIso)) <= livePointMs;
  });
}

function parseTime(timestampIso: string): number {
  const time = new Date(timestampIso).valueOf();
  return Number.isFinite(time) ? time : 0;
}

function getVehicleOffsetMs(vehicleId: string, routeDurationMs: number): number {
  if (routeDurationMs <= 0) {
    return 0;
  }

  const hash = vehicleId.split("").reduce((value, character) => value + character.charCodeAt(0), 0);
  const progress =
    SEEDED_INITIAL_ROUTE_PROGRESS_BY_VEHICLE_ID[vehicleId] ??
    DEFAULT_INITIAL_ROUTE_PROGRESS_MIN + (hash % Math.round(DEFAULT_INITIAL_ROUTE_PROGRESS_SPREAD * 100)) / 100;

  return Math.round(Math.min(0.88, Math.max(0.18, progress)) * routeDurationMs);
}

function getRouteWindow(route: PlaybackRoute, nowMs: number, useVehicleOffsets: boolean): RouteWindow | null {
  if (route.points.length < 2) {
    return null;
  }

  const routeStartMs = getPointTime(route.points[0]);
  const routeEndMs = getPointTime(route.points.at(-1) ?? route.points[0]);
  const routeDurationMs = Math.max(1, routeEndMs - routeStartMs);
  const offsetMs = useVehicleOffsets ? getVehicleOffsetMs(route.vehicleId, routeDurationMs) : 0;
  const simulatedElapsedMs = (nowMs * SIMULATED_ROUTE_MS_PER_REAL_MS + offsetMs) % routeDurationMs;
  const targetMs = routeStartMs + simulatedElapsedMs;

  for (let pointIndex = 0; pointIndex < route.points.length - 1; pointIndex += 1) {
    const lower = route.points[pointIndex];
    const upper = route.points[pointIndex + 1];
    const lowerMs = getPointTime(lower);
    const upperMs = getPointTime(upper);

    if (targetMs >= lowerMs && targetMs <= upperMs) {
      const spanMs = Math.max(1, upperMs - lowerMs);
      return {
        lower,
        upper,
        lowerIndex: pointIndex,
        upperIndex: pointIndex + 1,
        fractional: Math.min(1, Math.max(0, (targetMs - lowerMs) / spanMs)),
        targetMs,
      };
    }
  }

  const finalPoint = route.points.at(-1);
  return finalPoint
    ? {
        lower: finalPoint,
        upper: finalPoint,
        lowerIndex: route.points.length - 1,
        upperIndex: route.points.length - 1,
        fractional: 0,
        targetMs,
      }
    : null;
}

function interpolatePoint(routeWindow: RouteWindow): RoutePoint {
  const { lower, upper, fractional, targetMs } = routeWindow;
  const lowerSpeed = lower.speedKph ?? 0;
  const upperSpeed = upper.speedKph ?? lowerSpeed;
  const directionDegrees =
    typeof lower.directionDegrees === "number"
      ? lower.directionDegrees
      : lower.latitude !== upper.latitude || lower.longitude !== upper.longitude
        ? getBearingDegrees(lower, upper)
        : undefined;

  return {
    latitude: lower.latitude + (upper.latitude - lower.latitude) * fractional,
    longitude: lower.longitude + (upper.longitude - lower.longitude) * fractional,
    timestampIso: new Date(targetMs).toISOString(),
    speedKph: Math.round(lowerSpeed + (upperSpeed - lowerSpeed) * fractional),
    directionDegrees,
    ignitionOn: true,
    movement: (lowerSpeed + (upperSpeed - lowerSpeed) * fractional) > 2,
  };
}

function filterMarkers<TMarker extends RouteSegmentMarker | RouteSegmentEventMarker>(
  markers: TMarker[] | undefined,
  endTimeMs: number,
): TMarker[] | undefined {
  const filteredMarkers = markers?.filter((marker) => getPointTime(marker) <= endTimeMs);
  return filteredMarkers?.length ? filteredMarkers : undefined;
}

function filterGraphSeries(points: TripSegmentGraphPoint[] | undefined, endTimeMs: number): TripSegmentGraphPoint[] | undefined {
  const graphSeries = points?.filter((point) => getPointTime(point) <= endTimeMs);
  return graphSeries?.length ? graphSeries : undefined;
}

function filterTelemetrySamples(samples: TelemetrySignalSample[] | undefined, endTimeMs: number): TelemetrySignalSample[] | undefined {
  const telemetrySamples = samples?.filter((sample) => getPointTime(sample) <= endTimeMs);
  return telemetrySamples?.length ? telemetrySamples : undefined;
}

function clipRouteToLivePoint(route: PlaybackRoute, livePoint: RoutePoint, routeWindow: RouteWindow): PlaybackRoute {
  const clippedPoints = route.points.slice(0, routeWindow.lowerIndex + 1);
  const lowerPointTime = getPointTime(routeWindow.lower);
  const livePointTime = getPointTime(livePoint);

  if (livePointTime === lowerPointTime) {
    clippedPoints[clippedPoints.length - 1] = livePoint;
  } else {
    clippedPoints.push(livePoint);
  }

  const clippedLastIndex = Math.max(0, clippedPoints.length - 1);
  const clippedEndTimeMs = getPointTime(livePoint);

  return {
    ...route,
    points: clippedPoints,
    tripSegments: route.tripSegments.flatMap((segment): TripSegment[] => {
      const baseStartIndex = getPointIndex(route.points.length, segment.startProgressPercent);
      const baseEndIndex = getPointIndex(route.points.length, segment.endProgressPercent);

      if (baseStartIndex > routeWindow.upperIndex) {
        return [];
      }

      const nextStartIndex = Math.min(baseStartIndex, clippedLastIndex);
      const nextEndIndex = Math.min(Math.max(baseStartIndex, baseEndIndex), clippedLastIndex);
      const segmentPoints = clippedPoints.slice(nextStartIndex, nextEndIndex + 1);
      const startPoint = segmentPoints[0];
      const endPoint = segmentPoints.at(-1);

      if (!startPoint || !endPoint) {
        return [];
      }

      const startTimeMs = getPointTime(startPoint);
      const endTimeMs = getPointTime(endPoint);
      const durationMinutes = Math.max(1, (endTimeMs - startTimeMs) / 60_000);
      const distanceKm = getRouteDistanceMeters(segmentPoints) / 1000;
      const averageSpeedKph = distanceKm / (durationMinutes / 60);
      const graphSeries = filterGraphSeries(segment.graphSeries, endTimeMs);
      const maxSpeedKph = Math.max(averageSpeedKph, ...(graphSeries?.map((point) => point.speedKph) ?? [0]));
      const progressDenominator = Math.max(1, clippedLastIndex);

      return [
        {
          ...segment,
          startLabel: formatUtcTimestampTimeLabel(startPoint.timestampIso),
          endLabel: formatUtcTimestampTimeLabel(endPoint.timestampIso),
          startTimeIso: startPoint.timestampIso,
          endTimeIso: endPoint.timestampIso,
          durationLabel: formatDurationLabel(durationMinutes),
          durationMinutes,
          distanceLabel: formatDistanceLabel(distanceKm),
          distanceKm,
          maxSpeedLabel: formatSpeedLabel(maxSpeedKph),
          maxSpeedKph,
          averageSpeedLabel: formatSpeedLabel(averageSpeedKph),
          averageSpeedKph,
          startProgressPercent: (nextStartIndex / progressDenominator) * 100,
          endProgressPercent: (nextEndIndex / progressDenominator) * 100,
          markers: filterMarkers(segment.markers, endTimeMs),
          directionSamples: segment.directionSamples?.filter((sample) => getPointTime(sample) <= endTimeMs),
          eventMarkers: filterMarkers(segment.eventMarkers, endTimeMs),
          telemetrySamples: filterTelemetrySamples(segment.telemetrySamples, endTimeMs),
          graphSeries,
        },
      ];
    }),
  };
}

function setTeltonikaAttributeValue(
  attribute: TeltonikaAttributeSample,
  value: TeltonikaAttributeValue,
  timestampIso: string,
) {
  attribute.value = value;
  attribute.timestampIso = timestampIso;
}

function updateAttribute(vehicle: Vehicle, attributeName: string, value: TeltonikaAttributeValue, timestampIso: string) {
  const attribute = vehicle.teltonika?.attributes[attributeName];
  if (!attribute) {
    return;
  }

  setTeltonikaAttributeValue(attribute, value, timestampIso);
}

function updateTelemetrySamples(vehicle: Vehicle, livePoint: RoutePoint) {
  vehicle.latestTelemetrySamples = vehicle.latestTelemetrySamples?.map((sample) => {
    if (sample.signalId === "speed") {
      return { ...sample, timestampIso: livePoint.timestampIso, value: livePoint.speedKph ?? 0 };
    }

    if (sample.signalId === "direction") {
      return { ...sample, timestampIso: livePoint.timestampIso, value: livePoint.directionDegrees ?? vehicle.heading };
    }

    if (sample.signalId === "ignition") {
      return { ...sample, timestampIso: livePoint.timestampIso, value: livePoint.ignitionOn ?? true };
    }

    if (sample.signalId === "movement") {
      return { ...sample, timestampIso: livePoint.timestampIso, value: livePoint.movement ?? true };
    }

    return { ...sample, timestampIso: livePoint.timestampIso };
  });
}

function updateVehicle(vehicle: Vehicle, livePoint: RoutePoint, reachedAlerts: FleetAlert[]): Vehicle {
  const nextVehicle = cloneFixture(vehicle);
  const heading = livePoint.directionDegrees ?? nextVehicle.heading;
  const speedKph = livePoint.speedKph ?? nextVehicle.speedKph;
  const movement = livePoint.movement ?? speedKph > 2;
  const ignitionOn = livePoint.ignitionOn ?? true;
  const activeAlertCount = reachedAlerts.length;

  nextVehicle.latitude = livePoint.latitude;
  nextVehicle.longitude = livePoint.longitude;
  nextVehicle.hasLocation = true;
  nextVehicle.speedKph = speedKph;
  nextVehicle.heading = heading;
  nextVehicle.ignitionOn = ignitionOn;
  nextVehicle.lastUpdatedIso = livePoint.timestampIso;
  nextVehicle.activeAlertCount = activeAlertCount;
  nextVehicle.status = deriveVehicleOperationalStatus({
    activeAlertCount,
    hasLocation: true,
    ignitionOn,
    movement,
    speedKph,
  });

  if (nextVehicle.teltonika) {
    nextVehicle.teltonika.timestampIso = livePoint.timestampIso;
    Object.values(nextVehicle.teltonika.attributes).forEach((attribute) => {
      attribute.timestampIso = livePoint.timestampIso;
    });
  }

  updateAttribute(nextVehicle, "gpsLocation", { latitude: livePoint.latitude, longitude: livePoint.longitude }, livePoint.timestampIso);
  updateAttribute(nextVehicle, "speed", speedKph, livePoint.timestampIso);
  updateAttribute(nextVehicle, "direction", heading, livePoint.timestampIso);
  updateAttribute(nextVehicle, "ignition", ignitionOn, livePoint.timestampIso);
  updateAttribute(nextVehicle, "movement", movement, livePoint.timestampIso);
  updateAttribute(nextVehicle, "priority", activeAlertCount > 0 ? 1 : 0, livePoint.timestampIso);
  updateTelemetrySamples(nextVehicle, livePoint);

  return nextVehicle;
}

function updateVehicleDetail(detail: VehicleDetail, vehicle: Vehicle, selectedRoute: PlaybackRoute | null): VehicleDetail {
  const distanceKm = selectedRoute ? getRouteDistanceMeters(selectedRoute.points) / 1000 : detail.todayMileageKm;

  return {
    ...detail,
    ...vehicle,
    lastCommunicationIso: vehicle.lastUpdatedIso,
    todayMileageKm: Math.max(detail.todayMileageKm, distanceKm),
  };
}

export function createMockLiveFleetSimulationSnapshot({
  vehicles,
  routesByVehicleId,
  vehicleDetailsById = {},
  selectedVehicleId = null,
  nowMs = Date.now(),
  useVehicleOffsets = true,
  alerts = MOCK_ALERT_FIXTURES,
}: MockLiveFleetSimulationInput): MockLiveFleetSimulationSnapshot {
  const selectedRoutesByVehicleId: Record<string, PlaybackRoute | null> = {};

  const nextVehicles = vehicles.map((vehicle) => {
    if (vehicle.status === "offline") {
      return cloneFixture(vehicle);
    }

    const route = routesByVehicleId[vehicle.id];
    if (!route?.points.length) {
      return cloneFixture(vehicle);
    }

    const routeWindow = getRouteWindow(route, nowMs, useVehicleOffsets);
    if (!routeWindow) {
      return cloneFixture(vehicle);
    }

    const livePoint = interpolatePoint(routeWindow);
    const selectedRoute = clipRouteToLivePoint(route, livePoint, routeWindow);
    selectedRoutesByVehicleId[vehicle.id] = selectedRoute;
    const reachedAlerts = getReachedVehicleAlerts(vehicle, livePoint, alerts);

    return updateVehicle(vehicle, livePoint, reachedAlerts);
  });

  const selectedRoute = selectedVehicleId ? selectedRoutesByVehicleId[selectedVehicleId] ?? null : null;
  const nextVehicleDetailsById = Object.fromEntries(
    Object.entries(vehicleDetailsById).map(([vehicleId, detail]) => {
      const vehicle = nextVehicles.find((entry) => entry.id === vehicleId);
      const detailRoute = selectedVehicleId === vehicleId ? selectedRoute : selectedRoutesByVehicleId[vehicleId] ?? null;

      return [vehicleId, vehicle ? updateVehicleDetail(detail, vehicle, detailRoute) : cloneFixture(detail)];
    }),
  );

  return {
    vehicles: nextVehicles,
    vehicleDetailsById: nextVehicleDetailsById,
    selectedRoute,
  };
}

export class MockLiveFleetSimulationService implements FleetLiveStateService {
  readonly supportsRouteBackedSimulation = true;

  createSnapshot(input: FleetLiveStateInput): FleetLiveStateSnapshot {
    return createMockLiveFleetSimulationSnapshot(input);
  }
}
