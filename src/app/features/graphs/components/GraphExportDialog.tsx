import { useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { FleetReportSnapshot } from "../../../../domain/models/reports";
import { Vehicle } from "../../../../domain/models/vehicle";
import { DialogFrame } from "../../../components/shared/dialogs/DialogFrame";
import { classNames } from "../../../components/shared/utils/classNames";
import {
  GraphExportFormat,
  createGraphDashboardExportFiles,
  downloadGraphExportFile,
} from "../graphExportService";
import { GraphWidgetId } from "../graphsDashboardModel";

interface GraphExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dateRangeLabel: string;
  snapshot: FleetReportSnapshot;
  vehicles: Vehicle[];
  selectedWidgetIds: GraphWidgetId[];
}

const exportFormats: Array<{ id: GraphExportFormat; label: string; description: string }> = [
  { id: "csv", label: "CSV", description: "Flat operational rows for spreadsheet review." },
  { id: "json", label: "JSON", description: "Structured dashboard payload for downstream tools." },
];

export function GraphExportDialog({
  isOpen,
  onClose,
  dateRangeLabel,
  snapshot,
  vehicles,
  selectedWidgetIds,
}: GraphExportDialogProps) {
  const [selectedFormats, setSelectedFormats] = useState<GraphExportFormat[]>(["csv", "json"]);
  const [fileName, setFileName] = useState("fleet-graphs");
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  function toggleFormat(format: GraphExportFormat) {
    setSelectedFormats((current) =>
      current.includes(format)
        ? current.length === 1
          ? current
          : current.filter((entry) => entry !== format)
        : [...current, format],
    );
  }

  function handleDownload() {
    const files = createGraphDashboardExportFiles({
      dateRangeLabel,
      snapshot,
      vehicles,
      selectedWidgetIds,
      formats: selectedFormats,
      fileName,
    });
    files.forEach(downloadGraphExportFile);
    setMessage(`Downloaded ${files.length} ${files.length === 1 ? "file" : "files"}.`);
  }

  return (
    <DialogFrame
      title="Export Graphs"
      subtitle="Download the selected dashboard widgets for the active graph range."
      onClose={onClose}
      widthClassName="max-w-[520px]"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-content-muted">{message ?? `${selectedWidgetIds.length} widgets selected`}</span>
          <button
            type="button"
            onClick={handleDownload}
            className="app-control-active inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold shadow-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Download selected formats
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[16px] border border-border-subtle bg-panel-muted p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-content-muted">File Name</div>
          <input
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border-subtle bg-panel px-3 py-2 text-[13px] text-content-primary outline-none focus:border-brand/50"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {exportFormats.map((format) => {
            const isSelected = selectedFormats.includes(format.id);

            return (
              <button
                key={format.id}
                type="button"
                onClick={() => toggleFormat(format.id)}
                aria-pressed={isSelected}
                className={classNames(
                  "flex min-h-[92px] items-start justify-between gap-3 rounded-[16px] border p-3 text-left transition-colors",
                  isSelected
                    ? "border-brand/35 bg-brand/10 text-content-primary"
                    : "border-border-subtle bg-panel-muted text-content-secondary hover:border-border-strong hover:bg-surface-elevated",
                )}
              >
                <span>
                  <span className="block text-[13px] font-semibold">{format.label}</span>
                  <span className="mt-2 block text-[11px] leading-4 text-content-muted">{format.description}</span>
                </span>
                <span
                  className={classNames(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    isSelected ? "border-brand bg-brand text-brand-foreground" : "border-border-subtle text-content-muted",
                  )}
                >
                  {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </DialogFrame>
  );
}
