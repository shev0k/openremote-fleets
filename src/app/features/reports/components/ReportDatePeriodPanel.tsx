import { CalendarDays } from "lucide-react";
import type { RefObject } from "react";
import type { ReportPeriodPreset } from "../../../../domain/models/reports";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { SelectionDropdown } from "../../../components/shared/controls/SelectionDropdown";
import { formatDateButtonLabel } from "../../../components/shared/datePicker/datePickerModel";
import type { ReportBuilderDraft } from "../reportBuilderViewModel";
import { labelFor, periodOptions } from "../reportPageModel";
import type { ReportDatePickerTarget } from "../useReportBuilderController";

interface ReportDatePeriodPanelProps {
  customEndDateButtonRef: RefObject<HTMLButtonElement | null>;
  customStartDateButtonRef: RefObject<HTMLButtonElement | null>;
  draft: ReportBuilderDraft;
  onDraftChange: (draft: ReportBuilderDraft) => void;
  onOpenDatePickerChange: (target: ReportDatePickerTarget | null) => void;
}

export function ReportDatePeriodPanel({
  customEndDateButtonRef,
  customStartDateButtonRef,
  draft,
  onDraftChange,
  onOpenDatePickerChange,
}: ReportDatePeriodPanelProps) {
  return (
    <PanelCard className="space-y-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand" />
          <h3 className="text-[15px] font-semibold">Date Period</h3>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-content-muted">
          Fixed presets use relative fleet history periods. Choose Custom Range when the report needs an exact start and end date.
        </p>
      </div>
      <SelectionDropdown
        value={labelFor(periodOptions, draft.periodPreset)}
        options={periodOptions}
        activeOptionId={draft.periodPreset}
        onChange={(periodPreset) => {
          onOpenDatePickerChange(null);
          onDraftChange({ ...draft, periodPreset: periodPreset as ReportPeriodPreset });
        }}
        triggerClassName="w-full justify-between !bg-toolbar-surface !border-border-subtle"
        menuClassName="w-56"
        menuTitle="Date period"
      />
      {draft.periodPreset === "custom" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted">Start</span>
              <button
                ref={customStartDateButtonRef}
                aria-label="Custom start date"
                type="button"
                onClick={() => onOpenDatePickerChange("start")}
                className="app-control flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px]"
              >
                <span>{formatDateButtonLabel(draft.customStartDateIso, "Select start")}</span>
                <CalendarDays className="h-3.5 w-3.5 text-content-muted" />
              </button>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted">End</span>
              <button
                ref={customEndDateButtonRef}
                aria-label="Custom end date"
                type="button"
                onClick={() => onOpenDatePickerChange("end")}
                className="app-control flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px]"
              >
                <span>{formatDateButtonLabel(draft.customEndDateIso, "Select end")}</span>
                <CalendarDays className="h-3.5 w-3.5 text-content-muted" />
              </button>
            </div>
          </div>
          <p className="rounded-[12px] border border-border-subtle bg-panel-muted px-3 py-2 text-[12px] leading-5 text-content-muted">
            Custom range requires both start and end dates. Preset dates stay dynamic and resolve when the report runs.
          </p>
        </>
      ) : (
        <p className="rounded-[12px] border border-border-subtle bg-panel-muted px-3 py-2 text-[12px] leading-5 text-content-muted">
          {labelFor(periodOptions, draft.periodPreset)} resolves dynamically from the current date and does not use custom date inputs.
        </p>
      )}
    </PanelCard>
  );
}
