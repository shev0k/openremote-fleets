import { CheckCircle2 } from "lucide-react";
import { DialogFrame } from "../../../components/shared/dialogs/DialogFrame";

interface ReportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportExportDialog({ isOpen, onClose }: ReportExportDialogProps) {
  if (!isOpen) return null;

  return (
    <DialogFrame
      title="Report Export"
      onClose={onClose}
      widthClassName="max-w-[420px]"
      bodyClassName="space-y-0"
      footer={
        <div className="flex justify-end">
          <button onClick={onClose} className="app-control-active rounded-full px-5 py-2.5 text-[13px] font-semibold shadow-lg transition-colors">
            <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
            Close
          </button>
        </div>
      }
    >
      <div className="rounded-xl border border-border-subtle bg-panel-muted p-4 text-sm text-content-muted">
        <p className="mb-2 font-semibold text-content-primary">Use Reports to generate export files.</p>
        <p>Graphs is for quick visual review. The Reports workspace creates CSV, JSON, XLSX, and PDF files from generated report previews.</p>
      </div>
    </DialogFrame>
  );
}
