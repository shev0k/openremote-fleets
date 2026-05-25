import { ReportPreviewRow } from "../../../domain/models/reports";
import { TelemetryEventValue, TelemetrySignalValue } from "../../../domain/models/telemetry";

export function numericReportValue(value: TelemetrySignalValue | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function reportRowNumber(row: ReportPreviewRow, signalId: string): number | null {
  return numericReportValue(row.values[signalId]);
}

export function averageReportValues(values: Array<number | null>): number | null {
  const numbers = values.filter((value): value is number => value !== null);
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function reportEventValue(value: TelemetrySignalValue | null | undefined): TelemetryEventValue | null {
  return typeof value === "object" && value !== null && "eventType" in value ? value as TelemetryEventValue : null;
}

export function formatReportNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}
