import { CheckCircle2, Columns3, Layers3 } from "lucide-react";
import type { ReportDefinition } from "../../../../domain/models/reports";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { SelectionDropdown } from "../../../components/shared/controls/SelectionDropdown";
import { classNames } from "../../../components/shared/utils/classNames";
import type { ReportBuilderDraft } from "../reportBuilderViewModel";
import {
  createReportOptions,
  formatReportOptionLabel,
  toggleValue,
} from "../reportPageModel";

interface ReportOptionsPanelProps {
  definition: ReportDefinition;
  draft: ReportBuilderDraft;
  onDraftChange: (draft: ReportBuilderDraft) => void;
}

const outputSectionOptions = [
  ["includeSummary", "Summary", "Summary adds KPI cards and headline totals to the preview and exports."],
  ["includeCharts", "Charts", "Charts add visual sections using selected chart definitions."],
  ["includeMap", "Map", "Map adds route and location context when the report has trip-capable data."],
  ["includeRawData", "Raw data", "Raw data adds datapoint counts and full telemetry rows to export payloads."],
] as const;

export function ReportOptionsPanel({ definition, draft, onDraftChange }: ReportOptionsPanelProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Columns3 className="h-4 w-4 text-brand" />
          <h3 className="text-[15px] font-semibold">Columns And Charts</h3>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">Columns</span>
            <p className="mt-1 text-[12px] leading-5 text-content-muted">
              Columns control the table fields and the main CSV/XLSX export data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(definition.availableColumns ?? ["vehicle", "time", ...definition.parameterIds]).map((columnId) => {
              const isSelected = draft.selectedColumnIds.includes(columnId);
              return (
                <button
                  key={columnId}
                  type="button"
                  title={`${formatReportOptionLabel(columnId)} appears in the preview table and exported report data.`}
                  onClick={() => onDraftChange({ ...draft, selectedColumnIds: toggleValue(draft.selectedColumnIds, columnId, false) })}
                  className={classNames(
                    "rounded-full border px-3 py-1.5 text-[12px]",
                    isSelected ? "border-brand/35 bg-brand/10 text-brand" : "border-border-subtle bg-panel-muted text-content-muted",
                  )}
                >
                  {formatReportOptionLabel(columnId)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">Charts</span>
            <p className="mt-1 text-[12px] leading-5 text-content-muted">
              Charts control the visual sections generated in preview, print, and PDF-style output.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(definition.availableCharts ?? []).map((chartId) => {
              const isSelected = draft.selectedChartIds.includes(chartId);
              return (
                <button
                  key={chartId}
                  type="button"
                  title={`${formatReportOptionLabel(chartId)} adds a chart section to the generated report.`}
                  onClick={() => onDraftChange({ ...draft, selectedChartIds: toggleValue(draft.selectedChartIds, chartId) })}
                  className={classNames(
                    "rounded-full border px-3 py-1.5 text-[12px]",
                    isSelected ? "border-brand/35 bg-brand/10 text-brand" : "border-border-subtle bg-panel-muted text-content-muted",
                  )}
                >
                  {formatReportOptionLabel(chartId)}
                </button>
              );
            })}
          </div>
        </div>
      </PanelCard>

      <PanelCard className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-brand" />
          <h3 className="text-[15px] font-semibold">Grouping And Aggregation</h3>
        </div>
        <p className="text-[12px] leading-5 text-content-muted">
          Grouping controls how rows are organized. Aggregation controls how numeric telemetry is summarized in charts and exports.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <SelectionDropdown
            value={formatReportOptionLabel(draft.grouping)}
            options={createReportOptions(definition.groupingOptions ?? ["vehicle"])}
            activeOptionId={draft.grouping}
            onChange={(grouping) => onDraftChange({ ...draft, grouping: grouping as ReportBuilderDraft["grouping"] })}
            menuTitle="Grouping"
            triggerClassName="w-full justify-between !bg-toolbar-surface !border-border-subtle"
            menuClassName="w-48"
          />
          <SelectionDropdown
            value={formatReportOptionLabel(draft.aggregation)}
            options={createReportOptions(definition.aggregationOptions ?? ["average"])}
            activeOptionId={draft.aggregation}
            onChange={(aggregation) => onDraftChange({ ...draft, aggregation: aggregation as ReportBuilderDraft["aggregation"] })}
            menuTitle="Aggregation"
            triggerClassName="w-full justify-between !bg-toolbar-surface !border-border-subtle"
            menuClassName="w-48"
          />
        </div>
        <div
          className="grid grid-cols-1 gap-2 text-[12px] text-content-secondary sm:grid-cols-2"
          data-testid="report-output-section-options"
        >
          {outputSectionOptions.map(([field, label, description]) => {
            const isSelected = Boolean(draft[field]);

            return (
              <button
                key={field}
                aria-label={`${label} output`}
                aria-pressed={isSelected}
                type="button"
                className={classNames(
                  "flex min-h-[92px] items-start justify-between gap-3 rounded-[14px] border p-3 text-left transition-colors",
                  isSelected
                    ? "border-brand/35 bg-brand/10 text-content-primary"
                    : "border-border-subtle bg-panel-muted text-content-secondary hover:border-border-strong hover:bg-surface-elevated",
                )}
                title={description}
                onClick={() => onDraftChange({ ...draft, [field]: !isSelected })}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{label}</span>
                  <span className="mt-2 block text-[11px] leading-4 text-content-muted">{description}</span>
                </span>
                <span
                  className={classNames(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border-subtle text-content-muted",
                  )}
                >
                  {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </PanelCard>
    </div>
  );
}
