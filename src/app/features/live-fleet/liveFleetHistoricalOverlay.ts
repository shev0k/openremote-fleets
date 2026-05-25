import type { PlaybackRoute, TripSegment } from "../../../domain/models/playback";
import type { TelemetrySignalSample, TelemetrySignalValue } from "../../../domain/models/telemetry";
import type { Vehicle, VehicleDetail } from "../../../domain/models/vehicle";
import {
  buildTimelineSignalRows,
  getTimelineSignalSnapshotAtProgress,
  type TimelineSignalSnapshotValue,
} from "../../components/playback/timelineSignalViewModel";
import {
  getCurrentRouteHeadingDegrees,
  getCurrentRouteSpeedKph,
  getCurrentRouteTelemetryState,
  getCurrentRouteTimestampIso,
  interpolatePlaybackRoutePosition,
} from "../../components/playback/playbackUtils";
import { buildRoutePlaybackVehicleViewModel } from "../../components/playback/routePlaybackVehicleViewModel";

export interface LiveFleetHistoricalOverlayState {
  vehicle: Vehicle;
  detail: VehicleDetail | null;
  isHistorical: boolean;
}

export interface BuildLiveFleetHistoricalOverlayStateInput {
  vehicle: Vehicle;
  detail: VehicleDetail | null;
  route: PlaybackRoute | null;
  playbackProgress: number;
  isTimelineInspecting: boolean;
}

const LIVE_PROGRESS_THRESHOLD = 99.5;

const HISTORICAL_SIGNAL_IDS = [
  "speed",
  "ignition",
  "movement",
  "fuelLevel",
  "batteryLevel",
  "engineRpm",
  "externalVoltage",
  "gnssStatus",
  "gnssHdop",
  "satellites",
  "gsmSignal",
  "totalOdometer",
  "tripOdometer",
  "fuelRateGps",
  "fuelUsedGps",
] as const;

const TELEMETRY_ATTRIBUTE_META: Record<string, { avlId: string; displayName: string; parameterGroup: string; unit?: string }> = {
  speed: { avlId: "24", displayName: "Speed", parameterGroup: "GPS", unit: "km/h" },
  ignition: { avlId: "239", displayName: "Ignition", parameterGroup: "Permanent I/O elements" },
  movement: { avlId: "240", displayName: "Movement", parameterGroup: "Permanent I/O elements" },
  fuelLevel: { avlId: "48", displayName: "Fuel level", parameterGroup: "Permanent I/O elements", unit: "%" },
  batteryLevel: { avlId: "113", displayName: "Battery level", parameterGroup: "Permanent I/O elements", unit: "%" },
  engineRpm: { avlId: "36", displayName: "Engine RPM", parameterGroup: "OBD", unit: "rpm" },
  externalVoltage: { avlId: "66", displayName: "External voltage", parameterGroup: "Permanent I/O elements", unit: "V" },
  gnssStatus: { avlId: "69", displayName: "GNSS Status", parameterGroup: "Permanent I/O elements" },
  gnssHdop: { avlId: "182", displayName: "GNSS HDOP", parameterGroup: "Permanent I/O elements" },
  satellites: { avlId: "sat", displayName: "Satellites", parameterGroup: "Frame" },
  gsmSignal: { avlId: "21", displayName: "GSM signal", parameterGroup: "GSM" },
  totalOdometer: { avlId: "16", displayName: "Total odometer", parameterGroup: "OBD", unit: "m" },
  tripOdometer: { avlId: "199", displayName: "Trip odometer", parameterGroup: "OBD", unit: "m" },
  fuelRateGps: { avlId: "13", displayName: "Fuel Rate GPS", parameterGroup: "Permanent I/O elements", unit: "l/100km" },
  fuelUsedGps: { avlId: "12", displayName: "Fuel Used GPS", parameterGroup: "Permanent I/O elements", unit: "l" },
};

type HistoricalSignalId = (typeof HISTORICAL_SIGNAL_IDS)[number];
type HistoricalTeltonikaAttributeValue = string | number | boolean;

function getLiveOverlayState(vehicle: Vehicle, detail: VehicleDetail | null): LiveFleetHistoricalOverlayState {
  return { vehicle, detail, isHistorical: false };
}

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

function getProgressInSegment(segment: TripSegment, timestampIso: string): number {
  const timestampMs = new Date(timestampIso).valueOf();
  const startMs = new Date(segment.startTimeIso).valueOf();
  const endMs = new Date(segment.endTimeIso).valueOf();

  if (!Number.isFinite(timestampMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return segment.startProgressPercent;
  }

  const ratio = Math.min(1, Math.max(0, (timestampMs - startMs) / (endMs - startMs)));
  return segment.startProgressPercent + (segment.endProgressPercent - segment.startProgressPercent) * ratio;
}

function isHistoricalSignalId(signalId: string): signalId is HistoricalSignalId {
  return HISTORICAL_SIGNAL_IDS.includes(signalId as HistoricalSignalId);
}

function isTeltonikaAttributeValue(value: TelemetrySignalValue): value is HistoricalTeltonikaAttributeValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function getNumericValue(value: TelemetrySignalValue): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBooleanValue(value: TelemetrySignalValue): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function getHistoricalNumber(
  snapshots: Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>>,
  signalId: HistoricalSignalId,
): number | null {
  const value = snapshots[signalId]?.value;
  return value === undefined ? null : getNumericValue(value);
}

function getHistoricalBoolean(
  snapshots: Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>>,
  signalId: HistoricalSignalId,
): boolean | null {
  const value = snapshots[signalId]?.value;
  return value === undefined ? null : getBooleanValue(value);
}

function getDirectRouteSampleSnapshots(
  route: PlaybackRoute,
  progress: number,
  existingSignalIds: Set<string>,
): Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>> {
  const samplesBySignal = route.tripSegments
    .flatMap((segment) =>
      (segment.telemetrySamples ?? [])
        .filter((sample) => isHistoricalSignalId(sample.signalId) && !existingSignalIds.has(sample.signalId))
        .map((sample) => ({
          sample,
          progressPercent: getProgressInSegment(segment, sample.timestampIso),
        })),
    )
    .reduce<Partial<Record<HistoricalSignalId, Array<{ sample: TelemetrySignalSample; progressPercent: number }>>>>(
      (bySignal, sampleWithProgress) => {
        const signalId = sampleWithProgress.sample.signalId;
        if (!isHistoricalSignalId(signalId)) {
          return bySignal;
        }

        bySignal[signalId] = [...(bySignal[signalId] ?? []), sampleWithProgress];
        return bySignal;
      },
      {},
    );

  const normalizedProgress = clampProgress(progress);

  return HISTORICAL_SIGNAL_IDS.reduce<Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>>>(
    (snapshots, signalId) => {
      const samples = samplesBySignal[signalId]?.sort((left, right) => left.progressPercent - right.progressPercent);
      if (!samples?.length) {
        return snapshots;
      }

      const toSnapshot = (sampleWithProgress: { sample: TelemetrySignalSample }): TimelineSignalSnapshotValue => ({
        value: sampleWithProgress.sample.value,
        label: String(sampleWithProgress.sample.value),
        timestampIso: sampleWithProgress.sample.timestampIso,
        sourceAttribute: sampleWithProgress.sample.sourceAttribute,
      });

      const firstSample = samples[0];
      const lastSample = samples[samples.length - 1];
      if (normalizedProgress <= firstSample.progressPercent) {
        snapshots[signalId] = toSnapshot(firstSample);
        return snapshots;
      }

      if (normalizedProgress >= lastSample.progressPercent) {
        snapshots[signalId] = toSnapshot(lastSample);
        return snapshots;
      }

      let previousIndex = 0;
      for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
        if (samples[sampleIndex].progressPercent <= normalizedProgress) {
          previousIndex = sampleIndex;
        }
      }

      const previousSample = samples[previousIndex];
      const nextSample = samples[previousIndex + 1] ?? previousSample;
      const previousValue = getNumericValue(previousSample.sample.value);
      const nextValue = getNumericValue(nextSample.sample.value);

      if (previousSample !== nextSample && previousValue !== null && nextValue !== null) {
        const progressRange = nextSample.progressPercent - previousSample.progressPercent;
        if (progressRange <= 0) {
          snapshots[signalId] = toSnapshot(previousSample);
          return snapshots;
        }

        const ratio = (normalizedProgress - previousSample.progressPercent) / progressRange;
        const interpolatedValue = previousValue + (nextValue - previousValue) * ratio;
        const previousMs = new Date(previousSample.sample.timestampIso).valueOf();
        const nextMs = new Date(nextSample.sample.timestampIso).valueOf();
        const timestampIso =
          Number.isFinite(previousMs) && Number.isFinite(nextMs)
            ? new Date(previousMs + (nextMs - previousMs) * ratio).toISOString()
            : previousSample.sample.timestampIso;

        snapshots[signalId] = {
          value: interpolatedValue,
          label: String(interpolatedValue),
          timestampIso,
          sourceAttribute: previousSample.sample.sourceAttribute ?? nextSample.sample.sourceAttribute,
        };
        return snapshots;
      }

      snapshots[signalId] = toSnapshot(previousSample);
      return snapshots;
    },
    {},
  );
}

function getHistoricalSnapshots(
  route: PlaybackRoute,
  progress: number,
): Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>> {
  const timelineRows = buildTimelineSignalRows(route, [...HISTORICAL_SIGNAL_IDS], "multi");
  const timelineSnapshots = getTimelineSignalSnapshotAtProgress(timelineRows, progress);
  const timelineSignalIds = new Set(timelineRows.map((row) => row.signalId));
  const directSnapshots = getDirectRouteSampleSnapshots(route, progress, timelineSignalIds);

  return {
    ...directSnapshots,
    ...Object.fromEntries(
      Object.entries(timelineSnapshots).filter(([signalId]) => isHistoricalSignalId(signalId)),
    ),
  };
}

function updateLatestTelemetrySamples(
  vehicle: Vehicle,
  snapshots: Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>>,
): Vehicle {
  const nextSamplesById = new Map<string, TelemetrySignalSample>(
    (vehicle.latestTelemetrySamples ?? []).map((sample) => [sample.signalId, { ...sample }]),
  );

  HISTORICAL_SIGNAL_IDS.forEach((signalId) => {
    const snapshot = snapshots[signalId];
    if (!snapshot) {
      return;
    }

    nextSamplesById.set(signalId, {
      signalId,
      value: snapshot.value,
      timestampIso: snapshot.timestampIso,
      sourceAttribute: snapshot.sourceAttribute ?? signalId,
    });
  });

  return {
    ...vehicle,
    latestTelemetrySamples: Array.from(nextSamplesById.values()),
  };
}

function updateTeltonikaAttributes(
  vehicle: Vehicle,
  snapshots: Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>>,
  historicalTimestampIso: string,
): Vehicle {
  if (!vehicle.teltonika) {
    return vehicle;
  }

  const attributes = { ...vehicle.teltonika.attributes };

  HISTORICAL_SIGNAL_IDS.forEach((signalId) => {
    const snapshot = snapshots[signalId];
    if (!snapshot || !isTeltonikaAttributeValue(snapshot.value)) {
      return;
    }

    const existing = attributes[signalId];
    const fallback = TELEMETRY_ATTRIBUTE_META[signalId];
    const unit = existing?.unit ?? fallback.unit;
    attributes[signalId] = {
      avlId: existing?.avlId ?? fallback.avlId,
      attributeName: existing?.attributeName ?? signalId,
      displayName: existing?.displayName ?? fallback.displayName,
      parameterGroup: existing?.parameterGroup ?? fallback.parameterGroup,
      ...(unit ? { unit } : {}),
      value: snapshot.value,
      timestampIso: snapshot.timestampIso,
    };
  });

  return {
    ...vehicle,
    teltonika: {
      ...vehicle.teltonika,
      timestampIso: historicalTimestampIso,
      attributes,
    },
  };
}

function applyHistoricalVehicleTelemetry(
  vehicle: Vehicle,
  snapshots: Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>>,
  historicalTimestampIso: string,
): Vehicle {
  const fuelLevel = getHistoricalNumber(snapshots, "fuelLevel");
  const batteryLevel = getHistoricalNumber(snapshots, "batteryLevel");

  const nextVehicle = {
    ...vehicle,
    lastUpdatedIso: historicalTimestampIso,
    ...(fuelLevel !== null ? { fuelLevelPercent: fuelLevel } : {}),
    ...(batteryLevel !== null ? { batteryLevelPercent: batteryLevel } : {}),
  };

  return updateTeltonikaAttributes(updateLatestTelemetrySamples(nextVehicle, snapshots), snapshots, historicalTimestampIso);
}

function applyHistoricalDetailTelemetry(
  detail: VehicleDetail | null,
  vehicle: Vehicle,
  snapshots: Partial<Record<HistoricalSignalId, TimelineSignalSnapshotValue>>,
  historicalTimestampIso: string,
): VehicleDetail | null {
  if (!detail) {
    return null;
  }

  const gnssHdop = getHistoricalNumber(snapshots, "gnssHdop");
  const tripOdometer = getHistoricalNumber(snapshots, "tripOdometer");
  const totalOdometer = getHistoricalNumber(snapshots, "totalOdometer");
  const fuelRateGps = getHistoricalNumber(snapshots, "fuelRateGps");

  return {
    ...detail,
    ...vehicle,
    lastCommunicationIso: historicalTimestampIso,
    gpsAccuracyMeters: gnssHdop !== null ? Math.max(4, Math.round(gnssHdop * 10)) : detail.gpsAccuracyMeters,
    todayMileageKm: tripOdometer !== null ? tripOdometer / 1000 : detail.todayMileageKm,
    odometerKm: totalOdometer !== null ? totalOdometer / 1000 : detail.odometerKm,
    averageFuelConsumptionLitersPer100Km:
      fuelRateGps !== null ? fuelRateGps : detail.averageFuelConsumptionLitersPer100Km,
  };
}

export function buildLiveFleetHistoricalOverlayState({
  vehicle,
  detail,
  route,
  playbackProgress,
  isTimelineInspecting,
}: BuildLiveFleetHistoricalOverlayStateInput): LiveFleetHistoricalOverlayState {
  if (!isTimelineInspecting || playbackProgress >= LIVE_PROGRESS_THRESHOLD || !route || route.vehicleId !== vehicle.id) {
    return getLiveOverlayState(vehicle, detail);
  }

  const historicalTimestampIso = getCurrentRouteTimestampIso(route, playbackProgress);
  if (!historicalTimestampIso) {
    return getLiveOverlayState(vehicle, detail);
  }

  const snapshots = getHistoricalSnapshots(route, playbackProgress);
  const routeTelemetry = getCurrentRouteTelemetryState(route, playbackProgress);
  const playbackVehicle = buildRoutePlaybackVehicleViewModel({
    vehicle,
    playbackPosition: interpolatePlaybackRoutePosition(route, playbackProgress),
    speedKph: getHistoricalNumber(snapshots, "speed") ?? getCurrentRouteSpeedKph(route, playbackProgress),
    headingDegrees: getCurrentRouteHeadingDegrees(route, playbackProgress),
    timestampIso: historicalTimestampIso,
    activeAlertCount: vehicle.activeAlertCount,
    hasRouteTelemetry: true,
    routeIgnitionOn: getHistoricalBoolean(snapshots, "ignition") ?? routeTelemetry?.ignitionOn,
    routeMovement: getHistoricalBoolean(snapshots, "movement") ?? routeTelemetry?.movement,
    routeTrip: routeTelemetry?.trip,
    routeGsmSignal: getHistoricalNumber(snapshots, "gsmSignal") ?? routeTelemetry?.gsmSignal,
    routeGnssStatus: getHistoricalBoolean(snapshots, "gnssStatus") ?? routeTelemetry?.gnssStatus,
    routeGnssHdop: getHistoricalNumber(snapshots, "gnssHdop") ?? routeTelemetry?.gnssHdop,
    routeSatellites: getHistoricalNumber(snapshots, "satellites") ?? routeTelemetry?.satellites,
    routeMarkerStatus: routeTelemetry?.markerStatus,
  });
  const historicalVehicle = applyHistoricalVehicleTelemetry(playbackVehicle, snapshots, historicalTimestampIso);

  return {
    vehicle: historicalVehicle,
    detail: applyHistoricalDetailTelemetry(detail, historicalVehicle, snapshots, historicalTimestampIso),
    isHistorical: true,
  };
}
