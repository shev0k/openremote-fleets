/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { attachMapSizeInvalidation } from "./mapLifecycle";

describe("map lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("invalidates map size after mount and on container resize", () => {
    vi.useFakeTimers();
    const invalidateSize = vi.fn();
    const observe = vi.fn();
    const disconnect = vi.fn();
    const container = document.createElement("div");
    let resizeCallback: ResizeObserverCallback | null = null;

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
    }

    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    const cleanup = attachMapSizeInvalidation({ invalidateSize }, container);

    vi.advanceTimersByTime(180);
    expect(invalidateSize).toHaveBeenCalled();
    expect(observe).toHaveBeenCalledWith(container);

    const callsAfterMount = invalidateSize.mock.calls.length;
    expect(resizeCallback).not.toBeNull();
    const triggerResize = resizeCallback as unknown as ResizeObserverCallback;
    triggerResize([], {} as ResizeObserver);
    expect(invalidateSize.mock.calls.length).toBeGreaterThan(callsAfterMount);

    cleanup();
    expect(disconnect).toHaveBeenCalled();
  });
});
