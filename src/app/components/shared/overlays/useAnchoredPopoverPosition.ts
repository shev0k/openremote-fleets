import { CSSProperties, RefObject, useEffect, useState } from "react";

interface UseAnchoredPopoverPositionOptions {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  width?: number;
  align?: "start" | "end";
  offsetPx?: number;
  viewportPaddingPx?: number;
}

export function useAnchoredPopoverPosition({
  isOpen,
  anchorRef,
  popoverRef,
  onClose,
  width = 288,
  align = "start",
  offsetPx = 8,
  viewportPaddingPx = 16,
}: UseAnchoredPopoverPositionOptions): CSSProperties | null {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStyle(null);
      return;
    }

    const handleDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, [anchorRef, isOpen, onClose, popoverRef]);

  useEffect(() => {
    if (!isOpen) {
      setStyle(null);
      return;
    }

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const resolvedWidth = Math.min(width, window.innerWidth - viewportPaddingPx * 2);
      const preferredLeft = align === "end" ? rect.right - resolvedWidth : rect.left;
      const clampedLeft = Math.min(
        window.innerWidth - resolvedWidth - viewportPaddingPx,
        Math.max(viewportPaddingPx, preferredLeft),
      );

      setStyle({
        position: "fixed",
        top: rect.bottom + offsetPx,
        left: clampedLeft,
        width: resolvedWidth,
        maxWidth: `calc(100vw - ${viewportPaddingPx * 2}px)`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, isOpen, offsetPx, viewportPaddingPx, width]);

  return style;
}
