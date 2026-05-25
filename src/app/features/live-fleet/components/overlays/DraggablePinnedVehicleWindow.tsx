/* ======== IMPORTS ======== */

import { ChevronDown, ChevronUp, GripVertical, PinOff } from "lucide-react";
import { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useDraggableFloatingPanel } from "../../../../components/shared/overlays/useDraggableFloatingPanel";
import { PinnedWindowLayoutState } from "./overlayLayout.types";
import { clamp } from "./overlayLayoutUtils";

/* ======== TYPES ======== */

interface DraggablePinnedVehicleWindowProps {
  index: number;
  containerWidth: number;
  containerHeight: number;
  bottomPadding: number;
  rightReservedWidth: number;
  edgePadding: number;
  topReservedPadding?: number;
  expandedWidth: number;
  collapsedWidth: number;
  collapsedHeight: number;
  expandedHeight: number;
  layout: PinnedWindowLayoutState | undefined;
  children: ReactNode;
  label: string;
  badgeClassName: string;
  onUnpin: () => void;
  onFocus: () => void;
  onLayoutChange: (nextLayout: Partial<PinnedWindowLayoutState>) => void;
}

/* ======== COMPONENT ======== */

export function DraggablePinnedVehicleWindow({
  index,
  containerWidth,
  containerHeight,
  bottomPadding,
  rightReservedWidth,
  edgePadding,
  topReservedPadding = 0,
  expandedWidth,
  collapsedWidth,
  collapsedHeight,
  expandedHeight,
  layout,
  children,
  label,
  badgeClassName,
  onUnpin,
  onFocus,
  onLayoutChange,
}: DraggablePinnedVehicleWindowProps) {
  const isCollapsed = layout?.isCollapsed ?? false;
  const position = layout?.position ?? null;
  const currentWidth = isCollapsed ? collapsedWidth : expandedWidth;
  const minExpandedHeight = Math.max(420, expandedHeight * 0.58);
  const maxExpandedHeight = Math.max(minExpandedHeight, containerHeight - bottomPadding - edgePadding - topReservedPadding);
  const currentHeight = isCollapsed ? collapsedHeight : clamp(layout?.height ?? expandedHeight, minExpandedHeight, maxExpandedHeight);
  const actualTopPadding = edgePadding + topReservedPadding;

  const maxRightPosition = Math.max(
    edgePadding,
    containerWidth - currentWidth - edgePadding - rightReservedWidth,
  );

  const maxBottomPosition = Math.max(actualTopPadding, containerHeight - currentHeight - bottomPadding);

  const { handleDragPointerDown } = useDraggableFloatingPanel({
    position,
    defaultPosition: {
      x: containerWidth
        ? containerWidth - currentWidth - edgePadding - rightReservedWidth - index * 22
        : edgePadding,
      y: actualTopPadding + index * 72,
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

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus();

    const startY = event.clientY;
    const initialHeight = currentHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = clamp(initialHeight + moveEvent.clientY - startY, minExpandedHeight, maxExpandedHeight);
      onLayoutChange({ height: nextHeight });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleCollapseToggle = () => {
    if (!position) {
      onLayoutChange({ isCollapsed: !isCollapsed });
      return;
    }

    const nextCollapsed = !isCollapsed;
    const nextWidth = nextCollapsed ? collapsedWidth : expandedWidth;
    const currentRightEdge = position.x + currentWidth;
    const nextPosition = {
      x: clamp(
        currentRightEdge - nextWidth,
        edgePadding,
        Math.max(edgePadding, containerWidth - nextWidth - edgePadding - rightReservedWidth),
      ),
      y: position.y,
    };

    onLayoutChange({
      isCollapsed: nextCollapsed,
      position: nextPosition,
    });
  };

  if (!position) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto absolute"
      style={{
        left: position.x,
        top: position.y,
        width: currentWidth,
        zIndex: 30 + (layout?.zIndex ?? index + 1),
      }}
    >
      <div
        className="app-overlay flex cursor-grab items-center gap-2 rounded-full px-3 py-2 active:cursor-grabbing"
        onPointerDown={handleDragPointerDown}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-content-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-content-primary">{label}</p>
        </div>
        <span className={`hidden rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] sm:inline-flex ${badgeClassName}`}>
          pinned
        </span>
        <button
          type="button"
          onClick={handleCollapseToggle}
          className="app-control flex h-8 w-8 items-center justify-center rounded-full"
          title={isCollapsed ? "Expand overlay" : "Collapse overlay"}
        >
          {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onUnpin}
          className="app-control flex h-8 w-8 items-center justify-center rounded-full"
          title="Unpin overlay"
        >
          <PinOff className="h-4 w-4" />
        </button>
      </div>

      {!isCollapsed ? (
        <div className="mt-2 max-w-[calc(100vw-2rem)]" style={{ width: currentWidth }}>
          {children}
          <div
            className="flex h-4 cursor-ns-resize items-center justify-center"
            onPointerDown={handleResizeStart}
            title="Resize pinned overlay"
          >
            <div className="flex items-center gap-1 text-content-secondary dark:text-content-muted">
              <ChevronUp className="h-3 w-3" />
              <div className="resize-indicator-track flex h-2 w-18 items-center justify-center rounded-full border border-border-strong bg-panel">
                <div className="h-1 w-12 rounded-full bg-brand" />
              </div>
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
