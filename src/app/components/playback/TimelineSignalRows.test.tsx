/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimelineSignalRow } from "./timelineSignalViewModel";
import { formatTimelineTooltipTimestamp, getTimelineHoverProgress, getTimelineTooltipPlacement, TimelineSignalRows } from "./TimelineSignalRows";

const speedRow: TimelineSignalRow = {
  id: "speed",
  signalId: "speed",
  label: "Speed",
  valueType: "numeric",
  visualType: "line",
  unit: "km/h",
  color: "var(--brand)",
  minValue: 0,
  maxValue: 50,
  points: [
    {
      timestampIso: "2026-03-29T08:00:00.000Z",
      progressPercent: 0,
      value: 20,
      numericValue: 20,
      label: "20 km/h",
    },
    {
      timestampIso: "2026-03-29T08:15:00.000Z",
      progressPercent: 50,
      value: 36,
      numericValue: 36,
      label: "36 km/h",
    },
  ],
};

describe("TimelineSignalRows", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("calculates hover progress from the chart track bounds", () => {
    expect(getTimelineHoverProgress(250, { left: 100, width: 300 })).toBeCloseTo(50);
    expect(getTimelineHoverProgress(25, { left: 100, width: 300 })).toBe(0);
    expect(getTimelineHoverProgress(450, { left: 100, width: 300 })).toBe(100);
  });

  it("clamps tooltip alignment near chart edges", () => {
    expect(getTimelineTooltipPlacement(4)).toEqual({ left: "0%", transform: "translateX(0)" });
    expect(getTimelineTooltipPlacement(50)).toEqual({ left: "50%", transform: "translateX(-50%)" });
    expect(getTimelineTooltipPlacement(96)).toEqual({ left: "100%", transform: "translateX(-100%)" });
  });

  it("moves the guide directly under the hovered chart track position", () => {
    render(<TimelineSignalRows rows={[speedRow]} progress={0} />);

    const track = screen.getByTestId("timeline-signal-track-speed");
    track.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 20,
        left: 100,
        top: 20,
        right: 400,
        bottom: 44,
        width: 300,
        height: 24,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.pointerMove(track, { clientX: 250 });

    expect(screen.getByTestId("timeline-signal-guide-speed")).toHaveStyle({ left: "50%" });
    expect(screen.getByText(/recorded/i)).toBeInTheDocument();
  });

  it("scrubs playback progress directly from the chart track", () => {
    const onProgressChange = vi.fn();
    const onScrubStart = vi.fn();
    const onScrubEnd = vi.fn();

    render(
      <TimelineSignalRows
        rows={[speedRow]}
        progress={0}
        onProgressChange={onProgressChange}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      />,
    );

    const track = screen.getByTestId("timeline-signal-track-speed");
    track.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 20,
        left: 100,
        top: 20,
        right: 400,
        bottom: 44,
        width: 300,
        height: 24,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.pointerDown(track, { clientX: 175, pointerId: 1 });
    fireEvent.pointerMove(document, { clientX: 250, pointerId: 1 });
    fireEvent.pointerUp(document, { clientX: 325, pointerId: 1 });

    expect(onScrubStart).toHaveBeenCalledTimes(1);
    expect(onProgressChange).toHaveBeenCalledWith(25);
    expect(onProgressChange).toHaveBeenCalledWith(50);
    expect(onProgressChange).toHaveBeenLastCalledWith(75);
    expect(onScrubEnd).toHaveBeenCalledTimes(1);
  });

  it("formats tooltip timestamps with date only when the timeline spans multiple days", () => {
    expect(formatTimelineTooltipTimestamp("2026-05-06T09:15:00.000Z", false, "UTC")).toBe("09:15");
    expect(formatTimelineTooltipTimestamp("2026-05-06T09:15:00.000Z", true, "UTC")).toContain("2026");
    expect(formatTimelineTooltipTimestamp("2026-05-06T09:15:00.000Z", false, "UTC", "12h")).toMatch(/9:15 AM/i);
  });

  it("renders repeated telemetry values without duplicate key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repeatedSpeedRow: TimelineSignalRow = {
      ...speedRow,
      points: [
        speedRow.points[0],
        {
          ...speedRow.points[0],
          progressPercent: 25,
        },
      ],
    };

    render(<TimelineSignalRows rows={[repeatedSpeedRow]} progress={0} />);

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("Encountered two children with the same key"),
      expect.anything(),
      expect.anything(),
    );
  });

  it("renders numeric line graphs without stretched sample point markers", () => {
    const changingSpeedRow: TimelineSignalRow = {
      ...speedRow,
      points: [
        speedRow.points[0],
        {
          timestampIso: "2026-03-29T08:08:00.000Z",
          progressPercent: 40,
          value: 42,
          numericValue: 42,
          label: "42 km/h",
        },
        {
          timestampIso: "2026-03-29T08:15:00.000Z",
          progressPercent: 80,
          value: 18,
          numericValue: 18,
          label: "18 km/h",
        },
      ],
    };

    const { container } = render(<TimelineSignalRows rows={[changingSpeedRow]} progress={0} />);
    const graph = container.querySelector('svg[aria-label="Speed timeline graph"]');

    expect(graph?.querySelector("polyline")).toBeInTheDocument();
    expect(graph?.querySelectorAll("circle")).toHaveLength(0);
  });
});
