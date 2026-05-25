import { TelemetrySignalSample } from "./telemetry";

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestampIso: string;
  speedKph?: number;
  directionDegrees?: number;
  ignitionOn?: boolean;
  movement?: boolean;
  trip?: boolean;
  gsmSignal?: number;
  gnssStatus?: boolean;
  gnssHdop?: number;
  satellites?: number;
}

export type PlaybackQueryPreset = "today" | "yesterday" | "last7Days" | "last24Hours" | "customDate";

export interface PlaybackQuery {
  preset: PlaybackQueryPreset;
  customDateIso?: string;
}

export interface TripSegmentGraphPoint {
  timestampIso: string;
  speedKph: number;
  fuelLevelPercent: number;
}

export type RouteSegmentState = "moving" | "idle" | "stopped" | "break" | "engineOff" | "alarm";

export type RouteSegmentSpeedBand = "stationary" | "slow" | "normal" | "fast" | "overspeed";

export type RouteSegmentMarkerType = "stop" | "idle" | "break" | "engineOff" | "offline" | "signal" | "alarm";

export interface RouteSegmentTelemetryState {
  state: RouteSegmentState;
  speedBand: RouteSegmentSpeedBand;
  speedKph?: number;
  ignitionOn?: boolean;
  movement?: boolean;
  activeAlarmCount?: number;
  stopDurationMinutes?: number;
  breakDurationMinutes?: number;
}

export interface RouteSegmentStateInput {
  speedKph?: number;
  ignitionOn?: boolean;
  movement?: boolean;
  activeAlarmCount?: number;
  stopDurationMinutes?: number;
  breakDurationMinutes?: number;
}

export interface RouteSegmentMarker {
  id: string;
  type: RouteSegmentMarkerType;
  timestampIso: string;
  latitude: number;
  longitude: number;
  label?: string;
  durationMinutes?: number;
  playbackWindowMinutes?: number;
}

export interface RouteDirectionSample {
  timestampIso: string;
  latitude: number;
  longitude: number;
  directionDegrees: number;
}

export interface RouteSegmentEventMarker {
  id: string;
  eventType: string;
  timestampIso: string;
  label: string;
  severity?: "info" | "warning" | "critical";
  sourceAttribute?: string;
}

export interface TripSegment {
  id: string;
  startLabel: string;
  endLabel: string;
  startTimeIso: string;
  endTimeIso: string;
  durationLabel: string;
  durationMinutes: number;
  distanceLabel: string;
  distanceKm: number;
  stopCount: number;
  maxSpeedLabel: string;
  maxSpeedKph: number;
  averageSpeedLabel: string;
  averageSpeedKph: number;
  startProgressPercent: number;
  endProgressPercent: number;
  telemetryState?: RouteSegmentTelemetryState;
  state?: RouteSegmentState;
  speedBand?: RouteSegmentSpeedBand;
  markers?: RouteSegmentMarker[];
  directionSamples?: RouteDirectionSample[];
  telemetrySamples?: TelemetrySignalSample[];
  eventMarkers?: RouteSegmentEventMarker[];
  graphSeries?: TripSegmentGraphPoint[];
}

export interface PlaybackRoute {
  vehicleId: string;
  points: RoutePoint[];
  tripSegments: TripSegment[];
}

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

export function formatDurationLabel(durationMinutes: number): string {
  const roundedMinutes = Math.max(1, Math.round(durationMinutes));
  if (roundedMinutes < 60) {
    return `${roundedMinutes} min`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatDistanceLabel(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}

export function formatSpeedLabel(speedKph: number): string {
  return `${Math.round(speedKph)} km/h`;
}

export function getPointIndex(pointsLength: number, progress: number): number {
  if (pointsLength <= 1) {
    return 0;
  }

  return Math.min(pointsLength - 1, Math.max(0, Math.round((clampProgress(progress) / 100) * (pointsLength - 1))));
}

export function getTripSegmentSpeedBand(speedKph: number): RouteSegmentSpeedBand {
  if (speedKph <= 0) {
    return "stationary";
  }

  if (speedKph <= 15) {
    return "slow";
  }

  if (speedKph <= 80) {
    return "normal";
  }

  if (speedKph <= 100) {
    return "fast";
  }

  return "overspeed";
}

export function deriveTripSegmentState(input: RouteSegmentStateInput): RouteSegmentState {
  if ((input.activeAlarmCount ?? 0) > 0) {
    return "alarm";
  }

  if (input.ignitionOn === false) {
    return "engineOff";
  }

  if ((input.breakDurationMinutes ?? 0) > 0) {
    return "break";
  }

  if ((input.stopDurationMinutes ?? 0) > 0) {
    return "stopped";
  }

  if (input.movement === false || input.speedKph === 0) {
    return "idle";
  }

  return "moving";
}
