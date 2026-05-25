import type { RouteSegmentMarker, TripSegment } from "../../../domain/models/playback";
import { formatDurationLabel } from "./playbackUtils";

export interface SegmentGraphEvent {
  id: string;
  timestampIso: string;
  label: string;
  severity: "info" | "warning" | "critical";
  sourceLabel: string;
}

const MARKER_SOURCE_LABELS: Record<RouteSegmentMarker["type"], string> = {
  stop: "Stop policy",
  idle: "Idling policy",
  break: "Break policy",
  engineOff: "Engine-off policy",
  offline: "Offline policy",
  signal: "Signal policy",
  alarm: "Alarm policy",
};

const MARKER_SEVERITY: Record<RouteSegmentMarker["type"], SegmentGraphEvent["severity"]> = {
  stop: "info",
  idle: "info",
  break: "warning",
  engineOff: "info",
  offline: "critical",
  signal: "warning",
  alarm: "critical",
};

function withDurationLabel(label: string, durationMinutes?: number): string {
  return durationMinutes && durationMinutes > 0 ? `${label} · ${formatDurationLabel(durationMinutes)}` : label;
}

function getTimestampMs(timestampIso: string): number | null {
  const timestampMs = new Date(timestampIso).valueOf();
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function compareSegmentGraphEvents(left: SegmentGraphEvent, right: SegmentGraphEvent): number {
  const leftTimestampMs = getTimestampMs(left.timestampIso);
  const rightTimestampMs = getTimestampMs(right.timestampIso);

  if (leftTimestampMs !== null && rightTimestampMs !== null && leftTimestampMs !== rightTimestampMs) {
    return leftTimestampMs - rightTimestampMs;
  }

  if (leftTimestampMs !== null && rightTimestampMs === null) {
    return -1;
  }

  if (leftTimestampMs === null && rightTimestampMs !== null) {
    return 1;
  }

  return left.id.localeCompare(right.id);
}

export function getSegmentGraphEvents(segment: TripSegment | null): SegmentGraphEvent[] {
  if (!segment) {
    return [];
  }

  const markerEvents = (segment.markers ?? []).map<SegmentGraphEvent>((marker) => ({
    id: marker.id,
    timestampIso: marker.timestampIso,
    label: withDurationLabel(marker.label ?? MARKER_SOURCE_LABELS[marker.type], marker.durationMinutes),
    severity: MARKER_SEVERITY[marker.type],
    sourceLabel: MARKER_SOURCE_LABELS[marker.type],
  }));

  const routeEvents = (segment.eventMarkers ?? []).map<SegmentGraphEvent>((eventMarker) => ({
    id: eventMarker.id,
    timestampIso: eventMarker.timestampIso,
    label: eventMarker.label,
    severity: eventMarker.severity ?? "info",
    sourceLabel: eventMarker.sourceAttribute ?? eventMarker.eventType,
  }));

  return [...markerEvents, ...routeEvents].sort(compareSegmentGraphEvents);
}
