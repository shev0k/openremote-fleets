import type { Asset } from "@openremote/model";
import type { AssetConnectivityStatus, AssetDevice } from "../../../domain/models/assets";
import type { TelemetrySignalDefinition, TelemetrySignalSample } from "../../../domain/models/telemetry";
import type { TeltonikaAttributeSample, TeltonikaAttributeValue, TeltonikaTrackerSnapshot } from "../../../domain/models/teltonika";
import {
  TELTONIKA_ATTRIBUTE_DEFINITIONS,
  TELTONIKA_CODEC,
  TELTONIKA_DEVICE_PREFIX,
  TELTONIKA_FMC003_DEVICE_TYPE,
  TELTONIKA_PROTOCOL,
  TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
} from "../../../domain/models/teltonikaCatalog";
import type { Vehicle, VehicleClass, VehicleDetail, VehicleStatus, VehicleTelemetryQuality } from "../../../domain/models/vehicle";
import { deriveVehicleOperationalStatus } from "../../../domain/models/vehicleOperationalStatus";
import {
  getLatestOpenRemoteAttributeTimestamp,
  getOpenRemoteAssetTimestampIso,
  getOpenRemoteAttributeTimestamp,
  getOpenRemoteAttributeValue,
  getOpenRemoteBoolean,
  getOpenRemoteLocation,
  getOpenRemoteLocationFromValue,
  getOpenRemoteNumber,
  getOpenRemoteString,
  toOpenRemoteIso,
  toOpenRemoteTelemetryValue,
} from "./openRemoteAssetAttributes";

function normalizeVehicleClass(value: string | undefined): VehicleClass {
  if (value === "truck" || value === "van" || value === "car") return value;
  return "unknown";
}

export function getOpenRemoteActiveAlertCount(asset: Asset): number {
  return Math.max(0, Math.round(getOpenRemoteNumber(asset, "activeAlertCount") ?? 0));
}

function getDeviceType(asset: Asset): string {
  const model = getOpenRemoteString(asset, "model");
  if (model) return `${TELTONIKA_DEVICE_PREFIX} ${model}`;
  return asset.type?.includes(TELTONIKA_DEVICE_PREFIX) ? TELTONIKA_FMC003_DEVICE_TYPE : asset.type ?? TELTONIKA_FMC003_DEVICE_TYPE;
}

function getConnectionExplicitStatus(asset: Asset): VehicleStatus | null {
  const connectionStatus = getOpenRemoteString(asset, "connectionStatus")?.toLowerCase();
  if (!connectionStatus) return null;

  const offlineSignals = [
    "disconnected",
    "offline",
    "unplugged",
    "power loss",
    "power_lost",
    "communication loss",
    "not communicating",
    "unavailable",
    "timeout",
  ];

  return offlineSignals.some((signal) => connectionStatus.includes(signal)) ? "offline" : null;
}

function getVehicleStatus({
  asset,
  telemetryQuality,
  speedKph,
  ignitionOn,
}: {
  asset: Asset;
  telemetryQuality: VehicleTelemetryQuality;
  speedKph: number | null;
  ignitionOn: boolean | null;
}): VehicleStatus {
  return deriveVehicleOperationalStatus({
    activeAlertCount: getOpenRemoteActiveAlertCount(asset),
    explicitStatus: getConnectionExplicitStatus(asset),
    hasLocation: telemetryQuality.hasLocation,
    ignitionOn,
    movement: getOpenRemoteBoolean(asset, "movement"),
    speedKph,
  });
}

function isTeltonikaAttributeValue(value: unknown): value is TeltonikaAttributeValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  return Boolean(getOpenRemoteLocationFromValue(value));
}

function createTeltonikaAttributeSample(asset: Asset, attributeName: string): TeltonikaAttributeSample | null {
  const value = getOpenRemoteAttributeValue(asset, attributeName);
  if (!isTeltonikaAttributeValue(value)) return null;
  const definition = TELTONIKA_ATTRIBUTE_DEFINITIONS[attributeName] ?? {
    avlId: attributeName,
    displayName: attributeName,
    parameterGroup: "OpenRemote",
  };
  const normalizedValue = getOpenRemoteLocationFromValue(value) ?? value;
  return {
    avlId: definition.avlId,
    attributeName,
    displayName: definition.displayName,
    value: normalizedValue,
    unit: definition.unit,
    parameterGroup: definition.parameterGroup,
    timestampIso: toOpenRemoteIso(getOpenRemoteAttributeTimestamp(asset, attributeName) ?? getLatestOpenRemoteAttributeTimestamp(asset)),
  };
}

function createTeltonikaSnapshot(asset: Asset): TeltonikaTrackerSnapshot | undefined {
  const attributeEntries = Object.keys(asset.attributes ?? {})
    .map((attributeName) => [attributeName, createTeltonikaAttributeSample(asset, attributeName)] as const)
    .filter((entry): entry is readonly [string, TeltonikaAttributeSample] => entry[1] !== null);

  if (!attributeEntries.length) return undefined;

  return {
    imei: getOpenRemoteString(asset, "imei") ?? asset.id ?? "",
    model: getOpenRemoteString(asset, "model") ?? "FMC003",
    protocol: getOpenRemoteString(asset, "protocol") ?? TELTONIKA_PROTOCOL,
    codec: getOpenRemoteString(asset, "codec") ?? TELTONIKA_CODEC,
    timestampIso: getOpenRemoteAssetTimestampIso(asset),
    attributes: Object.fromEntries(attributeEntries),
  };
}

function createLatestTelemetrySamples(asset: Asset): TelemetrySignalSample[] {
  const samples = TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS.flatMap<TelemetrySignalSample>((definition) => {
    if (definition.id === "alarm") return [];
    const value = toOpenRemoteTelemetryValue(getOpenRemoteAttributeValue(asset, definition.attributeName));
    if (value === null) return [];
    return [{
      signalId: definition.id,
      timestampIso: toOpenRemoteIso(getOpenRemoteAttributeTimestamp(asset, definition.attributeName) ?? getLatestOpenRemoteAttributeTimestamp(asset)),
      value,
      sourceAttribute: definition.attributeName,
    }];
  });

  samples.push({
    signalId: "alarm",
    timestampIso: getOpenRemoteAssetTimestampIso(asset),
    value: {
      eventType: getOpenRemoteActiveAlertCount(asset) > 0 ? "active-alert" : "normal",
      severity: getOpenRemoteActiveAlertCount(asset) > 1 ? "critical" : getOpenRemoteActiveAlertCount(asset) === 1 ? "warning" : "info",
      state: getOpenRemoteActiveAlertCount(asset) > 0 ? "active" : "clear",
      metadata: { activeAlertCount: getOpenRemoteActiveAlertCount(asset) },
    },
    sourceAttribute: "alarm",
  });

  return samples;
}

export function createOpenRemoteTelemetrySignalDefinitions(): TelemetrySignalDefinition[] {
  return TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS.map((definition) => ({ ...definition }));
}

export function mapOpenRemoteAssetToVehicle(asset: Asset): Vehicle {
  const location = getOpenRemoteLocation(asset);
  const hasLocation = location !== null;
  const speed = getOpenRemoteNumber(asset, "speed");
  const ignition = getOpenRemoteBoolean(asset, "ignition");
  const heading = getOpenRemoteNumber(asset, "direction");
  const speedKph = Math.round(speed ?? 0);
  const ignitionOn = ignition ?? false;
  const telemetryQuality: VehicleTelemetryQuality = {
    hasSpeed: speed !== null && speed !== undefined,
    hasIgnition: ignition !== null && ignition !== undefined,
    hasHeading: heading !== null && heading !== undefined,
    hasLocation,
  };
  const activeAlertCount = getOpenRemoteActiveAlertCount(asset);
  return {
    id: asset.id ?? getOpenRemoteString(asset, "imei") ?? asset.name ?? "unknown-asset",
    name: asset.name ?? getOpenRemoteString(asset, "assetName") ?? "Unnamed tracker",
    plate: getOpenRemoteString(asset, "plate") ?? "--",
    status: getVehicleStatus({
      asset,
      telemetryQuality,
      speedKph: speed ?? null,
      ignitionOn: ignition ?? null,
    }),
    speedKph,
    ignitionOn,
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    hasLocation,
    telemetryQuality,
    heading: Math.round(heading ?? 0),
    lastUpdatedIso: getOpenRemoteAssetTimestampIso(asset),
    driverName: getOpenRemoteString(asset, "driverName") ?? "Unassigned",
    driverIdentifier: getOpenRemoteString(asset, "iButton"),
    trackerId: getOpenRemoteString(asset, "imei") ?? asset.id ?? "--",
    assetName: getOpenRemoteString(asset, "assetName") ?? asset.name ?? "Unnamed tracker",
    assetClass: normalizeVehicleClass(getOpenRemoteString(asset, "assetClass")),
    deviceType: getDeviceType(asset),
    activeAlertCount,
    fuelLevelPercent: getOpenRemoteNumber(asset, "fuelLevel"),
    batteryLevelPercent: getOpenRemoteNumber(asset, "batteryLevel"),
    availableTelemetrySignals: createOpenRemoteTelemetrySignalDefinitions(),
    latestTelemetrySamples: createLatestTelemetrySamples(asset),
    teltonika: createTeltonikaSnapshot(asset),
  };
}

export function mapOpenRemoteAssetToVehicleDetail(asset: Asset): VehicleDetail {
  const vehicle = mapOpenRemoteAssetToVehicle(asset);
  return {
    ...vehicle,
    lastCommunicationIso: vehicle.lastUpdatedIso,
    gpsAccuracyMeters: Math.max(4, Math.round((getOpenRemoteNumber(asset, "gnssHdop") ?? 1) * 10)),
    todayMileageKm: Math.round((getOpenRemoteNumber(asset, "tripOdometer") ?? 0) / 1000),
    odometerKm: Math.round((getOpenRemoteNumber(asset, "totalOdometer") ?? 0) / 1000),
    fuelInTankLiters: getOpenRemoteNumber(asset, "fuelLevel") ?? 0,
    averageFuelConsumptionLitersPer100Km: getOpenRemoteNumber(asset, "fuelRateGps") ?? 0,
    stoppedDurationMinutes: Math.round(getOpenRemoteNumber(asset, "stoppedDurationMinutes") ?? 0),
  };
}

function normalizeConnectivityStatus(value: string | undefined): AssetConnectivityStatus {
  const normalized = value?.toLowerCase();
  if (normalized?.includes("degraded")) return "Degraded";
  if (
    normalized?.includes("disconnect") ||
    normalized?.includes("offline") ||
    normalized?.includes("unplug") ||
    normalized?.includes("power loss") ||
    normalized?.includes("communication loss") ||
    normalized?.includes("not communicating") ||
    normalized?.includes("unavailable") ||
    normalized?.includes("timeout")
  ) {
    return "Disconnected";
  }
  return "Connected";
}

export function mapOpenRemoteAssetToAssetDevice(asset: Asset): AssetDevice {
  const vehicle = mapOpenRemoteAssetToVehicle(asset);
  const metadataKeys = ["imei", "protocol", "codec", "model", "externalVoltage", "fuelLevel", "engineRpm", "gnssHdop", "totalOdometer"];
  const metadata = Object.fromEntries(
    metadataKeys
      .map((key) => [key, getOpenRemoteAttributeValue(asset, key)] as const)
      .filter((entry) => entry[1] !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );

  return {
    id: asset.id ?? vehicle.id,
    assetName: vehicle.assetName,
    linkedVehicleId: vehicle.id,
    linkedVehicleName: vehicle.name,
    linkedVehiclePlate: vehicle.plate,
    trackerId: vehicle.trackerId,
    deviceType: vehicle.deviceType,
    lastSyncIso: vehicle.lastUpdatedIso,
    signalStrengthPercent: Math.min(100, Math.max(0, Math.round((getOpenRemoteNumber(asset, "gsmSignal") ?? 0) * 20))),
    batteryPercent: vehicle.batteryLevelPercent,
    status: normalizeConnectivityStatus(getOpenRemoteString(asset, "connectionStatus")),
    openRemoteId: asset.id,
    firmwareVersion: getOpenRemoteString(asset, "firmwareVersion"),
    metadata,
    availableTelemetrySignals: vehicle.availableTelemetrySignals,
    latestTelemetrySamples: vehicle.latestTelemetrySamples,
    teltonika: vehicle.teltonika,
  };
}
