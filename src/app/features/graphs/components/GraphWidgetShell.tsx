import { type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { classNames } from "../../../components/shared/utils/classNames";
import {
  type GraphWidgetDefinition,
  type GraphWidgetLayoutSize,
} from "../graphsDashboardModel";

const widgetLayoutSizeLabels: Record<GraphWidgetLayoutSize, string> = {
  compact: "S",
  medium: "M",
  wide: "W",
};

const widgetLayoutSizeNames: Record<GraphWidgetLayoutSize, string> = {
  compact: "compact",
  medium: "medium",
  wide: "wide",
};

const widgetBodyPaddingClasses: Record<GraphWidgetLayoutSize, string> = {
  compact: "p-2.5",
  medium: "p-3.5",
  wide: "p-4",
};

export function GraphWidgetShell({
  widget,
  icon,
  size,
  onResize,
  children,
}: {
  widget: GraphWidgetDefinition;
  icon: ReactNode;
  size: GraphWidgetLayoutSize;
  onResize: (size: GraphWidgetLayoutSize) => void;
  children: ReactNode;
}) {
  return (
    <PanelCard
      data-testid={`graph-widget-${widget.id}`}
      data-graph-widget-id={widget.id}
      data-widget-size={size}
      className={classNames(
        "relative flex h-full min-h-0 cursor-grab select-none flex-col overflow-hidden p-0 transition-[border-color,box-shadow,transform] active:cursor-grabbing",
      )}
    >
      <div className={classNames("flex items-start justify-between gap-2 border-b border-border-subtle", size === "compact" ? "p-3" : "p-4")}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="graph-widget-drag-affordance app-control inline-flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              {icon}
            </span>
            <h3 className="truncate text-[15px] font-semibold text-content-primary">{widget.title}</h3>
          </div>
          <p className={classNames("mt-1 max-h-8 overflow-hidden text-[11px] leading-4 text-content-muted", size === "compact" ? "hidden" : "")}>
            {widget.description}
          </p>
        </div>
        <div className="flex shrink-0 rounded-full border border-border-subtle bg-panel-muted p-1">
          {(Object.keys(widgetLayoutSizeLabels) as GraphWidgetLayoutSize[]).map((nextSize) => (
            <button
              key={nextSize}
              type="button"
              aria-label={`Set ${widget.title} widget to ${widgetLayoutSizeNames[nextSize]}`}
              aria-pressed={size === nextSize}
              onClick={() => onResize(nextSize)}
              className={classNames(
                "graph-widget-action h-6 min-w-6 rounded-full px-2 text-[10px] font-bold transition-colors",
                size === nextSize
                  ? "bg-brand text-brand-foreground"
                  : "text-content-muted hover:bg-surface-elevated hover:text-content-primary",
              )}
            >
              {widgetLayoutSizeLabels[nextSize]}
            </button>
          ))}
        </div>
      </div>
      <div className={classNames("min-h-0 flex-1 overflow-hidden", widgetBodyPaddingClasses[size])}>{children}</div>
    </PanelCard>
  );
}
