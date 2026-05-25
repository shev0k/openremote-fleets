import { PointerEvent as ReactPointerEvent, useCallback, useEffect } from "react";
import {
  clampPosition,
  isSamePosition,
  type FloatingPanelBounds,
  type FloatingPanelPosition,
} from "./floatingPanelMath";

interface UseDraggableFloatingPanelOptions {
  position: FloatingPanelPosition | null;
  defaultPosition: FloatingPanelPosition;
  bounds: FloatingPanelBounds;
  onFocus: () => void;
  onLayoutChange: (nextLayout: { position: FloatingPanelPosition }) => void;
}

export function useDraggableFloatingPanel({
  position,
  defaultPosition,
  bounds,
  onFocus,
  onLayoutChange,
}: UseDraggableFloatingPanelOptions) {
  const { minX, maxX, minY, maxY } = bounds;
  const { x: defaultX, y: defaultY } = defaultPosition;

  useEffect(() => {
    const nextPosition = clampPosition(position ?? defaultPosition, bounds);
    if (!position || !isSamePosition(position, nextPosition)) {
      onLayoutChange({ position: nextPosition });
    }
  }, [bounds, defaultPosition, defaultX, defaultY, maxX, maxY, minX, minY, onLayoutChange, position]);

  const handleDragPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest("button")) {
        return;
      }

      onFocus();

      const startX = event.clientX;
      const startY = event.clientY;
      const initialPosition = position ?? clampPosition(defaultPosition, bounds);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        onLayoutChange({
          position: clampPosition(
            {
              x: initialPosition.x + moveEvent.clientX - startX,
              y: initialPosition.y + moveEvent.clientY - startY,
            },
            bounds,
          ),
        });
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [bounds, defaultPosition, onFocus, onLayoutChange, position],
  );

  return { handleDragPointerDown };
}
