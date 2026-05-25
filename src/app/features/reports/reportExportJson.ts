import {
  GeneratedReportPreview,
  ReportExportOptions,
} from "../../../domain/models/reports";

export function createReportJson(
  preview: GeneratedReportPreview,
  options: ReportExportOptions,
): string {
  return JSON.stringify(
    {
      metadata: preview.metadata,
      generatedAtIso: preview.generatedAtIso,
      request: preview.request,
      exportOptions: options,
      summary: preview.summary,
      sections: preview.sections,
      columns: preview.columns,
      rows: preview.rows,
    },
    null,
    2,
  );
}
