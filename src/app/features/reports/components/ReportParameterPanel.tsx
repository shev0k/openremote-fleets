import { Settings2 } from "lucide-react";
import type { ReportParameterDefinition } from "../../../../domain/models/reports";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { ReportParameterSelector } from "../ReportParameterSelector";
import type { ReportBuilderDraft } from "../reportBuilderViewModel";
import { toggleReportParameter } from "../reportBuilderViewModel";

interface ReportParameterPanelProps {
  draft: ReportBuilderDraft;
  visibleParameters: ReportParameterDefinition[];
  onDraftChange: (draft: ReportBuilderDraft) => void;
}

export function ReportParameterPanel({
  draft,
  visibleParameters,
  onDraftChange,
}: ReportParameterPanelProps) {
  return (
    <PanelCard className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-brand" />
          <h3 className="text-[15px] font-semibold">Parameters</h3>
        </div>
        <span className="text-[12px] text-content-muted">{draft.selectedParameterIds.length} selected</span>
      </div>
      <p className="text-[12px] leading-5 text-content-muted">
        Choose the tracker attributes included in the report. The list is filtered by report type and selected vehicle capabilities.
      </p>
      <ReportParameterSelector
        parameters={visibleParameters}
        selectedParameterIds={draft.selectedParameterIds}
        onToggleParameter={(parameterId) =>
          onDraftChange({
            ...draft,
            selectedParameterIds: toggleReportParameter(draft.selectedParameterIds, parameterId, visibleParameters),
          })
        }
      />
    </PanelCard>
  );
}
