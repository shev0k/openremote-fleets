/* @vitest-environment jsdom */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDraggableFloatingPanel } from "./useDraggableFloatingPanel";

describe("useDraggableFloatingPanel", () => {
  it("initializes and clamps floating panel positions", () => {
    const onLayoutChange = vi.fn();

    renderHook(() =>
      useDraggableFloatingPanel({
        position: null,
        defaultPosition: { x: 880, y: 12 },
        bounds: { minX: 24, maxX: 560, minY: 48, maxY: 420 },
        onFocus: vi.fn(),
        onLayoutChange,
      }),
    );

    expect(onLayoutChange).toHaveBeenCalledWith({ position: { x: 560, y: 48 } });
  });

  it("clamps existing positions when bounds change", () => {
    const onLayoutChange = vi.fn();

    renderHook(() =>
      useDraggableFloatingPanel({
        position: { x: 700, y: 10 },
        defaultPosition: { x: 100, y: 100 },
        bounds: { minX: 24, maxX: 560, minY: 48, maxY: 420 },
        onFocus: vi.fn(),
        onLayoutChange,
      }),
    );

    expect(onLayoutChange).toHaveBeenCalledWith({ position: { x: 560, y: 48 } });
  });

  it("updates layout from pointer drag while ignoring button targets", () => {
    const onFocus = vi.fn();
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useDraggableFloatingPanel({
        position: { x: 100, y: 120 },
        defaultPosition: { x: 100, y: 120 },
        bounds: { minX: 24, maxX: 560, minY: 48, maxY: 420 },
        onFocus,
        onLayoutChange,
      }),
    );

    const button = document.createElement("button");
    result.current.handleDragPointerDown({
      target: button,
      clientX: 10,
      clientY: 20,
    } as unknown as React.PointerEvent<HTMLElement>);

    expect(onFocus).not.toHaveBeenCalled();

    const target = document.createElement("div");
    result.current.handleDragPointerDown({
      target,
      clientX: 10,
      clientY: 20,
    } as unknown as React.PointerEvent<HTMLElement>);
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 40, clientY: 80 }));
    window.dispatchEvent(new PointerEvent("pointerup"));

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onLayoutChange).toHaveBeenLastCalledWith({ position: { x: 130, y: 180 } });
  });
});
