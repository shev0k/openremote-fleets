/* ======== IMPORTS ======== */

import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, X } from "lucide-react";
import { DragEvent as ReactDragEvent, useState } from "react";
import type { LiveFleetWidgetId } from "../../providers/liveFleetWorkspace.types";

/* ======== TYPES ======== */

interface SidebarWidgetArrangementPanelProps {
  orderedWidgetIds: LiveFleetWidgetId[];
  visibleWidgetIds: LiveFleetWidgetId[];
  widgetLabels: Record<LiveFleetWidgetId, string>;
  onMove: (widgetId: LiveFleetWidgetId, targetIndex: number) => void;
  onReorder: (widgetId: LiveFleetWidgetId, direction: "up" | "down") => void;
  onToggleVisibility: (widgetId: LiveFleetWidgetId) => void;
  onResetWidgetHeights: () => void;
  onClose: () => void;
}

/* ======== COMPONENT ======== */

export function SidebarWidgetArrangementPanel({
  orderedWidgetIds,
  visibleWidgetIds,
  widgetLabels,
  onMove,
  onReorder,
  onToggleVisibility,
  onResetWidgetHeights,
  onClose,
}: SidebarWidgetArrangementPanelProps) {
  const [draggedWidgetId, setDraggedWidgetId] = useState<LiveFleetWidgetId | null>(null);
  const [dropTargetWidgetId, setDropTargetWidgetId] = useState<LiveFleetWidgetId | null>(null);

  const handleDrop = (targetWidgetId: LiveFleetWidgetId, targetIndex: number) => {
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      setDropTargetWidgetId(null);
      return;
    }

    onMove(draggedWidgetId, targetIndex);
    setDraggedWidgetId(null);
    setDropTargetWidgetId(null);
  };

  return (
    <div className="pointer-events-auto absolute left-0 top-full z-[1450] mt-3 w-[320px] max-w-[calc(100vw-2.5rem)] app-overlay rounded-[24px] p-4">
      <div className="relative mb-4">
        <div className="min-w-0 pr-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-content-muted">Workspace layout</p>
          <h3 className="mt-1 text-[15px] font-semibold text-content-primary">Show, hide, and reorder cards</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="app-control absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onResetWidgetHeights}
        className="mb-4 inline-flex w-full items-center justify-center rounded-[18px] border border-border-subtle bg-panel-muted px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted transition-colors hover:bg-surface-elevated hover:text-content-primary"
      >
        Reset sizes
      </button>

      <div className="space-y-2">
        {orderedWidgetIds.map((widgetId, index) => {
          const isVisible = visibleWidgetIds.includes(widgetId);

          return (
            <div
              key={widgetId}
              draggable
              onDragStart={() => setDraggedWidgetId(widgetId)}
              onDragEnd={() => {
                setDraggedWidgetId(null);
                setDropTargetWidgetId(null);
              }}
              onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
                event.preventDefault();
                if (draggedWidgetId && draggedWidgetId !== widgetId) {
                  setDropTargetWidgetId(widgetId);
                }
              }}
              onDragLeave={() => {
                if (dropTargetWidgetId === widgetId) {
                  setDropTargetWidgetId(null);
                }
              }}
              onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
                event.preventDefault();
                handleDrop(widgetId, index);
              }}
              className={`flex cursor-grab items-center gap-2 rounded-[18px] border px-3 py-2.5 transition-colors active:cursor-grabbing ${
                dropTargetWidgetId === widgetId ? "border-brand/40 bg-brand/10" : "border-border-subtle bg-panel-muted"
              } ${draggedWidgetId === widgetId ? "opacity-70" : ""}`}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-content-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-content-primary">{widgetLabels[widgetId]}</p>
                <p className="mt-0.5 text-[11px] text-content-muted">{isVisible ? "Visible on map" : "Hidden from map"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onReorder(widgetId, "up")}
                  disabled={index === 0}
                  className="app-control flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorder(widgetId, "down")}
                  disabled={index === orderedWidgetIds.length - 1}
                  className="app-control flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleVisibility(widgetId)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isVisible ? "bg-brand text-brand-foreground" : "app-control"}`}
                  title={isVisible ? "Hide widget" : "Show widget"}
                >
                  {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
