import { GeneratedReportPreview } from "../../../domain/models/reports";
import { getReportPreviewTable } from "./reportExportTable";

export function escapeReportCsvValue(value: string): string {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safeValue) ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
}

export function createReportCsv(preview: GeneratedReportPreview): string {
  return getReportPreviewTable(preview)
    .map((row) => row.map((cell) => escapeReportCsvValue(cell)).join(","))
    .join("\n");
}
