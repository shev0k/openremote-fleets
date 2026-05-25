import { ReportDefinition, ReportParameterDefinition } from "../../../domain/models/reports";
import { Vehicle } from "../../../domain/models/vehicle";
import {
  ReportCompatibilitySummary,
  VehicleReportCapabilityProfile,
  summarizeReportCompatibility,
} from "./reportCapabilities";
import { ReportBuilderDraft } from "./reportBuilderViewModel";

export type ReportValidationSeverity = "error" | "warning" | "info";

export interface ReportValidationMessage {
  severity: ReportValidationSeverity;
  text: string;
}

export interface ReportValidationResult {
  canGenerate: boolean;
  messages: ReportValidationMessage[];
  compatibility: ReportCompatibilitySummary;
  supportedParameterIds: string[];
  unsupportedSelectedParameterIds: string[];
}

interface ValidateReportBuilderDraftInput {
  draft: ReportBuilderDraft;
  definition: ReportDefinition;
  parameters: ReportParameterDefinition[];
  selectedVehicles: Vehicle[];
  capabilityProfiles: Record<string, VehicleReportCapabilityProfile>;
}

function parameterLabel(parameterId: string, parameters: ReportParameterDefinition[]): string {
  return parameters.find((parameter) => parameter.id === parameterId)?.displayName ?? parameterId;
}

export function validateReportBuilderDraft({
  draft,
  definition,
  parameters,
  selectedVehicles,
  capabilityProfiles,
}: ValidateReportBuilderDraftInput): ReportValidationResult {
  const messages: ReportValidationMessage[] = [];
  const supportedParameterIds = definition.parameterIds;
  const supportedParameterSet = new Set(supportedParameterIds);
  const unsupportedSelectedParameterIds = draft.selectedParameterIds.filter((id) => !supportedParameterSet.has(id));
  const compatibility = summarizeReportCompatibility(definition, selectedVehicles, capabilityProfiles);

  if (!selectedVehicles.length) {
    messages.push({ severity: "error", text: "Select at least one vehicle." });
  }

  if (!draft.selectedParameterIds.length) {
    messages.push({ severity: "error", text: "Select at least one parameter." });
  }

  if (unsupportedSelectedParameterIds.length) {
    for (const parameterId of unsupportedSelectedParameterIds) {
      messages.push({
        severity: "error",
        text: `${parameterLabel(parameterId, parameters)} is not available for ${definition.name}.`,
      });
    }
  }

  if (!compatibility.isAvailable && selectedVehicles.length > 0) {
    messages.push({ severity: "error", text: compatibility.message });
  } else if (compatibility.excludedVehicles.length > 0) {
    messages.push({ severity: "warning", text: compatibility.message });
  }

  if (draft.outputMode === "export" && !draft.exportFormats.length) {
    messages.push({ severity: "error", text: "Select at least one export format." });
  }

  if ((draft.outputMode === "email" || draft.outputMode === "schedule") && !draft.recipientEmails.trim()) {
    messages.push({ severity: "error", text: "Add at least one recipient." });
  }

  if (draft.timeWindowPreset === "custom" && (!draft.customStartTime || !draft.customEndTime)) {
    messages.push({ severity: "error", text: "Set a custom time window start and end time." });
  }

  if (draft.periodPreset === "custom" && (!draft.customStartDateIso || !draft.customEndDateIso)) {
    messages.push({ severity: "error", text: "Set a custom date range start and end date." });
  }

  const hasErrors = messages.some((message) => message.severity === "error");

  return {
    canGenerate: !hasErrors,
    messages,
    compatibility,
    supportedParameterIds,
    unsupportedSelectedParameterIds,
  };
}
