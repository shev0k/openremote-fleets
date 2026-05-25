import {
  GeneratedReportPreview,
  ReportExportOptions,
} from "../../../domain/models/reports";
import { formatReportPreviewValue, getPreviewSummaryItems } from "./reportBuilderViewModel";

export function getReportPreviewTable(preview: GeneratedReportPreview): string[][] {
  const header = ["Vehicle", "Time", ...preview.columns.map((column) => column.displayName)];
  const rows = preview.rows.map((row) => [
    row.vehicleId,
    row.timestampIso ?? "",
    ...preview.columns.map((column) => formatReportPreviewValue(column, row.values[column.id] ?? null)),
  ]);

  return [header, ...rows];
}

export function createReportSummaryRows(preview: GeneratedReportPreview): string[][] {
  return [
    ["Metric", "Value"],
    ...getPreviewSummaryItems(preview).map((item) => [item.label, item.value]),
  ];
}

export function createReportMetadataRows(
  preview: GeneratedReportPreview,
  options: ReportExportOptions,
): string[][] {
  return [
    ["Field", "Value"],
    ["Title", preview.metadata?.title ?? preview.request.definitionId],
    ["Generated", preview.generatedAtIso],
    ["Period", preview.metadata?.periodLabel ?? preview.request.period.preset ?? preview.request.period.type],
    ["Vehicles", preview.metadata?.selectedVehiclesLabel ?? preview.request.vehicleSelection.mode],
    ["Filters", preview.metadata?.filters?.join(", ") ?? ""],
    ["Group By", options.groupBy],
    ["Unit System", options.unitSystem],
    ["Date/Time Format", options.dateTimeFormat],
    ["Include Summary", String(options.includeSummary)],
    ["Include Charts", String(options.includeCharts)],
    ["Include Map", String(options.includeMap)],
    ["Include Raw Data", String(options.includeRawData)],
  ];
}

export function createReportSectionRows(preview: GeneratedReportPreview): string[][] {
  const rows: string[][] = [["Section", "Type", "Label", "Value", "Detail"]];

  for (const section of preview.sections ?? []) {
    if (section.items?.length) {
      section.items.forEach((item) => {
        rows.push([section.title, section.kind, item.label, item.value, item.detail ?? ""]);
      });
    } else {
      rows.push([section.title, section.kind, section.description ?? "", "", ""]);
    }
  }

  return rows;
}

export function createReportChartRows(preview: GeneratedReportPreview): string[][] {
  const rows: string[][] = [["Chart", "Label", "Value", "Secondary Value", "Unit", "Tone"]];

  for (const section of preview.sections ?? []) {
    for (const point of section.chart?.points ?? []) {
      rows.push([
        section.title,
        point.label,
        String(point.value),
        point.secondaryValue !== undefined ? String(point.secondaryValue) : "",
        point.unit ?? section.chart?.unit ?? "",
        point.tone ?? "",
      ]);
    }
  }

  return rows;
}
