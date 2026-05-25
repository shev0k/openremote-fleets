export type TelemetrySignalValueType = "boolean" | "numeric" | "enum" | "event";

export type TelemetrySignalSource = "teltonika" | "openRemote" | "derived" | "custom";

export type TelemetrySampleQuality = "good" | "stale" | "missing" | "estimated";

export interface TelemetryEventValue {
  eventType: string;
  severity?: "info" | "warning" | "critical";
  state?: string;
  metadata?: Record<string, string | number | boolean>;
}

export type TelemetrySignalValue = boolean | number | string | TelemetryEventValue;

export interface TelemetrySignalDefinition {
  id: string;
  attributeName: string;
  displayName: string;
  valueType: TelemetrySignalValueType;
  source: TelemetrySignalSource;
  unit?: string;
  teltonikaAvlId?: string;
  parameterGroup?: string;
  enumValues?: string[];
  isOptional?: boolean;
  description?: string;
}

export interface TelemetrySignalSample<TValue extends TelemetrySignalValue = TelemetrySignalValue> {
  signalId: string;
  timestampIso: string;
  value: TValue;
  quality?: TelemetrySampleQuality;
  sourceAttribute?: string;
}

export interface TelemetryTimeline {
  vehicleId: string;
  rangeStartIso: string;
  rangeEndIso: string;
  signals: TelemetrySignalDefinition[];
  samples: TelemetrySignalSample[];
}

export function isTelemetrySignalValueCompatible(
  definition: TelemetrySignalDefinition,
  value: TelemetrySignalValue,
): boolean {
  if (definition.valueType === "boolean") {
    return typeof value === "boolean";
  }

  if (definition.valueType === "numeric") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (definition.valueType === "enum") {
    return typeof value === "string" && (!definition.enumValues?.length || definition.enumValues.includes(value));
  }

  return typeof value === "object" && value !== null && "eventType" in value;
}

