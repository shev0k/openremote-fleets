import type { GeneratedReportPreview } from "../../../../domain/models/reports";
import { ReportPreview } from "../ReportPreview";

interface ReportPreviewPanelProps {
  isLoading: boolean;
  preview: GeneratedReportPreview | null;
}

export function ReportPreviewPanel({ isLoading, preview }: ReportPreviewPanelProps) {
  return <ReportPreview preview={preview} isLoading={isLoading} />;
}
