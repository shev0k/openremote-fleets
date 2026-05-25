import type { ReportCapabilityId, ReportDefinition } from "../../../../domain/models/reports";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { classNames } from "../../../components/shared/utils/classNames";
import {
  REPORT_CAPABILITY_LABELS,
  type ReportCompatibilitySummary,
} from "../reportCapabilities";
import { formatReportCategory } from "../reportPageModel";

interface ReportDefinitionSummaryPanelProps {
  capabilities: ReportCapabilityId[];
  compatibility: ReportCompatibilitySummary | null;
  definition: ReportDefinition;
}

export function ReportDefinitionSummaryPanel({
  capabilities,
  compatibility,
  definition,
}: ReportDefinitionSummaryPanelProps) {
  return (
    <PanelCard className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            {formatReportCategory(definition.category)}
          </span>
          <h2 className="mt-1 text-[20px] font-semibold text-content-primary">{definition.name}</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-6 text-content-muted">{definition.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {capabilities.map((capabilityId) => (
            <span
              key={capabilityId}
              className="rounded-full border border-border-subtle bg-panel-muted px-2.5 py-1 text-[11px] text-content-secondary"
            >
              {REPORT_CAPABILITY_LABELS[capabilityId]}
            </span>
          ))}
        </div>
      </div>
      {compatibility ? (
        <div
          className={classNames(
            "rounded-[14px] border p-3 text-[12px]",
            compatibility.excludedVehicles.length
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-brand/20 bg-brand/10 text-content-secondary",
          )}
        >
          {compatibility.message}
        </div>
      ) : null}
    </PanelCard>
  );
}
