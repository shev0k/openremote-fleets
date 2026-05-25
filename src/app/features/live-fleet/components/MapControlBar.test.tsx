/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MapControlBar } from "./MapControlBar";

describe("MapControlBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("forwards map-type selection and control actions", () => {
    const onMapTypeChange = vi.fn();
    const onWorkspaceToggle = vi.fn();
    const onTimelineToggle = vi.fn();
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onResetView = vi.fn();

    render(
      <MapControlBar
        mapType="default"
        isWorkspaceOpen={false}
        isTimelineVisible={true}
        isTimelineEnabled={true}
        onMapTypeChange={onMapTypeChange}
        onWorkspaceToggle={onWorkspaceToggle}
        onTimelineToggle={onTimelineToggle}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />,
    );

    fireEvent.click(screen.getByTitle("Toggle workspace panels"));
    fireEvent.click(screen.getByRole("button", { name: /toggle timeline/i }));
    fireEvent.click(screen.getByRole("button", { name: /change map layer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Terrain" }));
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    fireEvent.click(screen.getByRole("button", { name: /zoom out/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset view/i }));

    expect(onWorkspaceToggle).toHaveBeenCalledTimes(1);
    expect(onTimelineToggle).toHaveBeenCalledTimes(1);
    expect(onMapTypeChange).toHaveBeenCalledWith("terrain");
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onResetView).toHaveBeenCalledTimes(1);
  });

  it("shows simulation speed controls only when provided", () => {
    const onSimulationSpeedChange = vi.fn();

    render(
      <MapControlBar
        mapType="default"
        isWorkspaceOpen={false}
        isTimelineVisible={true}
        isTimelineEnabled={true}
        simulationSpeed={1}
        onSimulationSpeedChange={onSimulationSpeedChange}
        onMapTypeChange={vi.fn()}
        onWorkspaceToggle={vi.fn()}
        onTimelineToggle={vi.fn()}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onResetView={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /simulation speed/i }));
    fireEvent.click(screen.getByRole("button", { name: "4x" }));

    expect(onSimulationSpeedChange).toHaveBeenCalledWith(4);
  });
});
