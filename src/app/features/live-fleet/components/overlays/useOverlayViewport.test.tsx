/* @vitest-environment jsdom */

/* ======== IMPORTS ======== */

import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOverlayViewport, type OverlayViewportBounds } from "./useOverlayViewport";

/* ======== TESTS ======== */

describe("useOverlayViewport", () => {
  let resizeCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    class ResizeObserverStub {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe() {
        return undefined;
      }

      disconnect() {
        return undefined;
      }
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resizeCallback = null;
  });

  it("publishes the observed overlay container bounds", async () => {
    const onViewportChange = vi.fn();

    function Harness() {
      const { viewportRef, viewportBounds } = useOverlayViewport();

      useEffect(() => {
        onViewportChange(viewportBounds);
      }, [viewportBounds]);

      return <div ref={viewportRef} />;
    }

    render(<Harness />);

    resizeCallback?.(
      [
        {
          contentRect: { width: 840, height: 620 },
        } as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );

    await waitFor(() => {
      expect(onViewportChange).toHaveBeenLastCalledWith({ width: 840, height: 620 } satisfies OverlayViewportBounds);
    });
  });
});
