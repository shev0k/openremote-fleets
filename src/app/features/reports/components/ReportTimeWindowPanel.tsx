import { Timer } from "lucide-react";
import type { ReportTimeWindowPreset } from "../../../../domain/models/reports";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { SelectionDropdown } from "../../../components/shared/controls/SelectionDropdown";
import { SegmentedControl } from "../../../components/shared/controls/SegmentedControl";
import type { ReportBuilderDraft } from "../reportBuilderViewModel";
import { customTimeOptions, timeWindowOptions } from "../reportPageModel";

interface ReportTimeWindowPanelProps {
  draft: ReportBuilderDraft;
  onDraftChange: (draft: ReportBuilderDraft) => void;
}

export function ReportTimeWindowPanel({ draft, onDraftChange }: ReportTimeWindowPanelProps) {
  return (
    <PanelCard className="space-y-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-brand" />
          <h3 className="text-[15px] font-semibold">Time Window</h3>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-content-muted">
          Time window filters hours inside the selected dates. Business Hours uses 08:00 to 18:00.
        </p>
      </div>
      <SegmentedControl
        options={timeWindowOptions}
        value={draft.timeWindowPreset}
        onChange={(timeWindowPreset) =>
          onDraftChange({ ...draft, timeWindowPreset: timeWindowPreset as ReportTimeWindowPreset })
        }
        className="w-full !overflow-visible"
      />
      {draft.timeWindowPreset === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted">Start</span>
            <SelectionDropdown
              value={draft.customStartTime}
              options={customTimeOptions}
              activeOptionId={draft.customStartTime}
              onChange={(customStartTime) => onDraftChange({ ...draft, customStartTime })}
              buttonAriaLabel="Custom start time"
              menuTitle="Start time"
              triggerClassName="w-full justify-between !rounded-xl !bg-panel-muted !border-border-subtle"
              menuClassName="max-h-[280px] w-40 overflow-y-auto custom-scrollbar"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted">End</span>
            <SelectionDropdown
              value={draft.customEndTime}
              options={customTimeOptions}
              activeOptionId={draft.customEndTime}
              onChange={(customEndTime) => onDraftChange({ ...draft, customEndTime })}
              buttonAriaLabel="Custom end time"
              menuTitle="End time"
              triggerClassName="w-full justify-between !rounded-xl !bg-panel-muted !border-border-subtle"
              menuClassName="max-h-[280px] w-40 overflow-y-auto custom-scrollbar"
            />
          </div>
        </div>
      ) : (
        <p className="rounded-[12px] border border-border-subtle bg-panel-muted px-3 py-2 text-[12px] leading-5 text-content-muted">
          Custom time inputs appear only when Custom is selected, so fixed windows cannot conflict with stale times.
        </p>
      )}
    </PanelCard>
  );
}
