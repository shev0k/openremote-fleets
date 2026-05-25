/* ======== IMPORTS ======== */

import { ChevronDown, ChevronUp } from "lucide-react";
import { PointerEvent as ReactPointerEvent, ReactNode, useEffect, useRef, useState } from "react";
import type { LiveFleetWidgetId } from "../../providers/liveFleetWorkspace.types";

/* ======== TYPES ======== */

interface LiveFleetResizableWidgetShellProps {
  widgetId: LiveFleetWidgetId;
  defaultHeight: number;
  minHeight: number;
  showScrollHint?: boolean;
  storedHeight?: number;
  onHeightChange: (widgetId: LiveFleetWidgetId, height: number) => void;
  children: ReactNode;
}

/* ======== COMPONENT ======== */

export function LiveFleetResizableWidgetShell({
  widgetId,
  defaultHeight,
  minHeight,
  showScrollHint = false,
  storedHeight,
  onHeightChange,
  children,
}: LiveFleetResizableWidgetShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    setHeight(storedHeight ?? defaultHeight);
  }, [defaultHeight, storedHeight]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const initialHeight = containerRef.current?.offsetHeight ?? height ?? minHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = Math.max(minHeight, initialHeight + moveEvent.clientY - startY);
      setHeight(nextHeight);
      onHeightChange(widgetId, nextHeight);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto relative shrink-0 overflow-hidden rounded-[24px]"
      style={{ height: `${height ?? storedHeight ?? defaultHeight}px` }}
    >
      <div className="h-[calc(100%-16px)] overflow-hidden">{children}</div>
      {showScrollHint ? (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-content-muted/70">
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div
        className="absolute inset-x-0 bottom-0 flex h-4 cursor-ns-resize items-center justify-center"
        onPointerDown={handleResizeStart}
        title="Resize card"
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
  );
}
