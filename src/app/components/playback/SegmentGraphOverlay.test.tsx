/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TripSegment } from "../../../domain/models/playback";
import { SegmentGraphOverlay } from "./SegmentGraphOverlay";

function createSegment(): TripSegment {
  return {
    id: "trip-1",
    startLabel: "08:00",
    endLabel: "08:10",
    startTimeIso: "2026-05-06T08:00:00.000Z",
    endTimeIso: "2026-05-06T08:10:00.000Z",
    durationLabel: "10 min",
    durationMinutes: 10,
    distanceLabel: "4.2 km",
    distanceKm: 4.2,
    stopCount: 0,
    maxSpeedLabel: "48 km/h",
    maxSpeedKph: 48,
    averageSpeedLabel: "31 km/h",
    averageSpeedKph: 31,
    startProgressPercent: 0,
    endProgressPercent: 100,
    markers: [
      {
        id: "marker-stop",
        type: "stop",
        timestampIso: "2026-05-06T08:02:00.000Z",
        latitude: 51.44,
        longitude: 5.46,
        label: "Stop",
        durationMinutes: 4,
      },
      {
        id: "marker-signal",
        type: "signal",
        timestampIso: "2026-05-06T08:07:00.000Z",
        latitude: 51.45,
        longitude: 5.47,
        label: "Signal degraded",
      },
    ],
    telemetrySamples: [
      { signalId: "speed", timestampIso: "2026-05-06T08:00:00.000Z", value: 20, sourceAttribute: "speed" },
      { signalId: "speed", timestampIso: "2026-05-06T08:05:00.000Z", value: 40, sourceAttribute: "speed" },
      { signalId: "fuelLevel", timestampIso: "2026-05-06T08:00:00.000Z", value: 71, sourceAttribute: "fuelLevel" },
      { signalId: "fuelLevel", timestampIso: "2026-05-06T08:05:00.000Z", value: 70, sourceAttribute: "fuelLevel" },
      { signalId: "batteryLevel", timestampIso: "2026-05-06T08:00:00.000Z", value: 94, sourceAttribute: "batteryLevel" },
      { signalId: "batteryLevel", timestampIso: "2026-05-06T08:05:00.000Z", value: 93, sourceAttribute: "batteryLevel" },
      { signalId: "engineRpm", timestampIso: "2026-05-06T08:00:00.000Z", value: 1200, sourceAttribute: "engineRpm" },
      { signalId: "engineRpm", timestampIso: "2026-05-06T08:05:00.000Z", value: 1800, sourceAttribute: "engineRpm" },
      { signalId: "gnssHdop", timestampIso: "2026-05-06T08:00:00.000Z", value: 0.8, sourceAttribute: "gnssHdop" },
      { signalId: "gnssHdop", timestampIso: "2026-05-06T08:05:00.000Z", value: 1, sourceAttribute: "gnssHdop" },
      { signalId: "ignition", timestampIso: "2026-05-06T08:00:00.000Z", value: true, sourceAttribute: "ignition" },
      { signalId: "movement", timestampIso: "2026-05-06T08:00:00.000Z", value: true, sourceAttribute: "movement" },
      {
        signalId: "alarm",
        timestampIso: "2026-05-06T08:05:00.000Z",
        value: { eventType: "normal", severity: "info" },
        sourceAttribute: "alarm",
      },
    ],
    eventMarkers: [
      {
        id: "alarm-marker",
        eventType: "alarm",
        timestampIso: "2026-05-06T08:05:00.000Z",
        label: "Fuel warning",
        severity: "warning",
        sourceAttribute: "fuelLevel",
      },
    ],
  };
}

describe("SegmentGraphOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults to the Teltonika-aligned numeric segment signals without rendering a duplicate legend", async () => {
    render(<SegmentGraphOverlay isOpen segment={createSegment()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("timeline-signal-track-speed")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-signal-track-fuelLevel")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-signal-track-batteryLevel")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-signal-track-engineRpm")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-signal-track-gnssHdop")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("timeline-signal-track-ignition")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timeline-signal-track-movement")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timeline-signal-track-alarm")).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^Speed$/)).toHaveLength(2);
  });

  it("updates the guide and dynamic signal button values on hover without clicking", async () => {
    render(<SegmentGraphOverlay isOpen segment={createSegment()} onClose={vi.fn()} />);

    const speedTrack = await screen.findByTestId("timeline-signal-track-speed");
    speedTrack.getBoundingClientRect = () =>
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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /speed 20 km\/h/i })).toBeInTheDocument();
    });

    fireEvent.pointerMove(speedTrack, { clientX: 250 });

    await waitFor(() => {
      expect(screen.getByTestId("timeline-signal-guide-speed")).toHaveStyle({ left: "50%" });
      expect(screen.getByRole("button", { name: /speed 40 km\/h/i })).toBeInTheDocument();
    });

    fireEvent.pointerLeave(screen.getByTestId("segment-graph-signal-rows"));

    expect(screen.getByTestId("timeline-signal-guide-speed")).toHaveStyle({ left: "50%" });
    expect(screen.getByRole("button", { name: /speed 40 km\/h/i })).toBeInTheDocument();
  });

  it("shows icons in compact segment metric cards without hiding labels and values", () => {
    render(<SegmentGraphOverlay isOpen segment={createSegment()} onClose={vi.fn()} />);

    expect(screen.getByTestId("segment-graph-metric-start-icon")).toBeInTheDocument();
    expect(screen.getByTestId("segment-graph-metric-averageSpeed-icon")).toBeInTheDocument();
    expect(screen.getByText("Average speed")).toBeInTheDocument();
    expect(screen.getByText("31 km/h")).toBeInTheDocument();
    expect(screen.getByText("Max speed")).toBeInTheDocument();
    expect(screen.getByText("48 km/h")).toBeInTheDocument();
  });

  it("uses a wider dialog so metric and signal controls fit in one row", () => {
    render(<SegmentGraphOverlay isOpen segment={createSegment()} onClose={vi.fn()} />);

    expect(screen.getByText("Segment Graph").closest(".app-overlay")).toHaveClass("max-w-6xl");
  });

  it("lists route marker policy events alongside alarms", () => {
    render(<SegmentGraphOverlay isOpen segment={createSegment()} onClose={vi.fn()} />);

    expect(screen.getByText("3 markers")).toBeInTheDocument();
    expect(screen.getByText("Stop · 4 min")).toBeInTheDocument();
    expect(screen.getByText("Signal degraded")).toBeInTheDocument();
  });

  it("preserves user-selected signal mode when the same segment id refreshes", async () => {
    const { rerender } = render(<SegmentGraphOverlay isOpen segment={createSegment()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("timeline-signal-track-speed")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Single" }));
    fireEvent.click(screen.getByRole("button", { name: "Ignition" }));

    await waitFor(() => {
      expect(screen.getByTestId("timeline-signal-track-ignition")).toBeInTheDocument();
      expect(screen.queryByTestId("timeline-signal-track-speed")).not.toBeInTheDocument();
    });

    rerender(<SegmentGraphOverlay isOpen segment={{ ...createSegment(), averageSpeedLabel: "32 km/h" }} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Single" })).toHaveClass("bg-brand");
    expect(screen.getByTestId("timeline-signal-track-ignition")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline-signal-track-speed")).not.toBeInTheDocument();
  });
});
