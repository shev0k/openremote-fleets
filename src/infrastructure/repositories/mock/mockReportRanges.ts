import { ReportGenerationRequest } from "../../../domain/models/reports";

export function normalizeReportRange(dateRange: string): string {
  const normalized = dateRange.trim().toLowerCase();

  if (normalized === "today") return "today";
  if (normalized === "yesterday") return "yesterday";
  if (normalized === "last 7 days") return "last-7-days";
  if (normalized === "last 30 days") return "last-30-days";
  if (normalized === "this month") return "this-month";
  if (normalized === "custom range...") return "custom-range";
  if (normalized.startsWith("custom range:")) return "custom-range";

  return "last-7-days";
}

export function resolveReportSnapshotKey(request: ReportGenerationRequest): string {
  if (request.period.type === "custom") return "custom-range";

  switch (request.period.preset) {
    case "today":
      return "today";
    case "yesterday":
      return "yesterday";
    case "last7Days":
      return "last-7-days";
    case "last30Days":
      return "last-30-days";
    case "thisMonth":
      return "this-month";
    case "previousMonth":
      return "last-30-days";
    default:
      return "today";
  }
}
