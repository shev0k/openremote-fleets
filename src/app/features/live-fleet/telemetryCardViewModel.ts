import { TelemetrySignalSample, TelemetrySignalValue } from "../../../domain/models/telemetry";
import { Vehicle, VehicleDetail } from "../../../domain/models/vehicle";

export type LiveTelemetryMetricTone = "neutral" | "good" | "warning" | "danger" | "muted";

export interface LiveTelemetryMetric {
  id: string;
  label: string;
  value: string;
  sourceAttribute?: string;
  timestampIso?: string;
  tone: LiveTelemetryMetricTone;
}

export interface LiveTelemetryCardModel {
  identity: {
    name: string;
    plate: string;
    trackerId: string;
    driverIdentifier?: string;
  };
  primaryMetrics: LiveTelemetryMetric[];
  secondaryMetrics: LiveTelemetryMetric[];
}

const SAMPLE_BY_SIGNAL_FALLBACKS: Record<string, string[]> = {
  speed: ["speed"],
  ignition: ["ignition"],
  movement: ["movement"],
  fuelLevel: ["fuelLevel"],
  batteryLevel: ["batteryLevel"],
  externalVoltage: ["externalVoltage"],
  engineRpm: ["engineRpm"],
  gnssHdop: ["gnssHdop"],
  gsmSignal: ["gsmSignal"],
  totalOdometer: ["totalOdometer"],
};

function findSample(vehicle: Vehicle, signalId: string): TelemetrySignalSample | undefined {
  const signalIds = SAMPLE_BY_SIGNAL_FALLBACKS[signalId] ?? [signalId];
  return vehicle.latestTelemetrySamples?.find((sample) => signalIds.includes(sample.signalId) || signalIds.includes(sample.sourceAttribute ?? ""));
}

function getSampleValue(vehicle: Vehicle, signalId: string): TelemetrySignalValue | undefined {
  return findSample(vehicle, signalId)?.value;
}

function getMetricTone(metricId: string, value: TelemetrySignalValue | undefined, vehicle: Vehicle): LiveTelemetryMetricTone {
  if (metricId === "fuelLevel" && typeof value === "number") {
    return value <= 20 ? "danger" : value <= 35 ? "warning" : "good";
  }

  if (metricId === "batteryLevel" && typeof value === "number") {
    return value <= 25 ? "danger" : value <= 50 ? "warning" : "good";
  }

  if (metricId === "gsmSignal" && typeof value === "number") {
    return value <= 1 ? "danger" : value <= 2 ? "warning" : "good";
  }

  if (metricId === "gnssHdop" && typeof value === "number") {
    return value >= 2 ? "warning" : "good";
  }

  if (metricId === "ignition" || metricId === "movement") {
    return value ? "good" : "muted";
  }

  if (vehicle.activeAlertCount > 0 && metricId === "speed") {
    return "warning";
  }

  return "neutral";
}

export function formatLiveTelemetryValue(value: TelemetrySignalValue | undefined, unit?: string): string {
  if (value === undefined || value === null) {
    return "--";
  }

  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2).replace(/\.?0+$/, "");
    return unit ? `${formatted} ${unit}` : formatted;
  }

  if (typeof value === "string") {
    return value || "--";
  }

  return value.eventType || "--";
}

function createMetric(
  vehicle: Vehicle,
  id: string,
  label: string,
  value: TelemetrySignalValue | undefined,
  unit?: string,
  formatter: (value: TelemetrySignalValue | undefined) => string = (nextValue) => formatLiveTelemetryValue(nextValue, unit),
): LiveTelemetryMetric {
  const sample = findSample(vehicle, id);

  return {
    id,
    label,
    value: formatter(value),
    sourceAttribute: sample?.sourceAttribute,
    timestampIso: sample?.timestampIso,
    tone: getMetricTone(id, value, vehicle),
  };
}

export function buildLiveTelemetryCardModel(vehicle: Vehicle, detail: VehicleDetail | null): LiveTelemetryCardModel {
  const speedValue = getSampleValue(vehicle, "speed") ?? vehicle.speedKph;
  const ignitionValue = getSampleValue(vehicle, "ignition") ?? vehicle.ignitionOn;
  const movementValue = getSampleValue(vehicle, "movement") ?? vehicle.speedKph > 0;
  const fuelValue = getSampleValue(vehicle, "fuelLevel") ?? vehicle.fuelLevelPercent;
  const batteryValue = getSampleValue(vehicle, "batteryLevel") ?? vehicle.batteryLevelPercent;
  const rpmValue = getSampleValue(vehicle, "engineRpm");
  const voltageValue = getSampleValue(vehicle, "externalVoltage");
  const gsmValue = getSampleValue(vehicle, "gsmSignal");
  const gnssValue = getSampleValue(vehicle, "gnssHdop");
  const odometerMeters = getSampleValue(vehicle, "totalOdometer");

  return {
    identity: {
      name: vehicle.name,
      plate: vehicle.plate,
      trackerId: vehicle.trackerId,
      driverIdentifier: vehicle.driverIdentifier,
    },
    primaryMetrics: [
      createMetric(vehicle, "speed", "Speed", speedValue, "km/h"),
      createMetric(vehicle, "ignition", "Ignition", ignitionValue),
      createMetric(vehicle, "movement", "Movement", movementValue, undefined, (value) => (value ? "Moving" : "Stopped")),
    ],
    secondaryMetrics: [
      createMetric(vehicle, "fuelLevel", "Fuel", fuelValue, "%", (value) => (typeof value === "number" ? `${Math.round(value)}%` : "--")),
      createMetric(vehicle, "batteryLevel", "Battery", batteryValue, "%", (value) => (typeof value === "number" ? `${Math.round(value)}%` : "--")),
      createMetric(vehicle, "engineRpm", "RPM", rpmValue, "rpm"),
      createMetric(vehicle, "externalVoltage", "Voltage", voltageValue, "V"),
      createMetric(vehicle, "gsmSignal", "GSM", gsmValue, undefined, (value) => (typeof value === "number" ? `${value}/5` : "--")),
      createMetric(vehicle, "gnssHdop", "GNSS", gnssValue, undefined, (value) => (typeof value === "number" ? `${formatLiveTelemetryValue(value)} HDOP` : "--")),
      createMetric(vehicle, "todayMileage", "Today", detail?.todayMileageKm, "km", (value) => (typeof value === "number" ? `${value.toFixed(1)} km` : "--")),
      createMetric(
        vehicle,
        "odometer",
        "Odometer",
        detail?.odometerKm ?? (typeof odometerMeters === "number" ? odometerMeters / 1000 : undefined),
        "km",
        (value) => (typeof value === "number" ? `${Math.round(value).toLocaleString()} km` : "--"),
      ),
    ],
  };
}
