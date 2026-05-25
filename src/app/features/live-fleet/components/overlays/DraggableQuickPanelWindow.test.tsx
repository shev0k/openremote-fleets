/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BellRing } from "lucide-react";
import { DraggableQuickPanelWindow } from "./DraggableQuickPanelWindow";

describe("DraggableQuickPanelWindow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a direct close button in the floating panel header", () => {
    const onClose = vi.fn();

    render(
      <DraggableQuickPanelWindow
        panelId="alerts"
        index={0}
        containerWidth={900}
        containerHeight={700}
        bottomPadding={24}
        rightReservedWidth={0}
        edgePadding={24}
        panelWidth={320}
        estimatedHeight={392}
        layout={{ position: { x: 120, y: 80 }, zIndex: 1 }}
        title="Alerts stream"
        subtitle="High-signal alerts without leaving the map."
        icon={<BellRing className="h-4 w-4" />}
        onFocus={() => undefined}
        onLayoutChange={() => undefined}
        onClose={onClose}
      >
        <div>Panel content</div>
      </DraggableQuickPanelWindow>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close alerts stream/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
