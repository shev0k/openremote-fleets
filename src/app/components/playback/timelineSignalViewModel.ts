import type { PlaybackRoute, RouteSegmentEventMarker, TripSegment } from "../../../domain/models/playback";
import { TelemetryEventValue, TelemetrySignalSample, TelemetrySignalValue, TelemetrySignalValueType } from "../../../domain/models/telemetry";

export type TimelineSignalDisplayMode = "single" | "multi";

export type TimelineSignalVisualType = "line" | "state" | "event";

export interface TimelineSignalOption {
  id: string;
  label: string;
  valueType: TelemetrySignalValueType;
  visualType: TimelineSignalVisualType;
  unit?: string;
  color: string;
}

export interface TimelineSignalPoint {
  timestampIso: string;
  progressPercent: number;
  value: TelemetrySignalValue;
  numericValue: number;
  label: string;
  sourceAttribute?: string;
  severity?: "info" | "warning" | "critical";
}

export interface TimelineSignalRow extends TimelineSignalOption {
  signalId: string;
  points: TimelineSignalPoint[];
  minValue: number;
  maxValue: number;
}

const SIGNAL_OPTIONS: TimelineSignalOption[] = [
  { id: "ignition", label: "Ignition", valueType: "boolean", visualType: "state", color: "var(--brand)" },
  { id: "movement", label: "Movement", valueType: "boolean", visualType: "state", color: "var(--info)" },
  { id: "alarm", label: "Alarms", valueType: "event", visualType: "event", color: "var(--danger)" },
  { id: "speed", label: "Speed", valueType: "numeric", visualType: "line", unit: "km/h", color: "var(--brand)" },
  { id: "fuelLevel", label: "Fuel", valueType: "numeric", visualType: "line", unit: "%", color: "var(--info)" },
  { id: "batteryLevel", label: "Battery", valueType: "numeric", visualType: "line", unit: "%", color: "var(--success)" },
  { id: "engineRpm", label: "RPM", valueType: "numeric", visualType: "line", unit: "rpm", color: "var(--warning)" },
  { id: "gnssHdop", label: "GNSS HDOP", valueType: "numeric", visualType: "line", color: "var(--content-muted)" },
];

const SIGNAL_OPTION_BY_ID = new Map(SIGNAL_OPTIONS.map((option) => [option.id, option]));

function getSelectedSignalIds(availableIds: Set<string>, selectedSignalIds: string[], displayMode: TimelineSignalDisplayMode): string[] {
  const selectedIds = selectedSignalIds.filter((signalId) => availableIds.has(signalId));

  if (!selectedIds.length) {
    return [];
  }

  if (displayMode === "single") {
    return [selectedIds[0]];
  }

  return SIGNAL_OPTIONS
    .map((option) => option.id)
    .filter((signalId) => selectedIds.includes(signalId));
}

function getKnownOption(signalId: string): TimelineSignalOption {
  return SIGNAL_OPTION_BY_ID.get(signalId) ?? {
    id: signalId,
    label: signalId,
    valueType: "numeric",
    visualType: "line",
    color: "var(--content-muted)",
  };
}

function createAlarmSampleFromEventMarker(marker: RouteSegmentEventMarker): TelemetrySignalSample<TelemetryEventValue> {
  const metadata = marker.sourceAttribute ? { sourceAttribute: marker.sourceAttribute } : undefined;
  return {
    signalId: "alarm",
    timestampIso: marker.timestampIso,
    value: {
      eventType: marker.label || marker.eventType,
      severity: marker.severity,
      metadata,
    },
    sourceAttribute: marker.sourceAttribute ?? "alarm",
  };
}

function getSegmentSamples(segment: TripSegment): TelemetrySignalSample[] {
  const samples = segment.telemetrySamples ?? [];

  if (samples.some((sample) => sample.signalId === "alarm")) {
    return samples;
  }

  return [
    ...samples,
    ...(segment.eventMarkers ?? []).map(createAlarmSampleFromEventMarker),
  ];
}

function getRouteSampleSegments(route: PlaybackRoute): Array<{ segment: TripSegment; samples: TelemetrySignalSample[] }> {
  return route.tripSegments.map((segment) => ({
    segment,
    samples: getSegmentSamples(segment),
  }));
}

function getSignalIds(samples: TelemetrySignalSample[]): Set<string> {
  return samples.reduce<Set<string>>((signalIds, sample) => {
    if (SIGNAL_OPTION_BY_ID.has(sample.signalId)) {
      signalIds.add(sample.signalId);
    }

    return signalIds;
  }, new Set());
}

function getProgressInSegment(segment: TripSegment, timestampIso: string, targetStartPercent = segment.startProgressPercent, targetEndPercent = segment.endProgressPercent): number {
  const timestampMs = new Date(timestampIso).valueOf();
  const startMs = new Date(segment.startTimeIso).valueOf();
  const endMs = new Date(segment.endTimeIso).valueOf();

  if (!Number.isFinite(timestampMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return targetStartPercent;
  }

  const ratio = Math.min(1, Math.max(0, (timestampMs - startMs) / (endMs - startMs)));
  return targetStartPercent + (targetEndPercent - targetStartPercent) * ratio;
}

function isTelemetryEventValue(value: TelemetrySignalValue): value is TelemetryEventValue {
  return typeof value === "object" && value !== null && "eventType" in value;
}

function toTitleLabel(value: string): string {
  const titleLabel = value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .join(" ");

  return `${titleLabel.charAt(0).toUpperCase()}${titleLabel.slice(1)}`;
}

function getNumericValue(signalId: string, value: TelemetrySignalValue): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (signalId === "alarm" && isTelemetryEventValue(value)) {
    return value.eventType === "normal" ? 0 : 1;
  }

  return 0;
}

function getSeverity(value: TelemetrySignalValue): "info" | "warning" | "critical" | undefined {
  return isTelemetryEventValue(value) ? value.severity : undefined;
}

function createPoint(segment: TripSegment, sample: TelemetrySignalSample, targetStartPercent?: number, targetEndPercent?: number): TimelineSignalPoint {
  return {
    timestampIso: sample.timestampIso,
    progressPercent: getProgressInSegment(segment, sample.timestampIso, targetStartPercent, targetEndPercent),
    value: sample.value,
    numericValue: getNumericValue(sample.signalId, sample.value),
    label: formatTimelineSignalValue(sample.signalId, sample.value),
    sourceAttribute: sample.sourceAttribute,
    severity: getSeverity(sample.value),
  };
}

function createRows(
  sampleSegments: Array<{ segment: TripSegment; samples: TelemetrySignalSample[] }>,
  selectedSignalIds: string[],
  displayMode: TimelineSignalDisplayMode,
  segmentLocal = false,
): TimelineSignalRow[] {
  const availableIds = getSignalIds(sampleSegments.flatMap(({ samples }) => samples));
  const resolvedSignalIds = getSelectedSignalIds(availableIds, selectedSignalIds, displayMode);

  return resolvedSignalIds.map((signalId) => {
    const option = getKnownOption(signalId);
    const points = sampleSegments
      .flatMap(({ segment, samples }) =>
        samples
          .filter((sample) => sample.signalId === signalId)
          .map((sample) => createPoint(segment, sample, segmentLocal ? 0 : undefined, segmentLocal ? 100 : undefined)),
      )
      .sort((left, right) => left.progressPercent - right.progressPercent);

    const numericValues = points.map((point) => point.numericValue);
    const minValue = numericValues.length ? Math.min(...numericValues) : 0;
    const maxValue = numericValues.length ? Math.max(...numericValues) : 1;

    return {
      ...option,
      signalId,
      points,
      minValue,
      maxValue: maxValue === minValue ? minValue + 1 : maxValue,
    };
  });
}

export function getTimelineSignalOptions(route: PlaybackRoute | null): TimelineSignalOption[] {
  if (!route) {
    return [];
  }

  const availableIds = getSignalIds(getRouteSampleSegments(route).flatMap(({ samples }) => samples));
  return SIGNAL_OPTIONS.filter((option) => availableIds.has(option.id));
}

export function getSegmentSignalOptions(segment: TripSegment | null): TimelineSignalOption[] {
  if (!segment) {
    return [];
  }

  const availableIds = getSignalIds(getSegmentSamples(segment));
  return SIGNAL_OPTIONS.filter((option) => availableIds.has(option.id));
}

export function buildTimelineSignalRows(
  route: PlaybackRoute | null,
  selectedSignalIds: string[],
  displayMode: TimelineSignalDisplayMode,
): TimelineSignalRow[] {
  if (!route) {
    return [];
  }

  return createRows(getRouteSampleSegments(route), selectedSignalIds, displayMode);
}

export function buildSegmentSignalRows(
  segment: TripSegment | null,
  selectedSignalIds: string[],
  displayMode: TimelineSignalDisplayMode,
): TimelineSignalRow[] {
  if (!segment) {
    return [];
  }

  return createRows([{ segment, samples: getSegmentSamples(segment) }], selectedSignalIds, displayMode, true);
}

export function formatTimelineSignalValue(signalId: string, value: TelemetrySignalValue): string {
  if (signalId === "ignition" && typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (signalId === "movement" && typeof value === "boolean") {
    return value ? "Moving" : "Stopped";
  }

  if (isTelemetryEventValue(value)) {
    return toTitleLabel(value.eventType);
  }

  if (typeof value === "number") {
    const option = getKnownOption(signalId);
    const rounded = signalId === "gnssHdop" ? Number(value.toFixed(1)) : Math.round(value);
    return option.unit ? `${rounded} ${option.unit}` : `${rounded}`;
  }

  return String(value);
}

export function getTimelineSignalValuesAtProgress(rows: TimelineSignalRow[], progress: number): Record<string, string> {
  return rows.reduce<Record<string, string>>((valuesBySignal, row) => {
    if (!row.points.length) {
      return valuesBySignal;
    }

    const normalizedProgress = Math.min(100, Math.max(0, progress));
    const firstPoint = row.points[0];
    const lastPoint = row.points[row.points.length - 1];

    if (normalizedProgress <= firstPoint.progressPercent) {
      valuesBySignal[row.signalId] = firstPoint.label;
      return valuesBySignal;
    }

    if (normalizedProgress >= lastPoint.progressPercent) {
      valuesBySignal[row.signalId] = lastPoint.label;
      return valuesBySignal;
    }

    let previousPointIndex = 0;
    for (let pointIndex = 0; pointIndex < row.points.length; pointIndex += 1) {
      if (row.points[pointIndex].progressPercent <= normalizedProgress) {
        previousPointIndex = pointIndex;
      }
    }

    const previousPoint = row.points[previousPointIndex];
    const nextPoint = row.points[previousPointIndex + 1] ?? previousPoint;

    if (row.visualType === "line" && previousPoint !== nextPoint) {
      const progressRange = nextPoint.progressPercent - previousPoint.progressPercent;
      if (progressRange <= 0) {
        valuesBySignal[row.signalId] = previousPoint.label;
        return valuesBySignal;
      }

      const ratio = (normalizedProgress - previousPoint.progressPercent) / progressRange;
      const interpolatedValue = previousPoint.numericValue + (nextPoint.numericValue - previousPoint.numericValue) * ratio;
      valuesBySignal[row.signalId] = formatTimelineSignalValue(row.signalId, interpolatedValue);
      return valuesBySignal;
    }

    valuesBySignal[row.signalId] = previousPoint.label;
    return valuesBySignal;
  }, {});
}

export interface TimelineSignalSnapshotValue {
  value: TelemetrySignalValue;
  label: string;
  timestampIso: string;
  sourceAttribute?: string;
}

export function getTimelineSignalSnapshotAtProgress(
  rows: TimelineSignalRow[],
  progress: number,
): Record<string, TimelineSignalSnapshotValue> {
  return rows.reduce<Record<string, TimelineSignalSnapshotValue>>((valuesBySignal, row) => {
    if (!row.points.length) {
      return valuesBySignal;
    }

    const normalizedProgress = Math.min(100, Math.max(0, progress));
    const firstPoint = row.points[0];
    const lastPoint = row.points[row.points.length - 1];
    const toSnapshot = (point: TimelineSignalPoint, value: TelemetrySignalValue = point.value): TimelineSignalSnapshotValue => ({
      value,
      label: formatTimelineSignalValue(row.signalId, value),
      timestampIso: point.timestampIso,
      sourceAttribute: point.sourceAttribute,
    });

    if (normalizedProgress <= firstPoint.progressPercent) {
      valuesBySignal[row.signalId] = toSnapshot(firstPoint);
      return valuesBySignal;
    }

    if (normalizedProgress >= lastPoint.progressPercent) {
      valuesBySignal[row.signalId] = toSnapshot(lastPoint);
      return valuesBySignal;
    }

    let previousPointIndex = 0;
    for (let pointIndex = 0; pointIndex < row.points.length; pointIndex += 1) {
      if (row.points[pointIndex].progressPercent <= normalizedProgress) {
        previousPointIndex = pointIndex;
      }
    }

    const previousPoint = row.points[previousPointIndex];
    const nextPoint = row.points[previousPointIndex + 1] ?? previousPoint;

    if (row.visualType === "line" && previousPoint !== nextPoint) {
      const progressRange = nextPoint.progressPercent - previousPoint.progressPercent;
      if (progressRange <= 0) {
        valuesBySignal[row.signalId] = toSnapshot(previousPoint);
        return valuesBySignal;
      }

      const ratio = (normalizedProgress - previousPoint.progressPercent) / progressRange;
      const interpolatedValue = previousPoint.numericValue + (nextPoint.numericValue - previousPoint.numericValue) * ratio;
      const previousMs = new Date(previousPoint.timestampIso).valueOf();
      const nextMs = new Date(nextPoint.timestampIso).valueOf();
      const timestampIso =
        Number.isFinite(previousMs) && Number.isFinite(nextMs)
          ? new Date(previousMs + (nextMs - previousMs) * ratio).toISOString()
          : previousPoint.timestampIso;

      valuesBySignal[row.signalId] = {
        value: interpolatedValue,
        label: formatTimelineSignalValue(row.signalId, interpolatedValue),
        timestampIso,
        sourceAttribute: previousPoint.sourceAttribute ?? nextPoint.sourceAttribute,
      };
      return valuesBySignal;
    }

    valuesBySignal[row.signalId] = toSnapshot(previousPoint);
    return valuesBySignal;
  }, {});
}

function getDensestTimelineRow(rows: TimelineSignalRow[]): TimelineSignalRow | null {
  return rows.reduce<TimelineSignalRow | null>((densestRow, row) => {
    if (!row.points.length) {
      return densestRow;
    }

    if (!densestRow || row.points.length > densestRow.points.length) {
      return row;
    }

    return densestRow;
  }, null);
}

export function getTimelineTooltipTimestampIsoAtProgress(rows: TimelineSignalRow[], progress: number): string | null {
  const row = getDensestTimelineRow(rows);
  if (!row) {
    return null;
  }

  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const firstPoint = row.points[0];
  const lastPoint = row.points[row.points.length - 1];

  if (normalizedProgress <= firstPoint.progressPercent) {
    return firstPoint.timestampIso;
  }

  if (normalizedProgress >= lastPoint.progressPercent) {
    return lastPoint.timestampIso;
  }

  let previousPointIndex = 0;
  for (let pointIndex = 0; pointIndex < row.points.length; pointIndex += 1) {
    if (row.points[pointIndex].progressPercent <= normalizedProgress) {
      previousPointIndex = pointIndex;
    }
  }

  const previousPoint = row.points[previousPointIndex];
  const nextPoint = row.points[previousPointIndex + 1] ?? previousPoint;
  if (previousPoint === nextPoint) {
    return previousPoint.timestampIso;
  }

  const previousMs = new Date(previousPoint.timestampIso).valueOf();
  const nextMs = new Date(nextPoint.timestampIso).valueOf();
  if (!Number.isFinite(previousMs) || !Number.isFinite(nextMs)) {
    return previousPoint.timestampIso;
  }

  const progressRange = nextPoint.progressPercent - previousPoint.progressPercent;
  if (progressRange <= 0) {
    return previousPoint.timestampIso;
  }

  const ratio = (normalizedProgress - previousPoint.progressPercent) / progressRange;
  return new Date(previousMs + (nextMs - previousMs) * ratio).toISOString();
}

export function shouldUseFullTooltipTimestamp(rows: TimelineSignalRow[]): boolean {
  const dateKeys = new Set(
    rows.flatMap((row) =>
      row.points
        .map((point) => point.timestampIso.slice(0, 10))
        .filter(Boolean),
    ),
  );

  return dateKeys.size > 1;
}
