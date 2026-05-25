/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DraggablePinnedVehicleWindow } from "./DraggablePinnedVehicleWindow";

describe("DraggablePinnedVehicleWindow", () => {
  afterEach(() => {
    cleanup();
  });

  it("supports resizing only while expanded", () => {
    const onLayoutChange = vi.fn();

    render(
      <DraggablePinnedVehicleWindow
        index={0}
        containerWidth={1200}
        containerHeight={900}
        bottomPadding={96}
        rightReservedWidth={72}
        edgePadding={24}
        expandedWidth={392}
        collapsedWidth={272}
        collapsedHeight={56}
        expandedHeight={520}
        layout={{ isCollapsed: false, position: { x: 600, y: 120 }, zIndex: 3 }}
        label="Atlas 12"
        badgeClassName="text-brand"
        onUnpin={() => undefined}
        onFocus={() => undefined}
        onLayoutChange={onLayoutChange}
      >
        <div>Vehicle overlay</div>
      </DraggablePinnedVehicleWindow>,
    );

    fireEvent.pointerDown(screen.getByTitle("Resize pinned overlay"), { clientY: 220 });
    fireEvent.pointerMove(window, { clientY: 280 });
    fireEvent.pointerUp(window);

    expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({ height: 580 }));
  });

  it("hides the resize handle while collapsed", () => {
    render(
      <DraggablePinnedVehicleWindow
        index={0}
        containerWidth={1200}
        containerHeight={900}
        bottomPadding={96}
        rightReservedWidth={72}
        edgePadding={24}
        expandedWidth={392}
        collapsedWidth={272}
        collapsedHeight={56}
        expandedHeight={520}
        layout={{ isCollapsed: true, position: { x: 600, y: 120 }, zIndex: 3 }}
        label="Atlas 12"
        badgeClassName="text-brand"
        onUnpin={() => undefined}
        onFocus={() => undefined}
        onLayoutChange={() => undefined}
      >
        <div>Vehicle overlay</div>
      </DraggablePinnedVehicleWindow>,
    );

    expect(screen.queryByTitle("Resize pinned overlay")).not.toBeInTheDocument();
  });
});
