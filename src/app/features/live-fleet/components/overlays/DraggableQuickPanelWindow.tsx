/* ======== IMPORTS ======== */

import { GripVertical, X } from "lucide-react";
import { ReactNode } from "react";
import { useDraggableFloatingPanel } from "../../../../components/shared/overlays/useDraggableFloatingPanel";
import type { LiveFleetQuickPanelId } from "../../providers/liveFleetWorkspace.types";
import { FloatingPanelLayoutState } from "./overlayLayout.types";

/* ======== TYPES ======== */

interface DraggableQuickPanelWindowProps {
  panelId: LiveFleetQuickPanelId;
  index: number;
  containerWidth: number;
  containerHeight: number;
  bottomPadding: number;
  rightReservedWidth: number;
  edgePadding: number;
  topReservedPadding?: number;
  panelWidth: number;
  estimatedHeight: number;
  layout: FloatingPanelLayoutState | undefined;
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
  onFocus: () => void;
  onLayoutChange: (nextLayout: Partial<FloatingPanelLayoutState>) => void;
  onClose: () => void;
}

/* ======== COMPONENT ======== */

export function DraggableQuickPanelWindow({
  panelId,
  index,
  containerWidth,
  containerHeight,
  bottomPadding,
  rightReservedWidth,
  edgePadding,
  topReservedPadding = 0,
  panelWidth,
  estimatedHeight,
  layout,
  title,
  subtitle,
  icon,
  children,
  onFocus,
  onLayoutChange,
  onClose,
}: DraggableQuickPanelWindowProps) {
  const position = layout?.position ?? null;
  const actualTopPadding = edgePadding + topReservedPadding;

  const maxRightPosition = Math.max(
    edgePadding,
    containerWidth - panelWidth - edgePadding - rightReservedWidth,
  );
  const maxBottomPosition = Math.max(
    actualTopPadding,
    containerHeight - estimatedHeight - bottomPadding,
  );

  const { handleDragPointerDown } = useDraggableFloatingPanel({
    position,
    defaultPosition: {
      x: maxRightPosition,
      y: actualTopPadding,
    },
    bounds: {
      minX: edgePadding,
      maxX: maxRightPosition,
      minY: actualTopPadding,
      maxY: maxBottomPosition,
    },
    onFocus,
    onLayoutChange,
  });

  if (!position) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto absolute"
      data-panel-id={panelId}
      style={{
        left: position.x,
        top: position.y,
        width: panelWidth,
        zIndex: 60 + (layout?.zIndex ?? index + 1),
      }}
    >
      <div className="app-overlay overflow-hidden rounded-[24px]" onPointerDown={handleDragPointerDown}>
        <div className="flex cursor-grab items-start gap-3 border-b border-border-subtle px-4 py-3 active:cursor-grabbing">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-sunken text-content-secondary">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-content-primary">{title}</h3>
            <p className="mt-1 text-[12px] text-content-muted">{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <GripVertical className="h-4 w-4 text-content-muted" />
            <button
              type="button"
              className="app-control flex h-8 w-8 items-center justify-center rounded-full"
              aria-label={`Close ${title}`}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-4 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}
