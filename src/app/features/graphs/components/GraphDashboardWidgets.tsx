import { CheckCircle2, RotateCcw, Settings2 } from "lucide-react";
import { type FleetReportSnapshot } from "../../../../domain/models/reports";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { classNames } from "../../../components/shared/utils/classNames";
import {
  GRAPH_WIDGET_CATALOG,
  type GraphDashboardSummary,
  type GraphWidgetCategory,
  type GraphWidgetDefinition,
  type GraphWidgetId,
  type GraphWidgetLayoutItem,
  type GraphWidgetLayoutSize,
} from "../graphsDashboardModel";
import { GraphWidgetShell } from "./GraphWidgetShell";
import { getGraphWidgetRegistration } from "./graphWidgetRegistry";

const categoryLabels: Record<GraphWidgetCategory, string> = {
  operations: "Operations",
  safety: "Safety",
  telemetry: "Telemetry",
  assets: "Assets",
  drivers: "Drivers",
};

export function GraphDashboardWidget({
  widget,
  layoutItem,
  snapshot,
  summary,
  dateRangeLabel,
  onResize,
}: {
  widget: GraphWidgetDefinition;
  layoutItem: GraphWidgetLayoutItem;
  snapshot: FleetReportSnapshot;
  summary: GraphDashboardSummary;
  dateRangeLabel: string;
  onResize: (widgetId: GraphWidgetId, size: GraphWidgetLayoutSize) => void;
}) {
  const registration = getGraphWidgetRegistration(widget.id);
  const WidgetComponent = registration.component;

  return (
    <GraphWidgetShell
      widget={widget}
      icon={registration.icon}
      size={layoutItem.size}
      onResize={(size) => onResize(widget.id, size)}
    >
      <WidgetComponent
        snapshot={snapshot}
        summary={summary}
        dateRangeLabel={dateRangeLabel}
        size={layoutItem.size}
      />
    </GraphWidgetShell>
  );
}

export function WidgetLibrary({
  selectedWidgetIds,
  onToggleWidget,
  onReset,
}: {
  selectedWidgetIds: GraphWidgetId[];
  onToggleWidget: (widgetId: GraphWidgetId) => void;
  onReset: () => void;
}) {
  const selectedSet = new Set(selectedWidgetIds);

  return (
    <PanelCard className="flex min-h-0 flex-col overflow-hidden p-0">
      <div className="border-b border-border-subtle p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-brand" />
              <h2 className="text-[15px] font-semibold text-content-primary">Widget Library</h2>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-content-muted">
              Select the widgets shown on this dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset graph widgets"
            className="app-control flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar">
        {(Object.keys(categoryLabels) as GraphWidgetCategory[]).map((category) => {
          const widgets = GRAPH_WIDGET_CATALOG.filter((widget) => widget.category === category);
          return (
            <div key={category} className="space-y-2">
              <div className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">
                {categoryLabels[category]}
              </div>
              {widgets.map((widget) => {
                const isSelected = selectedSet.has(widget.id);
                const registration = getGraphWidgetRegistration(widget.id);

                return (
                  <button
                    key={widget.id}
                    type="button"
                    aria-label={`${isSelected ? "Hide" : "Show"} ${widget.title} widget`}
                    aria-pressed={isSelected}
                    onClick={() => onToggleWidget(widget.id)}
                    className={classNames(
                      "flex w-full items-start gap-3 rounded-[14px] border p-3 text-left transition-colors",
                      isSelected
                        ? "border-brand/35 bg-brand/10"
                        : "border-border-subtle bg-panel-muted hover:border-border-strong hover:bg-surface-elevated",
                    )}
                  >
                    <span className={classNames("mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full", isSelected ? "bg-brand text-brand-foreground" : "bg-surface-sunken text-content-muted")}>
                      {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : registration.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-content-primary">{widget.title}</span>
                      <span className="mt-1 block text-[10px] leading-4 text-content-muted">{widget.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}
