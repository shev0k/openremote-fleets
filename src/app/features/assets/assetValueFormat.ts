import type { TeltonikaAttributeSample } from "../../../domain/models/teltonika";

const ASSET_VALUE_MAX_FRACTION_DIGITS = 2;

export function formatAssetNumber(
  value: number,
  maximumFractionDigits = ASSET_VALUE_MAX_FRACTION_DIGITS,
): string {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const rounded = Number(value.toFixed(maximumFractionDigits));
  const normalized = Object.is(rounded, -0) ? 0 : rounded;

  return Number.isInteger(normalized)
    ? normalized.toLocaleString()
    : normalized.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
}

export function formatAssetPercent(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${formatAssetNumber(value)}%` : "--%";
}

export function formatAssetAttributeValue(attribute: TeltonikaAttributeSample): string {
  const { value, unit } = attribute;

  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (typeof value === "number") {
    return `${formatAssetNumber(value)}${unit ? ` ${unit}` : ""}`;
  }

  if (typeof value === "object") {
    return `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`;
  }

  return `${value}${unit ? ` ${unit}` : ""}`;
}
