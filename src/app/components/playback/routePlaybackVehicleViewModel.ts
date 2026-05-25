import type { TeltonikaAttributeValue } from "../../../domain/models/teltonika";
import { Vehicle, VehicleMarkerStatusOverride, VehicleStatus } from "../../../domain/models/vehicle";
import { deriveVehicleOperationalStatus } from "../../../domain/models/vehicleOperationalStatus";

export const PLAYBACK_MOVING_SPEED_THRESHOLD_KPH = 2;
const HISTORICAL_MARKER_ATTRIBUTE_NAMES = ["trip", "gsmSignal", "gnssStatus", "gnssHdop", "satellites"] as const;

const PLAYBACK_ATTRIBUTE_META: Record<string, { avlId: string; displayName: string; parameterGroup: string; unit?: string }> = {
  gpsLocation: { avlId: "0", displayName: "GPS location", parameterGroup: "Location" },
  speed: { avlId: "24", displayName: "Speed", parameterGroup: "GPS", unit: "km/h" },
  direction: { avlId: "ang", displayName: "Direction", parameterGroup: "GPS", unit: "deg" },
  ignition: { avlId: "239", displayName: "Ignition", parameterGroup: "Permanent I/O elements" },
  movement: { avlId: "240", displayName: "Movement", parameterGroup: "Permanent I/O elements" },
  priority: { avlId: "priority", displayName: "Priority", parameterGroup: "AVL packet" },
  trip: { avlId: "250", displayName: "Trip", parameterGroup: "Permanent I/O elements" },
  gsmSignal: { avlId: "21", displayName: "GSM signal", parameterGroup: "GSM" },
  gnssStatus: { avlId: "69", displayName: "GNSS status", parameterGroup: "Permanent I/O elements" },
  gnssHdop: { avlId: "182", displayName: "GNSS HDOP", parameterGroup: "Permanent I/O elements" },
  satellites: { avlId: "sat", displayName: "Satellites", parameterGroup: "GPS" },
};

interface BuildRoutePlaybackVehicleViewModelOptions {
  vehicle: Vehicle;
  playbackPosition: [number, number];
  speedKph: number;
  headingDegrees: number | null;
  timestampIso: string | null;
  activeAlertCount: number;
  hasRouteTelemetry?: boolean;
  routeIgnitionOn?: boolean | null;
  routeMovement?: boolean | null;
  routeTrip?: boolean | null;
  routeGsmSignal?: number | null;
  routeGnssStatus?: boolean | null;
  routeGnssHdop?: number | null;
  routeSatellites?: number | null;
  routeMarkerStatus?: VehicleMarkerStatusOverride | null;
}

interface PlaybackRouteTelemetryState {
  hasTelemetry?: boolean;
  ignitionOn?: boolean | null;
  movement?: boolean | null;
}

export function getPlaybackVehicleStatus(
  vehicle: Pick<Vehicle, "status">,
  speedKph: number,
  activeAlertCount: number,
  routeTelemetry?: PlaybackRouteTelemetryState,
): VehicleStatus {
  const hasRouteTelemetry =
    routeTelemetry?.hasTelemetry === true ||
    routeTelemetry?.ignitionOn != null ||
    routeTelemetry?.movement != null;
  const speedIndicatesMovement = speedKph > PLAYBACK_MOVING_SPEED_THRESHOLD_KPH;
  const movement = routeTelemetry?.movement ?? speedIndicatesMovement;
  const inferredIgnitionOn = hasRouteTelemetry
    ? undefined
    : vehicle.status === "parked"
      ? false
      : vehicle.status === "offline" || vehicle.status === "stationary"
        ? undefined
        : true;
  const operationalSpeedKph = speedIndicatesMovement ? speedKph : 0;
  return deriveVehicleOperationalStatus({
    activeAlertCount,
    explicitStatus: !hasRouteTelemetry && vehicle.status === "offline" ? "offline" : null,
    ignitionOn: routeTelemetry?.ignitionOn ?? inferredIgnitionOn,
    movement,
    speedKph: operationalSpeedKph,
  });
}

function updatePlaybackAttribute<TValue extends TeltonikaAttributeValue>(
  vehicle: Vehicle,
  attributeName: string,
  value: TValue,
  timestampIso: string,
) {
  if (!vehicle.teltonika) {
    return;
  }

  const existing = vehicle.teltonika.attributes[attributeName];
  const fallback = PLAYBACK_ATTRIBUTE_META[attributeName] ?? {
    avlId: attributeName,
    displayName: attributeName,
    parameterGroup: "Playback",
  };
  const unit = existing?.unit ?? fallback.unit;

  vehicle.teltonika.attributes[attributeName] = {
    avlId: existing?.avlId ?? fallback.avlId,
    attributeName: existing?.attributeName ?? attributeName,
    displayName: existing?.displayName ?? fallback.displayName,
    parameterGroup: existing?.parameterGroup ?? fallback.parameterGroup,
    ...(unit ? { unit } : {}),
    value,
    timestampIso,
  };
}

function syncHistoricalPlaybackAttribute<TValue extends TeltonikaAttributeValue>(
  vehicle: Vehicle,
  attributeName: string,
  value: TValue | null | undefined,
  timestampIso: string,
) {
  if (!vehicle.teltonika) {
    return;
  }

  if (value === null || value === undefined) {
    delete vehicle.teltonika.attributes[attributeName];
    return;
  }

  updatePlaybackAttribute(vehicle, attributeName, value, timestampIso);
}

export function buildRoutePlaybackVehicleViewModel({
  vehicle,
  playbackPosition,
  speedKph,
  headingDegrees,
  timestampIso,
  activeAlertCount,
  hasRouteTelemetry,
  routeIgnitionOn,
  routeMovement,
  routeTrip,
  routeGsmSignal,
  routeGnssStatus,
  routeGnssHdop,
  routeSatellites,
  routeMarkerStatus,
}: BuildRoutePlaybackVehicleViewModelOptions): Vehicle {
  const hasHistoricalRouteContext =
    hasRouteTelemetry === true ||
    routeIgnitionOn != null ||
    routeMovement != null;
  const status = getPlaybackVehicleStatus(vehicle, speedKph, activeAlertCount, {
    hasTelemetry: hasRouteTelemetry,
    ignitionOn: routeIgnitionOn,
    movement: routeMovement,
  });
  const ignitionOn =
    routeIgnitionOn ??
    (status === "moving" || status === "idling" || (status === "alerting" && vehicle.ignitionOn));
  const movement =
    routeMovement ??
    (status === "moving" || (status === "alerting" && speedKph > PLAYBACK_MOVING_SPEED_THRESHOLD_KPH));
  const playbackTimestampIso = timestampIso ?? vehicle.lastUpdatedIso;
  const nextVehicle: Vehicle = {
    ...vehicle,
    latitude: playbackPosition[0],
    longitude: playbackPosition[1],
    speedKph,
    status,
    mapMarkerStatusOverride: routeMarkerStatus ?? undefined,
    ignitionOn,
    activeAlertCount,
    heading: headingDegrees ?? vehicle.heading,
    lastUpdatedIso: playbackTimestampIso,
    teltonika: vehicle.teltonika
      ? {
          ...vehicle.teltonika,
          timestampIso: playbackTimestampIso,
          attributes: Object.fromEntries(
            Object.entries(vehicle.teltonika.attributes).map(([attributeName, attribute]) => [
              attributeName,
              { ...attribute },
            ]),
          ),
        }
      : undefined,
  };

  updatePlaybackAttribute(nextVehicle, "gpsLocation", { latitude: playbackPosition[0], longitude: playbackPosition[1] }, playbackTimestampIso);
  updatePlaybackAttribute(nextVehicle, "speed", speedKph, playbackTimestampIso);
  updatePlaybackAttribute(nextVehicle, "direction", nextVehicle.heading, playbackTimestampIso);
  updatePlaybackAttribute(nextVehicle, "ignition", ignitionOn, playbackTimestampIso);
  updatePlaybackAttribute(nextVehicle, "movement", movement, playbackTimestampIso);
  updatePlaybackAttribute(nextVehicle, "priority", activeAlertCount > 0 ? 1 : 0, playbackTimestampIso);
  if (hasHistoricalRouteContext) {
    const historicalMarkerAttributes: Record<(typeof HISTORICAL_MARKER_ATTRIBUTE_NAMES)[number], TeltonikaAttributeValue | null | undefined> = {
      trip: routeTrip,
      gsmSignal: routeGsmSignal,
      gnssStatus: routeGnssStatus,
      gnssHdop: routeGnssHdop,
      satellites: routeSatellites,
    };

    HISTORICAL_MARKER_ATTRIBUTE_NAMES.forEach((attributeName) => {
      syncHistoricalPlaybackAttribute(nextVehicle, attributeName, historicalMarkerAttributes[attributeName], playbackTimestampIso);
    });
  }

  return nextVehicle;
}
