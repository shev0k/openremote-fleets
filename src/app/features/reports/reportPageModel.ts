import type {
  GeneratedReportPreview,
  ReportCategory,
  ReportDefinition,
  ReportExportFormat,
  ReportOutputMode,
  ReportPeriodPreset,
  ReportTimeWindowPreset,
} from "../../../domain/models/reports";
import type { AppDataMode } from "../../../domain/services/appServices";
import {
  type ReportBuilderDraft,
  buildReportGenerationRequest,
} from "./reportBuilderViewModel";

export const periodOptions: Array<{ id: ReportPeriodPreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7Days", label: "Last 7 Days" },
  { id: "last30Days", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "previousMonth", label: "Previous Month" },
  { id: "custom", label: "Custom Range" },
];

export const timeWindowOptions: Array<{ id: ReportTimeWindowPreset; label: string }> = [
  { id: "fullDay", label: "Full Day" },
  { id: "businessHours", label: "Business Hours" },
  { id: "custom", label: "Custom" },
];

export const customTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  return { id: value, label: value };
});

export const exportFormatLabels: Record<ReportExportFormat, string> = {
  pdf: "PDF",
  xlsx: "XLSX",
  csv: "CSV",
  json: "JSON",
};

export const pageOrientationOptions: Array<{ id: ReportBuilderDraft["pageOrientation"]; label: string }> = [
  { id: "portrait", label: "Portrait" },
  { id: "landscape", label: "Landscape" },
];

export const dateTimeFormatOptions: Array<{ id: ReportBuilderDraft["dateTimeFormat"]; label: string }> = [
  { id: "local", label: "Local time" },
  { id: "utc", label: "UTC" },
  { id: "iso", label: "ISO" },
];

export const scheduleFrequencyOptions: Array<{ id: ReportBuilderDraft["scheduleFrequency"]; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const categoryLabels: Record<ReportCategory, string> = {
  operations: "Operations",
  alarms: "Safety and Events",
  safety: "Safety and Events",
  fuel: "Fuel and Energy",
  trips: "Operations",
  assets: "Tracker and Diagnostics",
  diagnostics: "Tracker and Diagnostics",
  driver: "Drivers and Identification",
  places: "Places and Geofencing",
  maintenance: "Maintenance and Cost",
};

export function labelFor<T extends string>(options: ReadonlyArray<{ id: T; label: string }>, value: T): string {
  return options.find((option) => option.id === value)?.label ?? value;
}

export function formatReportOptionLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function createReportOptions<T extends string>(values: readonly T[]): Array<{ id: T; label: string }> {
  return values.map((value) => ({ id: value, label: formatReportOptionLabel(value) }));
}

export function toggleValue<T extends string>(values: T[], value: T, allowEmpty = true): T[] {
  if (values.includes(value)) {
    return values.length === 1 && !allowEmpty ? values : values.filter((entry) => entry !== value);
  }

  return [...values, value];
}

export function formatReportCategory(category: ReportCategory): string {
  return categoryLabels[category] ?? category;
}

export function supportedExportFormats(definition: ReportDefinition | undefined): ReportExportFormat[] {
  return definition?.supportedExportFormats?.length ? definition.supportedExportFormats : ["csv", "json"];
}

export function getVehicleSelection(draft: ReportBuilderDraft) {
  if (draft.vehicleSelectionMode === "selected") return { mode: "selected" as const, vehicleIds: draft.selectedVehicleIds };
  if (draft.vehicleSelectionMode === "groups") return { mode: "groups" as const, groupIds: draft.selectedGroupIds };
  if (draft.vehicleSelectionMode === "status") return { mode: "status" as const, statusIds: draft.selectedStatusIds };
  return { mode: "all" as const };
}

export function createDraftRequestKey(draft: ReportBuilderDraft): string {
  return JSON.stringify(buildReportGenerationRequest(draft));
}

export function createPreviewKey(preview: GeneratedReportPreview): string {
  return `${preview.generatedAtIso}:${JSON.stringify(preview.request)}`;
}

export function getAvailableReportOutputModes(
  definition: ReportDefinition,
  _dataMode: AppDataMode,
): ReportOutputMode[] {
  const supportedModes: ReportOutputMode[] = definition.supportedOutputModes.length
    ? definition.supportedOutputModes
    : ["preview"];

  return supportedModes.length ? supportedModes : ["preview"];
}

export function getReportDeliveryActionMessage(outputMode: ReportOutputMode): string {
  if (outputMode === "email") {
    return "Email payload prepared. No message was sent.";
  }

  if (outputMode === "schedule") {
    return "Recurring schedule prepared. No recurring schedule was saved.";
  }

  return "Preview generated.";
}
