/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybackRoute } from "../../../domain/models/playback";
import { PlaybackTimelineDock } from "./PlaybackTimelineDock";

class ResizeObserverTestDouble {
  static lastCallback: ResizeObserverCallback | null = null;

  constructor(callback: ResizeObserverCallback) {
    ResizeObserverTestDouble.lastCallback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverTestDouble as unknown as typeof ResizeObserver;

const route: PlaybackRoute = {
  vehicleId: "veh-atlas-12",
  points: [
    {
      latitude: 51.44,
      longitude: 5.45,
      timestampIso: "2026-03-29T08:00:00.000Z",
      speedKph: 20,
    },
    {
      latitude: 51.45,
      longitude: 5.49,
      timestampIso: "2026-03-29T08:30:00.000Z",
      speedKph: 42,
    },
  ],
  tripSegments: [],
};

const routeWithSignals: PlaybackRoute = {
  ...route,
  tripSegments: [
    {
      id: "trip-1",
      startLabel: "08:00",
      endLabel: "08:30",
      startTimeIso: "2026-03-29T08:00:00.000Z",
      endTimeIso: "2026-03-29T08:30:00.000Z",
      durationLabel: "30 min",
      durationMinutes: 30,
      distanceLabel: "6.2 km",
      distanceKm: 6.2,
      stopCount: 0,
      maxSpeedLabel: "42 km/h",
      maxSpeedKph: 42,
      averageSpeedLabel: "31 km/h",
      averageSpeedKph: 31,
      startProgressPercent: 0,
      endProgressPercent: 100,
      telemetrySamples: [
        { signalId: "speed", timestampIso: "2026-03-29T08:00:00.000Z", value: 20, sourceAttribute: "speed" },
        { signalId: "speed", timestampIso: "2026-03-29T08:15:00.000Z", value: 36, sourceAttribute: "speed" },
        { signalId: "ignition", timestampIso: "2026-03-29T08:00:00.000Z", value: true, sourceAttribute: "ignition" },
        { signalId: "movement", timestampIso: "2026-03-29T08:00:00.000Z", value: true, sourceAttribute: "movement" },
        {
          signalId: "alarm",
          timestampIso: "2026-03-29T08:00:00.000Z",
          value: { eventType: "alarm", severity: "warning" },
          sourceAttribute: "alarm",
        },
      ],
    },
  ],
};

function renderTimeline(onProgressChange = vi.fn()) {
  render(
    <PlaybackTimelineDock
      route={route}
      progress={25}
      isPlaying={false}
      playbackSpeed={1}
      currentSpeedKph={24}
      onProgressChange={onProgressChange}
      onPlayPause={vi.fn()}
      onRewind={vi.fn()}
      onFastForward={vi.fn()}
      onPlaybackSpeedChange={vi.fn()}
    />,
  );

  const slider = screen.getByRole("slider", { name: /route timeline/i });
  slider.getBoundingClientRect = () =>
    ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 410,
      bottom: 28,
      width: 400,
      height: 8,
      toJSON: () => ({}),
    }) as DOMRect;

  return { slider, onProgressChange };
}

describe("PlaybackTimelineDock", () => {
  afterEach(() => {
    cleanup();
  });

  it("scrubs progress continuously while dragging the timeline handle", () => {
    const { slider, onProgressChange } = renderTimeline();

    fireEvent.pointerDown(slider, { clientX: 110, pointerId: 1 });
    fireEvent.pointerMove(document, { clientX: 210, pointerId: 1 });
    fireEvent.pointerMove(document, { clientX: 310, pointerId: 1 });
    fireEvent.pointerUp(document, { clientX: 350, pointerId: 1 });

    expect(onProgressChange).toHaveBeenCalledWith(25);
    expect(onProgressChange).toHaveBeenCalledWith(50);
    expect(onProgressChange).toHaveBeenCalledWith(75);
    expect(onProgressChange).toHaveBeenLastCalledWith(85);
  });

  it("notifies parents when timeline scrubbing starts and ends", () => {
    const onProgressChange = vi.fn();
    const onScrubStart = vi.fn();
    const onScrubEnd = vi.fn();

    render(
      <PlaybackTimelineDock
        route={route}
        progress={25}
        isPlaying={true}
        playbackSpeed={1}
        currentSpeedKph={24}
        onProgressChange={onProgressChange}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      />,
    );

    const slider = screen.getByRole("slider", { name: /route timeline/i });
    slider.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        right: 410,
        bottom: 28,
        width: 400,
        height: 8,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.pointerDown(slider, { clientX: 110, pointerId: 1 });
    fireEvent.pointerUp(document, { clientX: 210, pointerId: 1 });

    expect(onScrubStart).toHaveBeenCalledTimes(1);
    expect(onScrubEnd).toHaveBeenCalledTimes(1);
  });

  it("can keep signal rows collapsed until the user opens them", () => {
    render(
      <PlaybackTimelineDock
        route={routeWithSignals}
        progress={50}
        isPlaying={false}
        playbackSpeed={1}
        currentSpeedKph={36}
        onProgressChange={vi.fn()}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
        defaultSignalsVisible={false}
      />,
    );

    expect(screen.getByRole("button", { name: /show signals/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /speed 36 km\/h/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /show signals/i }));

    expect(screen.getByTestId("timeline-compact-row")).toBeTruthy();
    expect(screen.getAllByText("Speed").length).toBeGreaterThan(0);
    expect(screen.getByTestId("timeline-signal-guide-speed")).toHaveStyle({ left: "50%" });
  });

  it("shows current signal values in selector buttons", () => {
    render(
      <PlaybackTimelineDock
        route={routeWithSignals}
        progress={50}
        isPlaying={true}
        playbackSpeed={1}
        currentSpeedKph={36}
        onProgressChange={vi.fn()}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /speed 36 km\/h/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /single/i })).toHaveClass("text-brand-foreground");
    expect(screen.getByTestId("timeline-compact-row")).toBeTruthy();
  });

  it("keeps signal buttons in the control row with the mode selector on the right", () => {
    render(
      <PlaybackTimelineDock
        route={routeWithSignals}
        progress={50}
        isPlaying={true}
        playbackSpeed={1}
        currentSpeedKph={36}
        onProgressChange={vi.fn()}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
      />,
    );

    const controlRow = screen.getByTestId("timeline-signal-selector-controls");
    const rowText = controlRow.textContent ?? "";

    expect(screen.getAllByText("Signals")).toHaveLength(1);
    expect(rowText.indexOf("Speed")).toBeGreaterThan(-1);
    expect(rowText.indexOf("Single")).toBeGreaterThan(rowText.indexOf("Speed"));
    expect(rowText).toContain("Single");
    expect(rowText).toContain("Multi");
    expect(screen.getByTestId("timeline-signal-rows")).toHaveClass("mt-4");
  });

  it("lets signal charts control playback progress", () => {
    const onProgressChange = vi.fn();
    const onScrubStart = vi.fn();
    const onScrubEnd = vi.fn();

    render(
      <PlaybackTimelineDock
        route={routeWithSignals}
        progress={0}
        isPlaying={false}
        playbackSpeed={1}
        currentSpeedKph={20}
        onProgressChange={onProgressChange}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      />,
    );

    const chartTrack = screen.getByTestId("timeline-signal-track-speed");
    chartTrack.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 20,
        left: 100,
        top: 20,
        right: 500,
        bottom: 44,
        width: 400,
        height: 24,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.pointerDown(chartTrack, { clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(document, { clientX: 400, pointerId: 1 });
    fireEvent.pointerUp(document, { clientX: 500, pointerId: 1 });

    expect(onScrubStart).toHaveBeenCalledTimes(1);
    expect(onProgressChange).toHaveBeenCalledWith(50);
    expect(onProgressChange).toHaveBeenCalledWith(75);
    expect(onProgressChange).toHaveBeenLastCalledWith(100);
    expect(onScrubEnd).toHaveBeenCalledTimes(1);
  });

  it("keeps time and speed after the playback speed selector in the compact signal row", () => {
    render(
      <PlaybackTimelineDock
        route={routeWithSignals}
        progress={50}
        isPlaying={true}
        playbackSpeed={1}
        currentSpeedKph={36}
        onProgressChange={vi.fn()}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
      />,
    );

    const compactRow = screen.getByTestId("timeline-compact-row");
    const text = compactRow.textContent ?? "";

    expect(text.indexOf("1x")).toBeGreaterThan(-1);
    expect(text.indexOf("Time")).toBeGreaterThan(text.indexOf("1x"));
    expect(text.indexOf("Speed")).toBeGreaterThan(text.indexOf("1x"));
  });

  it("only shows current values in selector buttons for value-oriented signals", () => {
    render(
      <PlaybackTimelineDock
        route={routeWithSignals}
        progress={50}
        isPlaying={true}
        playbackSpeed={1}
        currentSpeedKph={36}
        onProgressChange={vi.fn()}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /speed 36 km\/h/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^ignition$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^movement$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^alarms$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /ignition on/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /movement moving/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /alarms alarm/i })).toBeNull();
  });

  it("reports timeline height changes to the parent layout", () => {
    const onHeightChange = vi.fn();

    render(
      <PlaybackTimelineDock
        route={routeWithSignals}
        progress={50}
        isPlaying={false}
        playbackSpeed={1}
        currentSpeedKph={36}
        onProgressChange={vi.fn()}
        onPlayPause={vi.fn()}
        onRewind={vi.fn()}
        onFastForward={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
        onHeightChange={onHeightChange}
      />,
    );

    ResizeObserverTestDouble.lastCallback?.([
      {
        contentRect: {
          width: 900,
          height: 288,
        } as DOMRectReadOnly,
      } as ResizeObserverEntry,
    ], {} as ResizeObserver);

    expect(onHeightChange).toHaveBeenCalledWith(288);
  });
});
