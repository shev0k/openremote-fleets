import {
  GeneratedReportPreview,
  ReportAggregationOption,
  ReportDefinition,
  ReportExportFormat,
  ReportGenerationRequest,
  ReportGroupingOption,
  ReportOutputMode,
  ReportParameterDefinition,
  ReportPeriodPreset,
  ReportTimeWindowPreset,
  ReportVehicleSelection,
} from "../../../domain/models/reports";
import { TelemetryEventValue, TelemetrySignalValue } from "../../../domain/models/telemetry";

export interface ReportBuilderDraft {
  definitionId: string;
  periodPreset: ReportPeriodPreset;
  customStartDateIso: string;
  customEndDateIso: string;
  timeWindowPreset: ReportTimeWindowPreset;
  customStartTime: string;
  customEndTime: string;
  vehicleSelectionMode: ReportVehicleSelection["mode"];
  selectedVehicleIds: string[];
  selectedGroupIds: string[];
  selectedStatusIds: string[];
  selectedParameterIds: string[];
  selectedColumnIds: string[];
  selectedChartIds: string[];
  grouping: ReportGroupingOption;
  aggregation: ReportAggregationOption;
  includeSummary: boolean;
  includeCharts: boolean;
  includeMap: boolean;
  includeRawData: boolean;
  outputMode: ReportOutputMode;
  exportFormats: ReportExportFormat[];
  pageOrientation: "portrait" | "landscape";
  unitSystem: "metric" | "imperial";
  dateTimeFormat: "local" | "utc" | "iso";
  fileName: string;
  scheduleFrequency: "daily" | "weekly" | "monthly";
  scheduleStartDateIso: string;
  scheduleTime: string;
  recipientEmails: string;
  emailSubject: string;
  emailMessage: string;
}

function getDefinitionDefaultParameters(definition: ReportDefinition | undefined): string[] {
  return definition?.defaultParameterIds?.length
    ? definition.defaultParameterIds
    : definition?.parameterIds ?? [];
}

function getDefinitionDefaultColumns(definition: ReportDefinition | undefined): string[] {
  return definition?.defaultColumnIds?.length
    ? definition.defaultColumnIds
    : ["vehicle", "time", ...getDefinitionDefaultParameters(definition)];
}

function getDefinitionDefaultCharts(definition: ReportDefinition | undefined): string[] {
  return definition?.defaultChartIds?.length ? definition.defaultChartIds : definition?.availableCharts?.slice(0, 1) ?? ["table"];
}

function slugifyFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "fleet-report";
}

export function createInitialReportBuilderDraft(definitions: ReportDefinition[]): ReportBuilderDraft {
  const definition = definitions[0];

  return {
    definitionId: definition?.id ?? "",
    periodPreset: definition?.period.preset ?? "today",
    customStartDateIso: definition?.period.startDateIso ?? "",
    customEndDateIso: definition?.period.endDateIso ?? "",
    timeWindowPreset: definition?.timeWindow?.preset ?? "fullDay",
    customStartTime: definition?.timeWindow?.startTime ?? "08:00",
    customEndTime: definition?.timeWindow?.endTime ?? "18:00",
    vehicleSelectionMode: definition?.vehicleSelection.mode ?? "all",
    selectedVehicleIds: definition?.vehicleSelection.vehicleIds ?? [],
    selectedGroupIds: definition?.vehicleSelection.groupIds ?? [],
    selectedStatusIds: definition?.vehicleSelection.statusIds ?? [],
    selectedParameterIds: getDefinitionDefaultParameters(definition),
    selectedColumnIds: getDefinitionDefaultColumns(definition),
    selectedChartIds: getDefinitionDefaultCharts(definition),
    grouping: definition?.defaultGrouping ?? definition?.groupingOptions?.[0] ?? "vehicle",
    aggregation: definition?.defaultAggregation ?? definition?.aggregationOptions?.[0] ?? "average",
    includeSummary: true,
    includeCharts: true,
    includeMap: false,
    includeRawData: false,
    outputMode: definition?.defaultOutputMode ?? "preview",
    exportFormats: definition?.supportedExportFormats?.slice(0, 2) ?? ["csv", "json"],
    pageOrientation: "portrait",
    unitSystem: "metric",
    dateTimeFormat: "local",
    fileName: slugifyFileName(definition?.name ?? "fleet-report"),
    scheduleFrequency: definition?.schedule?.frequency ?? "weekly",
    scheduleStartDateIso: "",
    scheduleTime: "08:00",
    recipientEmails: definition?.schedule?.recipientEmails?.join(", ") ?? "",
    emailSubject: definition ? `${definition.name} report` : "Fleet report",
    emailMessage: "Attached is the generated fleet report preview.",
  };
}

export function applyReportDefinitionToDraft(
  draft: ReportBuilderDraft,
  definition: ReportDefinition,
): ReportBuilderDraft {
  return {
    ...draft,
    definitionId: definition.id,
    periodPreset: definition.period.preset ?? draft.periodPreset,
    customStartDateIso: definition.period.startDateIso ?? "",
    customEndDateIso: definition.period.endDateIso ?? "",
    timeWindowPreset: definition.timeWindow?.preset ?? "fullDay",
    customStartTime: definition.timeWindow?.startTime ?? draft.customStartTime,
    customEndTime: definition.timeWindow?.endTime ?? draft.customEndTime,
    vehicleSelectionMode: definition.vehicleSelection.mode,
    selectedVehicleIds: definition.vehicleSelection.vehicleIds ?? [],
    selectedGroupIds: definition.vehicleSelection.groupIds ?? [],
    selectedStatusIds: definition.vehicleSelection.statusIds ?? [],
    selectedParameterIds: getDefinitionDefaultParameters(definition),
    selectedColumnIds: getDefinitionDefaultColumns(definition),
    selectedChartIds: getDefinitionDefaultCharts(definition),
    grouping: definition.defaultGrouping ?? definition.groupingOptions?.[0] ?? draft.grouping,
    aggregation: definition.defaultAggregation ?? definition.aggregationOptions?.[0] ?? draft.aggregation,
    exportFormats: definition.supportedExportFormats?.slice(0, 2) ?? draft.exportFormats,
    fileName: slugifyFileName(definition.name),
    outputMode: definition.defaultOutputMode,
    scheduleFrequency: definition.schedule?.frequency ?? draft.scheduleFrequency,
    recipientEmails: definition.schedule?.recipientEmails?.join(", ") ?? draft.recipientEmails,
    emailSubject: `${definition.name} report`,
  };
}

export function toggleReportParameter(
  selectedParameterIds: string[],
  parameterId: string,
  availableParameters: ReportParameterDefinition[],
): string[] {
  const selected = new Set(selectedParameterIds);

  if (selected.has(parameterId)) {
    if (selected.size <= 1) {
      return selectedParameterIds;
    }
    selected.delete(parameterId);
  } else {
    selected.add(parameterId);
  }

  return availableParameters
    .map((parameter) => parameter.id)
    .filter((id) => selected.has(id));
}

function parseRecipientEmails(value: string): string[] {
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export function buildReportGenerationRequest(draft: ReportBuilderDraft): ReportGenerationRequest {
  const period: ReportGenerationRequest["period"] =
    draft.periodPreset === "custom"
      ? {
          type: "custom" as const,
          startDateIso: draft.customStartDateIso,
          endDateIso: draft.customEndDateIso,
        }
      : { type: "preset" as const, preset: draft.periodPreset };

  const vehicleSelection: ReportVehicleSelection =
    draft.vehicleSelectionMode === "selected"
      ? { mode: "selected", vehicleIds: draft.selectedVehicleIds }
      : draft.vehicleSelectionMode === "status"
        ? { mode: "status", statusIds: draft.selectedStatusIds }
        : draft.vehicleSelectionMode === "groups"
          ? { mode: "groups", groupIds: draft.selectedGroupIds }
          : { mode: "all" };

  const recipientEmails = parseRecipientEmails(draft.recipientEmails);
  const timeWindow =
    draft.timeWindowPreset === "custom"
      ? { preset: "custom" as const, startTime: draft.customStartTime, endTime: draft.customEndTime }
      : { preset: draft.timeWindowPreset };

  return {
    definitionId: draft.definitionId,
    period,
    timeWindow,
    vehicleSelection,
    parameterIds: draft.selectedParameterIds,
    columnIds: draft.selectedColumnIds,
    chartIds: draft.selectedChartIds,
    grouping: draft.grouping,
    aggregation: draft.aggregation,
    includeSummary: draft.includeSummary,
    includeCharts: draft.includeCharts,
    includeMap: draft.includeMap,
    includeRawData: draft.includeRawData,
    outputMode: draft.outputMode,
    exportFormats: draft.exportFormats,
    formatting: {
      includeSummary: draft.includeSummary,
      includeCharts: draft.includeCharts,
      includeMap: draft.includeMap,
      includeRawData: draft.includeRawData,
      includeMetadata: true,
      groupBy: draft.grouping,
      unitSystem: draft.unitSystem,
      dateTimeFormat: draft.dateTimeFormat,
      pageOrientation: draft.pageOrientation,
      fileName: draft.fileName,
    },
    ...(draft.outputMode === "email"
      ? {
          delivery: {
            recipientEmails,
            emailSubject: draft.emailSubject || "Fleet report",
            message: draft.emailMessage,
          },
        }
      : {}),
    ...(draft.outputMode === "schedule"
      ? {
          schedule: {
            enabled: true,
            frequency: draft.scheduleFrequency,
            recipientEmails,
            startDateIso: draft.scheduleStartDateIso || undefined,
            time: draft.scheduleTime,
          },
        }
      : {}),
  };
}

export function formatReportPreviewValue(
  parameter: ReportParameterDefinition,
  value: TelemetrySignalValue | null,
): string {
  if (value === null || value === undefined) {
    return "--";
  }

  if (parameter.valueType === "boolean") {
    return value ? "On" : "Off";
  }

  if (parameter.valueType === "numeric") {
    return `${value}${parameter.unit ? ` ${parameter.unit}` : ""}`;
  }

  if (parameter.valueType === "event") {
    const event = value as TelemetryEventValue;
    return [event.eventType, event.severity, event.state].filter(Boolean).join(" / ");
  }

  return String(value);
}

export function getPreviewSummaryItems(preview: GeneratedReportPreview | null) {
  if (!preview) {
    return [];
  }

  const labelOverrides: Record<string, string> = {
    vehicleCount: "Vehicles",
    parameterCount: "Parameters",
    excludedVehicles: "Excluded",
    totalDistance: "Total distance",
    totalTrips: "Trips",
    activeVehicles: "Active vehicles",
    averageSpeed: "Average speed",
    maxSpeed: "Max speed",
    alarmCount: "Alarms",
  };

  const formatSummaryLabel = (label: string) =>
    labelOverrides[label] ??
    label
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());

  return Object.entries(preview.summary).map(([label, value]) => ({
    label: formatSummaryLabel(label),
    value: String(value),
  }));
}
