/* ======== IMPORTS ======== */

import { useEffect, useRef, useState } from "react";

/* ======== TYPES ======== */

export interface OverlayViewportBounds {
  width: number;
  height: number;
}

/* ======== HOOK ======== */

export function useOverlayViewport() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportBounds, setViewportBounds] = useState<OverlayViewportBounds>({ width: 0, height: 0 });

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setViewportBounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { viewportRef, viewportBounds };
}
