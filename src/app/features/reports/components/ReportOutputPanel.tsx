import { BarChart3, Download, Mail, Printer, RefreshCw, Send } from "lucide-react";
import type { ReportExportFormat, ReportOutputMode } from "../../../../domain/models/reports";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { SelectionDropdown } from "../../../components/shared/controls/SelectionDropdown";
import { SegmentedControl } from "../../../components/shared/controls/SegmentedControl";
import { classNames } from "../../../components/shared/utils/classNames";
import type { ReportBuilderDraft } from "../reportBuilderViewModel";
import {
  dateTimeFormatOptions,
  exportFormatLabels,
  formatReportOptionLabel,
  labelFor,
  pageOrientationOptions,
  scheduleFrequencyOptions,
  toggleValue,
} from "../reportPageModel";
import type { ReportValidationResult } from "../reportValidation";

interface ReportOutputPanelProps {
  actionMessage: string | null;
  availableOutputModes: ReportOutputMode[];
  draft: ReportBuilderDraft;
  isPreviewLoading: boolean;
  selectedParameterCount: number;
  supportedFormats: ReportExportFormat[];
  validation: ReportValidationResult | null;
  onDraftChange: (draft: ReportBuilderDraft) => void;
  onRunReport: () => void;
}

export function ReportOutputPanel({
  actionMessage,
  availableOutputModes,
  draft,
  isPreviewLoading,
  selectedParameterCount,
  supportedFormats,
  validation,
  onDraftChange,
  onRunReport,
}: ReportOutputPanelProps) {
  return (
    <PanelCard data-testid="reports-output-panel" className="min-h-0 overflow-hidden p-0 xl:col-span-2 2xl:col-span-1">
      <div className="border-b border-border-subtle p-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-brand" />
          <h2 className="text-[15px] font-semibold">Output And Actions</h2>
        </div>
      </div>
      <div className="space-y-5 overflow-y-auto p-4 custom-scrollbar 2xl:h-[calc(100vh-260px)]">
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-content-muted">Output Mode</span>
          <div data-testid="reports-output-mode" className="overflow-visible">
            <SegmentedControl
              options={availableOutputModes.map((mode) => ({ id: mode, label: formatReportOptionLabel(mode) }))}
              value={draft.outputMode}
              onChange={(outputMode) => onDraftChange({ ...draft, outputMode: outputMode as ReportBuilderDraft["outputMode"] })}
              className="w-full !overflow-visible gap-0.5 p-1"
              activeItemClassName="min-w-0 grow justify-center px-1.5 py-1.5 text-[11px]"
              inactiveItemClassName="min-w-0 grow justify-center px-1.5 py-1.5 text-[11px]"
            />
          </div>
        </div>

        {draft.outputMode === "export" ? (
          <div className="space-y-3 rounded-[16px] border border-border-subtle bg-panel-muted p-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-brand" />
              <span className="text-[13px] font-semibold">Export Formats</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {supportedFormats.map((format) => {
                const isSelected = draft.exportFormats.includes(format);
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => onDraftChange({ ...draft, exportFormats: toggleValue(draft.exportFormats, format, false) as ReportExportFormat[] })}
                    className={classNames(
                      "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                      isSelected ? "border-brand/35 bg-brand/10 text-brand" : "border-border-subtle bg-panel text-content-muted",
                    )}
                  >
                    {exportFormatLabels[format]}
                  </button>
                );
              })}
            </div>
            <input
              value={draft.fileName}
              onChange={(event) => onDraftChange({ ...draft, fileName: event.target.value })}
              className="w-full rounded-xl border border-border-subtle bg-panel px-3 py-2 text-[12px] text-content-primary outline-none focus:border-brand/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <SelectionDropdown
                value={labelFor(pageOrientationOptions, draft.pageOrientation)}
                options={pageOrientationOptions}
                activeOptionId={draft.pageOrientation}
                onChange={(pageOrientation) => onDraftChange({ ...draft, pageOrientation: pageOrientation as ReportBuilderDraft["pageOrientation"] })}
                menuTitle="Page orientation"
                triggerClassName="w-full justify-between !bg-panel !border-border-subtle"
                menuClassName="w-44"
              />
              <SelectionDropdown
                value={labelFor(dateTimeFormatOptions, draft.dateTimeFormat)}
                options={dateTimeFormatOptions}
                activeOptionId={draft.dateTimeFormat}
                onChange={(dateTimeFormat) => onDraftChange({ ...draft, dateTimeFormat: dateTimeFormat as ReportBuilderDraft["dateTimeFormat"] })}
                menuTitle="Date and time"
                triggerClassName="w-full justify-between !bg-panel !border-border-subtle"
                menuClassName="w-44"
              />
            </div>
          </div>
        ) : null}

        {draft.outputMode === "print" ? (
          <div className="flex gap-2 rounded-[16px] border border-border-subtle bg-panel-muted p-3 text-[12px] text-content-muted">
            <Printer className="h-4 w-4 shrink-0 text-brand" />
            Print uses the dedicated report preview layout and hides builder controls.
          </div>
        ) : null}

        {draft.outputMode === "email" || draft.outputMode === "schedule" ? (
          <div className="space-y-3 rounded-[16px] border border-border-subtle bg-panel-muted p-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" />
              <span className="text-[13px] font-semibold">
                {draft.outputMode === "email" ? "Email Delivery" : "Recurring Schedule"}
              </span>
            </div>
            <input
              value={draft.recipientEmails}
              onChange={(event) => onDraftChange({ ...draft, recipientEmails: event.target.value })}
              placeholder="ops@example.com, dispatcher@example.com"
              className="w-full rounded-xl border border-border-subtle bg-panel px-3 py-2 text-[12px] text-content-primary outline-none focus:border-brand/50"
            />
            <input
              value={draft.emailSubject}
              onChange={(event) => onDraftChange({ ...draft, emailSubject: event.target.value })}
              className="w-full rounded-xl border border-border-subtle bg-panel px-3 py-2 text-[12px] text-content-primary outline-none focus:border-brand/50"
            />
            {draft.outputMode === "email" ? (
              <textarea
                value={draft.emailMessage}
                onChange={(event) => onDraftChange({ ...draft, emailMessage: event.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border-subtle bg-panel px-3 py-2 text-[12px] text-content-primary outline-none focus:border-brand/50"
              />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <SelectionDropdown
                  value={labelFor(scheduleFrequencyOptions, draft.scheduleFrequency)}
                  options={scheduleFrequencyOptions}
                  activeOptionId={draft.scheduleFrequency}
                  onChange={(scheduleFrequency) => onDraftChange({ ...draft, scheduleFrequency: scheduleFrequency as ReportBuilderDraft["scheduleFrequency"] })}
                  menuTitle="Frequency"
                  triggerClassName="w-full justify-between !bg-panel !border-border-subtle"
                  menuClassName="w-40"
                />
                <input
                  type="date"
                  value={draft.scheduleStartDateIso}
                  onChange={(event) => onDraftChange({ ...draft, scheduleStartDateIso: event.target.value })}
                  className="rounded-xl border border-border-subtle bg-panel px-3 py-2 text-[12px]"
                />
                <input
                  type="time"
                  value={draft.scheduleTime}
                  onChange={(event) => onDraftChange({ ...draft, scheduleTime: event.target.value })}
                  className="rounded-xl border border-border-subtle bg-panel px-3 py-2 text-[12px]"
                />
              </div>
            )}
            <p className="text-[12px] text-content-muted">
              Delivery modes prepare a local request payload. No email is sent and no recurring schedule is saved.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-content-muted">Validation</span>
          <div className="space-y-2">
            {validation?.messages.length ? (
              validation.messages.map((message) => (
                <div
                  key={message.text}
                  className={classNames(
                    "rounded-[12px] border px-3 py-2 text-[12px]",
                    message.severity === "error"
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : message.severity === "warning"
                        ? "border-warning/30 bg-warning/10 text-warning"
                        : "border-brand/20 bg-brand/10 text-content-secondary",
                  )}
                >
                  {message.text}
                </div>
              ))
            ) : (
              <div className="rounded-[12px] border border-brand/20 bg-brand/10 px-3 py-2 text-[12px] text-content-secondary">
                Current report request is valid.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-border-subtle bg-panel-muted p-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">Compatible</div>
            <div className="mt-1 text-[18px] font-semibold text-content-primary">
              {validation?.compatibility.compatibleVehicleIds.length ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">Excluded</div>
            <div className="mt-1 text-[18px] font-semibold text-content-primary">
              {validation?.compatibility.excludedVehicles.length ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">Parameters</div>
            <div className="mt-1 text-[18px] font-semibold text-content-primary">{selectedParameterCount}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">Formats</div>
            <div className="mt-1 text-[18px] font-semibold text-content-primary">{draft.exportFormats.length}</div>
          </div>
        </div>

        {actionMessage ? (
          <div className="rounded-[14px] border border-brand/20 bg-brand/10 p-3 text-[12px] text-content-secondary">
            {actionMessage}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onRunReport}
          disabled={isPreviewLoading || !validation?.canGenerate}
          className="app-control-active flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPreviewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          {draft.outputMode === "export" ? "Generate And Export" : draft.outputMode === "print" ? "Generate And Print" : "Generate Report"}
        </button>
      </div>
    </PanelCard>
  );
}
