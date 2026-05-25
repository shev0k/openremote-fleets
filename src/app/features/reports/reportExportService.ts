import {
  GeneratedReportPreview,
  ReportExportFile,
  ReportExportFormat,
  ReportExportOptions,
} from "../../../domain/models/reports";
import { bytesFromText, normalizeReportExportFileName } from "./reportExportCommon";
import { createReportCsv } from "./reportExportCsv";
import { createReportJson } from "./reportExportJson";
import { createReportPdf } from "./reportExportPdf";
import { createReportXlsx } from "./reportExportXlsx";

function fileForFormat(
  format: ReportExportFormat,
  preview: GeneratedReportPreview,
  options: ReportExportOptions,
): ReportExportFile {
  const baseName = normalizeReportExportFileName(options.fileName);

  if (format === "csv") {
    const text = createReportCsv(preview);
    return {
      format,
      fileName: `${baseName}.csv`,
      mimeType: "text/csv;charset=utf-8",
      text,
      bytes: bytesFromText(text),
    };
  }

  if (format === "json") {
    const text = createReportJson(preview, options);
    return {
      format,
      fileName: `${baseName}.json`,
      mimeType: "application/json;charset=utf-8",
      text,
      bytes: bytesFromText(text),
    };
  }

  if (format === "xlsx") {
    return {
      format,
      fileName: `${baseName}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: createReportXlsx(preview, options),
    };
  }

  return {
    format,
    fileName: `${baseName}.pdf`,
    mimeType: "application/pdf",
    bytes: createReportPdf(preview, options),
  };
}

export function createReportExportFiles(
  preview: GeneratedReportPreview,
  options: ReportExportOptions,
): ReportExportFile[] {
  return options.formats.map((format) => fileForFormat(format, preview, options));
}

export { downloadReportExportFile } from "./reportExportDownload";
