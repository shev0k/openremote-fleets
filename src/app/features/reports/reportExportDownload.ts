import { ReportExportFile } from "../../../domain/models/reports";

export function downloadReportExportFile(file: ReportExportFile): void {
  const bytes = new ArrayBuffer(file.bytes.byteLength);
  new Uint8Array(bytes).set(file.bytes);
  const blob = new Blob([bytes], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
