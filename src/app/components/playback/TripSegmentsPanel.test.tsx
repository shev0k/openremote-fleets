/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TripSegment } from "../../../domain/models/playback";
import { TripSegmentsPanel } from "./TripSegmentsPanel";

function createTrip(index: number, startTimeIso = "2026-05-04T08:12:00.000Z", endLabel = "08:47"): TripSegment {
  return {
    id: `trip-${index}`,
    startLabel: startTimeIso.slice(11, 16),
    endLabel,
    startTimeIso,
    endTimeIso: "2026-05-04T08:47:00.000Z",
    durationLabel: "35 min",
    durationMinutes: 35,
    distanceLabel: "4.2 km",
    distanceKm: 4.2,
    stopCount: 1,
    maxSpeedLabel: "48 km/h",
    maxSpeedKph: 48,
    averageSpeedLabel: "22 km/h",
    averageSpeedKph: 22,
    startProgressPercent: 0,
    endProgressPercent: 100,
  };
}

describe("TripSegmentsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows trip dates inline with the trip number and time range when enabled", () => {
    render(
      <TripSegmentsPanel
        trips={[createTrip(1), createTrip(2, "2026-04-30T07:22:00.000Z", "07:43")]}
        activeTripId="trip-2"
        onTripSelect={() => undefined}
        onOpenGraph={() => undefined}
        emptyState="No trips"
        showTripDates
      />,
    );

    expect(screen.getByTestId("trip-header-trip-2").textContent).toBe("Trip 2•07:22 to 07:43•April 30, 2026");
  });

  it("keeps trip dates hidden for single-day presets", () => {
    render(
      <TripSegmentsPanel
        trips={[createTrip(1)]}
        activeTripId="trip-1"
        onTripSelect={() => undefined}
        onOpenGraph={() => undefined}
        emptyState="No trips"
      />,
    );

    expect(screen.queryByText("May 4, 2026")).toBeNull();
  });

  it("labels each card with the actual trip number", () => {
    render(
      <TripSegmentsPanel
        trips={Array.from({ length: 12 }, (_, index) => createTrip(index + 1))}
        activeTripId="trip-12"
        onTripSelect={() => undefined}
        onOpenGraph={() => undefined}
        emptyState="No trips"
      />,
    );

    expect(screen.getByText("Trip 12")).toBeTruthy();
  });

  it("aligns the trip title and time range as one baseline text group", () => {
    render(
      <TripSegmentsPanel
        trips={[createTrip(1)]}
        activeTripId="trip-1"
        onTripSelect={() => undefined}
        onOpenGraph={() => undefined}
        emptyState="No trips"
      />,
    );

    const tripHeader = screen.getByTestId("trip-header-trip-1");
    const titleSeparator = screen.getByTestId("trip-title-separator-trip-1");

    expect(tripHeader).toHaveClass("items-baseline");
    expect(tripHeader).not.toHaveClass("items-center");
    expect(titleSeparator).toHaveClass("self-baseline");
    expect(titleSeparator).toHaveClass("text-[12px]");
    expect(titleSeparator).toHaveClass("leading-[1.2]");
  });

  it("shows the loaded trip count in the header subtitle row", () => {
    render(
      <TripSegmentsPanel
        subtitle="Today"
        trips={[createTrip(1), createTrip(2)]}
        activeTripId="trip-1"
        onTripSelect={() => undefined}
        onOpenGraph={() => undefined}
        emptyState="No trips"
      />,
    );

    expect(screen.getByTestId("trip-segments-subtitle-row").textContent).toBe("Today•2 trips loaded");
  });
});
