import type { Asset } from "@openremote/model";
import type { TelemetrySignalValue } from "../../../domain/models/telemetry";

const DEFAULT_TIMESTAMP_ISO = new Date(0).toISOString();

export function getOpenRemoteAttribute(asset: Asset, attributeName: string) {
  return asset.attributes?.[attributeName];
}

export function getOpenRemoteAttributeValue(asset: Asset, attributeName: string): unknown {
  return getOpenRemoteAttribute(asset, attributeName)?.value;
}

export function getOpenRemoteAttributeTimestamp(asset: Asset, attributeName: string): number | undefined {
  return getOpenRemoteAttribute(asset, attributeName)?.timestamp;
}

export function getOpenRemoteString(asset: Asset, attributeName: string): string | undefined {
  const value = getOpenRemoteAttributeValue(asset, attributeName);
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function getOpenRemoteNumber(asset: Asset, attributeName: string): number | undefined {
  const value = getOpenRemoteAttributeValue(asset, attributeName);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function getOpenRemoteBoolean(asset: Asset, attributeName: string): boolean | undefined {
  const value = getOpenRemoteAttributeValue(asset, attributeName);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "on", "yes", "1", "connected"].includes(normalized)) return true;
    if (["false", "off", "no", "0", "disconnected"].includes(normalized)) return false;
  }
  return undefined;
}

export function getOpenRemoteLocationFromValue(value: unknown): { latitude: number; longitude: number } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const latitude = typeof record.latitude === "number" ? record.latitude : typeof record.lat === "number" ? record.lat : undefined;
  const longitude =
    typeof record.longitude === "number" ? record.longitude : typeof record.lon === "number" ? record.lon : typeof record.lng === "number" ? record.lng : undefined;
  if (typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  const coordinates = record.coordinates;
  if (Array.isArray(coordinates) && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    return { latitude: coordinates[1], longitude: coordinates[0] };
  }

  return null;
}

export function getOpenRemoteLocation(asset: Asset): { latitude: number; longitude: number } | null {
  return (
    getOpenRemoteLocationFromValue(getOpenRemoteAttributeValue(asset, "gpsLocation"))
    ?? getOpenRemoteLocationFromValue(getOpenRemoteAttributeValue(asset, "location"))
  );
}

export function toOpenRemoteIso(timestamp?: number): string {
  return typeof timestamp === "number" && Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : DEFAULT_TIMESTAMP_ISO;
}

export function getLatestOpenRemoteAttributeTimestamp(asset: Asset): number | undefined {
  const timestamps = Object.values(asset.attributes ?? {})
    .map((attribute) => attribute.timestamp)
    .filter((timestamp): timestamp is number => typeof timestamp === "number" && Number.isFinite(timestamp));
  return timestamps.length ? Math.max(...timestamps) : undefined;
}

export function getOpenRemoteAssetTimestampIso(asset: Asset): string {
  return toOpenRemoteIso(getLatestOpenRemoteAttributeTimestamp(asset) ?? asset.createdOn);
}

export function toOpenRemoteTelemetryValue(value: unknown): TelemetrySignalValue | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value && typeof value === "object" && "eventType" in value) return value as TelemetrySignalValue;
  return null;
}
