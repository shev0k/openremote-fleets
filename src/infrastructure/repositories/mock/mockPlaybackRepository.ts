import {
  PlaybackQuery,
  PlaybackRoute,
  RouteDirectionSample,
  RouteSegmentEventMarker,
  RouteSegmentMarker,
  RouteSegmentState,
  RouteSegmentSpeedBand,
  TripSegmentGraphPoint,
  deriveTripSegmentState,
  formatDistanceLabel,
  formatDurationLabel,
  formatSpeedLabel,
  getPointIndex,
  getTripSegmentSpeedBand,
} from "../../../domain/models/playback";
import { TelemetrySignalSample, TelemetryTimeline } from "../../../domain/models/telemetry";
import { Vehicle } from "../../../domain/models/vehicle";
import { PlaybackRepository } from "../../../domain/repositories/playbackRepository";
import { formatUtcTimestampTimeLabel } from "../../../domain/utils/dateTime";
import {
  getBearingDegrees,
  getBearingDifference,
  getDistanceMeters,
  getRouteDistanceMeters,
} from "../../../domain/utils/geo";
import { TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS } from "../../../domain/models/teltonikaCatalog";
import { cloneFixture } from "./fixtures/cloneFixture";
import { MOCK_PLAYBACK_ROUTE_FIXTURES, MOCK_PLAYBACK_VEHICLES } from "./fixtures/playbackFixtures";
import { addMockCalendarDays, getCurrentMockDateKey, rebaseIsoTimestampDate } from "./mockDateRebase";
import { rebaseVehicleCollectionToDate } from "./mockFleetRepository";

type PlaybackRouteFixture = (typeof MOCK_PLAYBACK_ROUTE_FIXTURES)[string][string];
type PlaybackFixtureKey = "today" | "yesterday" | "last-7-days";
const MOCK_ROUTE_MARKER_PLAYBACK_WINDOW_MINUTES = 1;

interface NormalizedPlaybackQuery {
  fixtureKey: PlaybackFixtureKey;
  targetDateIso: string;
}

function normalizePlaybackQuery(query: PlaybackQuery): NormalizedPlaybackQuery | null {
  const todayIso = getCurrentMockDateKey();
  const yesterdayIso = addMockCalendarDays(todayIso, -1);
  const last7DaysStartIso = addMockCalendarDays(todayIso, -6);

  if (query.preset === "today" || query.preset === "last24Hours") {
    return { fixtureKey: "today", targetDateIso: todayIso };
  }

  if (query.preset === "yesterday") {
    return { fixtureKey: "yesterday", targetDateIso: yesterdayIso };
  }

  if (query.preset === "last7Days") {
    return { fixtureKey: "last-7-days", targetDateIso: last7DaysStartIso };
  }

  if (query.preset === "customDate" && query.customDateIso) {
    const normalizedDate = query.customDateIso.slice(0, 10);
    if (normalizedDate === todayIso) {
      return { fixtureKey: "today", targetDateIso: normalizedDate };
    }

    if (normalizedDate === yesterdayIso) {
      return { fixtureKey: "yesterday", targetDateIso: normalizedDate };
    }

    if (normalizedDate >= last7DaysStartIso && normalizedDate < yesterdayIso) {
      return { fixtureKey: "yesterday", targetDateIso: normalizedDate };
    }
  }

  return null;
}

function rebaseTimestampDate(timestampIso: string, targetDateIso: string, sourceDateIso: string): string {
  return sourceDateIso === targetDateIso ? timestampIso : rebaseIsoTimestampDate(timestampIso, targetDateIso);
}

function getDateOffsetDays(dateIso: string, baseDateIso: string): number {
  const dateMs = Date.parse(`${dateIso}T00:00:00.000Z`);
  const baseDateMs = Date.parse(`${baseDateIso}T00:00:00.000Z`);
  if (!Number.isFinite(dateMs) || !Number.isFinite(baseDateMs)) {
    return 0;
  }

  return Math.round((dateMs - baseDateMs) / 86_400_000);
}

function rebaseTimestampWithSourceOffset(timestampIso: string, targetStartDateIso: string, sourceStartDateIso: string): string {
  const sourceDateIso = timestampIso.slice(0, 10);
  const sourceOffsetDays = getDateOffsetDays(sourceDateIso, sourceStartDateIso);
  const targetDateIso = addMockCalendarDays(targetStartDateIso, sourceOffsetDays);

  return rebaseTimestampDate(timestampIso, targetDateIso, sourceDateIso);
}

function rebaseRouteToDate(route: PlaybackRouteFixture, targetDateIso: string): PlaybackRouteFixture {
  const sourceDateIso = route.points[0]?.timestampIso.slice(0, 10);
  if (!sourceDateIso || sourceDateIso === targetDateIso) {
    return route;
  }

  return {
    ...route,
    points: route.points.map((point) => ({
      ...point,
      timestampIso: rebaseTimestampWithSourceOffset(point.timestampIso, targetDateIso, sourceDateIso),
    })),
  };
}

function parseNumericLabel(label: string): number {
  const match = label.match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function formatTimeLabel(timestampIso: string): string {
  return formatUtcTimestampTimeLabel(timestampIso);
}

function getSegmentPoints(
  points: PlaybackRoute["points"],
  startProgressPercent: number,
  endProgressPercent: number,
): PlaybackRoute["points"] {
  const startIndex = getPointIndex(points.length, startProgressPercent);
  const endIndex = getPointIndex(points.length, endProgressPercent);
  return points.slice(startIndex, endIndex + 1);
}

function createGraphSeries(
  points: PlaybackRoute["points"],
  startProgressPercent: number,
  endProgressPercent: number,
  segmentIndex: number,
): TripSegmentGraphPoint[] {
  const segmentPoints = getSegmentPoints(points, startProgressPercent, endProgressPercent);

  return segmentPoints.map((point, pointIndex) => {
    const routeSpeedKph = Math.max(0, point.speedKph ?? 0);

    return {
      timestampIso: point.timestampIso,
      speedKph: Math.round(routeSpeedKph),
      fuelLevelPercent: Math.max(8, Math.round(72 - segmentIndex * 9 - pointIndex * 3)),
    };
  });
}

function createDirectionSamples(
  points: PlaybackRoute["points"],
  startProgressPercent: number,
  endProgressPercent: number,
): RouteDirectionSample[] {
  const segmentPoints = getSegmentPoints(points, startProgressPercent, endProgressPercent);
  const samples: RouteDirectionSample[] = [];
  let lastBearing: number | null = null;
  let distanceSinceLastSample = 0;

  for (let pointIndex = 0; pointIndex < segmentPoints.length - 1; pointIndex += 1) {
    const point = segmentPoints[pointIndex];
    const nextPoint = segmentPoints[pointIndex + 1];
    const bearing = getBearingDegrees(point, nextPoint);
    const distanceFromPrevious = pointIndex > 0 ? getDistanceMeters(segmentPoints[pointIndex - 1], point) : 0;
    distanceSinceLastSample += distanceFromPrevious;
    const isFirstSample = samples.length === 0 && pointIndex > 0;
    const isMeaningfulTurn = lastBearing !== null && getBearingDifference(bearing, lastBearing) >= 35 && distanceSinceLastSample >= 100;
    const isLongGap = distanceSinceLastSample >= 900;

    if (isFirstSample || isMeaningfulTurn || isLongGap) {
      samples.push({
        timestampIso: point.timestampIso,
        latitude: point.latitude,
        longitude: point.longitude,
        directionDegrees: Math.round(bearing),
      });
      lastBearing = bearing;
      distanceSinceLastSample = 0;
    }

    if (samples.length >= 5) {
      break;
    }
  }

  if (!samples.length && segmentPoints.length >= 2) {
    const point = segmentPoints[0];
    samples.push({
      timestampIso: point.timestampIso,
      latitude: point.latitude,
      longitude: point.longitude,
      directionDegrees: Math.round(getBearingDegrees(point, segmentPoints[1])),
    });
  }

  return samples;
}

function createSegmentMarkers(
  points: PlaybackRoute["points"],
  startProgressPercent: number,
  endProgressPercent: number,
  segmentIndex: number,
  stopCount: number,
): RouteSegmentMarker[] {
  const segmentPoints = getSegmentPoints(points, startProgressPercent, endProgressPercent);
  const anchor = segmentPoints[Math.min(1, segmentPoints.length - 1)] ?? points[0];
  if (!anchor) {
    return [];
  }

  const markers: RouteSegmentMarker[] = [];

  if (stopCount > 0) {
    markers.push({
      id: `segment-${segmentIndex}-stop`,
      type: "stop",
      timestampIso: anchor.timestampIso,
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      label: `${stopCount} stop${stopCount === 1 ? "" : "s"}`,
      durationMinutes: 8 + segmentIndex * 3,
      playbackWindowMinutes: MOCK_ROUTE_MARKER_PLAYBACK_WINDOW_MINUTES,
    });
  }

  if (segmentIndex === 1) {
    markers.push({
      id: `segment-${segmentIndex}-break`,
      type: "break",
      timestampIso: anchor.timestampIso,
      latitude: anchor.latitude + 0.0008,
      longitude: anchor.longitude + 0.0008,
      label: "Driver break",
      durationMinutes: 24,
      playbackWindowMinutes: MOCK_ROUTE_MARKER_PLAYBACK_WINDOW_MINUTES,
    });
  }

  if (segmentIndex === 2) {
    markers.push({
      id: `segment-${segmentIndex}-engine-off`,
      type: "engineOff",
      timestampIso: anchor.timestampIso,
      latitude: anchor.latitude - 0.0008,
      longitude: anchor.longitude - 0.0008,
      label: "Engine off",
      durationMinutes: 11,
      playbackWindowMinutes: MOCK_ROUTE_MARKER_PLAYBACK_WINDOW_MINUTES,
    });
  }

  return markers;
}

function createSegmentEventMarkers(segmentIndex: number, startTimeIso: string): RouteSegmentEventMarker[] {
  if (segmentIndex !== 1) {
    return [];
  }

  return [
    {
      id: `segment-${segmentIndex}-alarm-fuel`,
      eventType: "alarm",
      timestampIso: startTimeIso,
      label: "Fuel level warning",
      severity: "warning",
      sourceAttribute: "fuelLevel",
    },
  ];
}

function createSegmentTelemetrySamples(
  graphSeries: TripSegmentGraphPoint[],
  averageSpeedKph: number,
  segmentIndex: number,
  eventMarkers: RouteSegmentEventMarker[],
): TelemetrySignalSample[] {
  return graphSeries.flatMap<TelemetrySignalSample>((point, pointIndex) => {
    const moving = point.speedKph > 0;
    const timestampIso = point.timestampIso;
    const samples: TelemetrySignalSample[] = [
      { signalId: "speed", timestampIso, value: point.speedKph, sourceAttribute: "speed" },
      { signalId: "ignition", timestampIso, value: moving || segmentIndex !== 2, sourceAttribute: "ignition" },
      { signalId: "movement", timestampIso, value: moving, sourceAttribute: "movement" },
      { signalId: "fuelLevel", timestampIso, value: point.fuelLevelPercent, sourceAttribute: "fuelLevel" },
      { signalId: "batteryLevel", timestampIso, value: Math.max(35, 91 - segmentIndex * 7 - pointIndex), sourceAttribute: "batteryLevel" },
      { signalId: "externalVoltage", timestampIso, value: moving ? 12.1 + segmentIndex * 0.08 : 0, sourceAttribute: "externalVoltage" },
      { signalId: "engineRpm", timestampIso, value: moving ? Math.round(850 + averageSpeedKph * 18 + pointIndex * 45) : 0, sourceAttribute: "engineRpm" },
      { signalId: "gnssHdop", timestampIso, value: 0.8 + segmentIndex * 0.25, sourceAttribute: "gnssHdop" },
      { signalId: "gsmSignal", timestampIso, value: Math.max(2, 5 - segmentIndex), sourceAttribute: "gsmSignal" },
    ];

    if (eventMarkers.length && pointIndex === 0) {
      samples.push({
        signalId: "alarm",
        timestampIso,
        value: {
          eventType: eventMarkers[0].eventType,
          severity: "warning",
          metadata: { sourceAttribute: eventMarkers[0].sourceAttribute ?? "alarm" },
        },
        sourceAttribute: eventMarkers[0].sourceAttribute,
      });
    }

    return samples;
  });
}

function hydratePlaybackRoute(route: PlaybackRouteFixture): PlaybackRoute {
  const routePoints = route.points.map((point, pointIndex, points) => {
    const nextPoint = points[pointIndex + 1] ?? point;
    const previousPoint = points[pointIndex - 1] ?? point;
    const durationHours = Math.max(
      1 / 3600,
      (new Date(nextPoint.timestampIso).valueOf() - new Date(previousPoint.timestampIso).valueOf()) / 3_600_000,
    );
    const distanceKm = getDistanceMeters(previousPoint, nextPoint) / 1000;

    return {
      ...point,
      speedKph: Math.min(72, Math.max(0, Math.round(distanceKm / durationHours))),
      directionDegrees: pointIndex < points.length - 1 ? Math.round(getBearingDegrees(point, nextPoint)) : undefined,
      ignitionOn: true,
      movement: pointIndex < points.length - 1,
    };
  });

  return {
    ...route,
    points: routePoints,
    tripSegments: route.tripSegments.map((segment, segmentIndex) => {
      const segmentPoints = getSegmentPoints(routePoints, segment.startProgressPercent, segment.endProgressPercent);
      const startPoint = routePoints[getPointIndex(routePoints.length, segment.startProgressPercent)];
      const endPoint = routePoints[getPointIndex(routePoints.length, segment.endProgressPercent)];
      const durationMinutes = Math.max(
        1,
        (new Date(endPoint?.timestampIso ?? "").valueOf() - new Date(startPoint?.timestampIso ?? "").valueOf()) / 60_000,
      );
      const distanceKm = getRouteDistanceMeters(segmentPoints) / 1000;
      const averageSpeedKph = distanceKm / (durationMinutes / 60);
      const graphSeries = createGraphSeries(routePoints, segment.startProgressPercent, segment.endProgressPercent, segmentIndex);
      const maxSpeedKph = Math.max(averageSpeedKph, ...graphSeries.map((point) => point.speedKph));
      const markers = createSegmentMarkers(routePoints, segment.startProgressPercent, segment.endProgressPercent, segmentIndex, segment.stopCount);
      const eventMarkers = createSegmentEventMarkers(segmentIndex, startPoint?.timestampIso ?? routePoints[0]?.timestampIso ?? "");
      const speedBand: RouteSegmentSpeedBand = getTripSegmentSpeedBand(averageSpeedKph);
      const state: RouteSegmentState = deriveTripSegmentState({
        activeAlarmCount: eventMarkers.length,
        breakDurationMinutes: markers.find((marker) => marker.type === "break")?.durationMinutes,
        stopDurationMinutes: markers.find((marker) => marker.type === "stop")?.durationMinutes,
        ignitionOn: !markers.some((marker) => marker.type === "engineOff"),
        movement: averageSpeedKph > 0,
        speedKph: averageSpeedKph,
      });

      return {
        ...segment,
        startLabel: startPoint ? formatTimeLabel(startPoint.timestampIso) : segment.startLabel,
        endLabel: endPoint ? formatTimeLabel(endPoint.timestampIso) : segment.endLabel,
        startTimeIso: startPoint?.timestampIso ?? routePoints[0]?.timestampIso ?? "",
        endTimeIso: endPoint?.timestampIso ?? routePoints.at(-1)?.timestampIso ?? "",
        durationLabel: formatDurationLabel(durationMinutes),
        distanceLabel: formatDistanceLabel(distanceKm),
        maxSpeedLabel: formatSpeedLabel(maxSpeedKph),
        averageSpeedLabel: formatSpeedLabel(averageSpeedKph),
        durationMinutes,
        distanceKm,
        maxSpeedKph,
        averageSpeedKph,
        state,
        speedBand,
        telemetryState: {
          state,
          speedBand,
          speedKph: averageSpeedKph,
          ignitionOn: !markers.some((marker) => marker.type === "engineOff"),
          movement: averageSpeedKph > 0,
          activeAlarmCount: eventMarkers.length,
          stopDurationMinutes: markers.find((marker) => marker.type === "stop")?.durationMinutes,
          breakDurationMinutes: markers.find((marker) => marker.type === "break")?.durationMinutes,
        },
        markers,
        directionSamples: createDirectionSamples(routePoints, segment.startProgressPercent, segment.endProgressPercent),
        eventMarkers,
        telemetrySamples: createSegmentTelemetrySamples(graphSeries, averageSpeedKph, segmentIndex, eventMarkers),
        graphSeries,
      };
    }),
  };
}

export class MockPlaybackRepository implements PlaybackRepository {
  private readonly vehicles: Vehicle[];
  private readonly routes: typeof MOCK_PLAYBACK_ROUTE_FIXTURES;

  constructor(
    seedVehicles: Vehicle[] = MOCK_PLAYBACK_VEHICLES,
    seedRoutes: typeof MOCK_PLAYBACK_ROUTE_FIXTURES = MOCK_PLAYBACK_ROUTE_FIXTURES,
  ) {
    this.vehicles = cloneFixture(seedVehicles);
    this.routes = cloneFixture(seedRoutes);
  }

  async listPlaybackVehicles(): Promise<Vehicle[]> {
    const todayIso = getCurrentMockDateKey();
    return cloneFixture(rebaseVehicleCollectionToDate(this.vehicles, todayIso));
  }

  async getPlaybackRoute(vehicleId: string, query: PlaybackQuery): Promise<PlaybackRoute | null> {
    const normalizedQuery = normalizePlaybackQuery(query);
    if (!normalizedQuery) {
      return null;
    }

    const route = this.routes[vehicleId]?.[normalizedQuery.fixtureKey];
    return route ? hydratePlaybackRoute(rebaseRouteToDate(cloneFixture(route), normalizedQuery.targetDateIso)) : null;
  }

  async getPlaybackTelemetryTimeline(vehicleId: string, query: PlaybackQuery, signalIds: string[] = []): Promise<TelemetryTimeline | null> {
    const route = await this.getPlaybackRoute(vehicleId, query);
    if (!route) {
      return null;
    }

    const samples = route.tripSegments.flatMap((segment) => segment.telemetrySamples ?? []);

    return {
      vehicleId,
      rangeStartIso: route.points[0]?.timestampIso ?? "",
      rangeEndIso: route.points.at(-1)?.timestampIso ?? "",
      signals: TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
      samples: signalIds.length ? samples.filter((sample) => signalIds.includes(sample.signalId)) : samples,
    };
  }
}
