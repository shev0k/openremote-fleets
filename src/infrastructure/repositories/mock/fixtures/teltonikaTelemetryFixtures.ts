import { Vehicle, VehicleClass, VehicleStatus } from "../../../../domain/models/vehicle";
import { TeltonikaAttributeSample, TeltonikaTrackerSnapshot, TeltonikaAttributeValue } from "../../../../domain/models/teltonika";
import { TelemetrySignalSample } from "../../../../domain/models/telemetry";
import { deriveVehicleOperationalStatus } from "../../../../domain/models/vehicleOperationalStatus";
import {
  TELTONIKA_ATTRIBUTE_DEFINITIONS,
  TELTONIKA_CODEC,
  TELTONIKA_FMC003_DEVICE_TYPE,
  TELTONIKA_PROTOCOL,
  TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
  type TeltonikaValueMap,
} from "../../../../domain/models/teltonikaCatalog";

export {
  TELTONIKA_ATTRIBUTE_DEFINITIONS,
  TELTONIKA_FMC003_DEVICE_TYPE,
  TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
};
export type { TeltonikaValueMap };

interface CreateTeltonikaSnapshotInput {
  imei: string;
  timestampIso: string;
  values: TeltonikaValueMap;
}

interface CreateMockTeltonikaVehicleInput {
  id: string;
  name: string;
  plate: string;
  status: VehicleStatus;
  driverName: string;
  assetName: string;
  assetClass: VehicleClass;
  activeAlertCount: number;
  imei: string;
  timestampIso: string;
  values: TeltonikaValueMap;
}

function createAttribute<TValue extends TeltonikaAttributeValue>(
  attributeName: keyof TeltonikaValueMap,
  value: TValue,
  timestampIso: string,
): TeltonikaAttributeSample<TValue> {
  const definition = TELTONIKA_ATTRIBUTE_DEFINITIONS[attributeName];

  return {
    avlId: definition.avlId,
    attributeName,
    displayName: definition.displayName,
    value,
    unit: definition.unit,
    parameterGroup: definition.parameterGroup,
    timestampIso,
  };
}

export function createTeltonikaSnapshot({
  imei,
  timestampIso,
  values,
}: CreateTeltonikaSnapshotInput): TeltonikaTrackerSnapshot {
  const attributes = Object.entries(values).reduce<Record<string, TeltonikaAttributeSample>>(
    (accumulator, [attributeName, value]) => {
      accumulator[attributeName] = createAttribute(attributeName as keyof TeltonikaValueMap, value as TeltonikaAttributeValue, timestampIso);
      return accumulator;
    },
    {},
  );

  return {
    imei,
    model: "FMC003",
    protocol: TELTONIKA_PROTOCOL,
    codec: TELTONIKA_CODEC,
    timestampIso,
    attributes,
  };
}

export function createMockTeltonikaVehicle(input: CreateMockTeltonikaVehicleInput): Vehicle {
  const teltonika = createTeltonikaSnapshot({
    imei: input.imei,
    timestampIso: input.timestampIso,
    values: input.values,
  });
  const status = deriveVehicleOperationalStatus({
    activeAlertCount: input.activeAlertCount,
    explicitStatus: input.status === "offline" ? "offline" : null,
    hasLocation: true,
    ignitionOn: input.values.ignition,
    movement: input.values.movement,
    speedKph: input.values.speed,
  });

  return {
    id: input.id,
    name: input.name,
    plate: input.plate,
    status,
    speedKph: input.values.speed,
    ignitionOn: input.values.ignition,
    latitude: input.values.gpsLocation.latitude,
    longitude: input.values.gpsLocation.longitude,
    hasLocation: true,
    heading: input.values.direction,
    lastUpdatedIso: input.timestampIso,
    driverName: input.driverName,
    driverIdentifier: input.values.iButton,
    trackerId: input.imei,
    assetName: input.assetName,
    assetClass: input.assetClass,
    deviceType: TELTONIKA_FMC003_DEVICE_TYPE,
    activeAlertCount: input.activeAlertCount,
    fuelLevelPercent: input.values.fuelLevel,
    batteryLevelPercent: input.values.batteryLevel,
    availableTelemetrySignals: TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
    latestTelemetrySamples: createTelemetrySamplesFromValues(input.values, input.timestampIso, input.activeAlertCount),
    teltonika,
  };
}

export function createTelemetrySamplesFromValues(
  values: TeltonikaValueMap,
  timestampIso: string,
  activeAlertCount = 0,
): TelemetrySignalSample[] {
  const samples: TelemetrySignalSample[] = [
    { signalId: "speed", timestampIso, value: values.speed, sourceAttribute: "speed" },
    { signalId: "ignition", timestampIso, value: values.ignition, sourceAttribute: "ignition" },
    { signalId: "movement", timestampIso, value: values.movement, sourceAttribute: "movement" },
    { signalId: "trip", timestampIso, value: values.trip, sourceAttribute: "trip" },
    { signalId: "fuelLevel", timestampIso, value: values.fuelLevel, sourceAttribute: "fuelLevel" },
    { signalId: "fuelUsedGps", timestampIso, value: values.fuelUsedGps, sourceAttribute: "fuelUsedGps" },
    { signalId: "fuelRateGps", timestampIso, value: values.fuelRateGps, sourceAttribute: "fuelRateGps" },
    { signalId: "batteryLevel", timestampIso, value: values.batteryLevel, sourceAttribute: "batteryLevel" },
    { signalId: "batteryVoltage", timestampIso, value: values.batteryVoltage, sourceAttribute: "batteryVoltage" },
    { signalId: "batteryCurrent", timestampIso, value: values.batteryCurrent, sourceAttribute: "batteryCurrent" },
    { signalId: "externalVoltage", timestampIso, value: values.externalVoltage, sourceAttribute: "externalVoltage" },
    { signalId: "engineRpm", timestampIso, value: values.engineRpm, sourceAttribute: "engineRpm" },
    { signalId: "gnssStatus", timestampIso, value: values.gnssStatus, sourceAttribute: "gnssStatus" },
    { signalId: "gnssHdop", timestampIso, value: values.gnssHdop, sourceAttribute: "gnssHdop" },
    { signalId: "gsmSignal", timestampIso, value: values.gsmSignal, sourceAttribute: "gsmSignal" },
    { signalId: "totalOdometer", timestampIso, value: values.totalOdometer, sourceAttribute: "totalOdometer" },
    { signalId: "tripOdometer", timestampIso, value: values.tripOdometer, sourceAttribute: "tripOdometer" },
    { signalId: "direction", timestampIso, value: values.direction, sourceAttribute: "direction" },
    { signalId: "satellites", timestampIso, value: values.satellites, sourceAttribute: "satellites" },
    { signalId: "iButton", timestampIso, value: values.iButton, sourceAttribute: "iButton" },
  ];

  samples.push({
    signalId: "alarm",
    timestampIso,
    value: {
      eventType: activeAlertCount > 0 ? "active-alert" : "normal",
      severity: activeAlertCount > 1 ? "critical" : activeAlertCount === 1 ? "warning" : "info",
      metadata: { activeAlertCount },
    },
    sourceAttribute: "alarm",
  });

  return samples;
}

export function getTeltonikaNumber(snapshot: TeltonikaTrackerSnapshot, attributeName: keyof TeltonikaValueMap): number {
  const value = snapshot.attributes[attributeName]?.value;
  return typeof value === "number" ? value : 0;
}

export function getTeltonikaBoolean(snapshot: TeltonikaTrackerSnapshot, attributeName: keyof TeltonikaValueMap): boolean {
  return snapshot.attributes[attributeName]?.value === true;
}
