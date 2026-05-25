/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybackRoute } from "../../../../../../domain/models/playback";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { TripHistoryTabsWidget } from "./TripHistoryTabsWidget";

const vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "moving",
  speedKph: 52,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  heading: 92,
  lastUpdatedIso: "2026-03-29T09:12:00.000Z",
  driverName: "Mila Janssen",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 0,
} satisfies Vehicle;

const route: PlaybackRoute = {
  vehicleId: vehicle.id,
  points: [],
  tripSegments: [
    {
      id: "trip-1",
      startLabel: "08:00",
      endLabel: "08:24",
      startTimeIso: "2026-03-28T08:00:00.000Z",
      endTimeIso: "2026-03-28T08:24:00.000Z",
      durationLabel: "24 min",
      durationMinutes: 24,
      distanceLabel: "12.4 km",
      distanceKm: 12.4,
      stopCount: 1,
      maxSpeedLabel: "58 km/h",
      maxSpeedKph: 58,
      averageSpeedLabel: "31 km/h",
      averageSpeedKph: 31,
      startProgressPercent: 0,
      endProgressPercent: 100,
    },
  ],
};

describe("TripHistoryTabsWidget", () => {
  afterEach(() => {
    cleanup();
  });

  it("merges trip history and historical status behind tabs", () => {
    render(
      <TripHistoryTabsWidget
        vehicle={vehicle}
        route={route}
        historicalRoute={route}
        activeTripId="trip-1"
        isLoadingRoute={false}
        onTripSelect={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.getByRole("tab", { name: /trips/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /historical/i })).toBeInTheDocument();
    expect(screen.getByText("Trip 1")).toBeInTheDocument();
    expect(screen.getByTestId("trip-segments-panel")).not.toHaveClass("app-panel");

    fireEvent.click(screen.getByRole("tab", { name: /historical/i }));

    expect(screen.getByRole("tab", { name: /historical/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Historical status")).toBeInTheDocument();
    expect(screen.getByText("12.4 km")).toBeInTheDocument();
    expect(screen.getByTestId("historical-status-summary")).toHaveClass("grid-cols-4");
    expect(screen.getByTestId("historical-status-separator")).toBeInTheDocument();
  });

  it("shows empty states in both tab views", () => {
    render(
      <TripHistoryTabsWidget
        vehicle={vehicle}
        route={{ ...route, tripSegments: [] }}
        historicalRoute={{ ...route, tripSegments: [] }}
        activeTripId={null}
        isLoadingRoute={false}
        onTripSelect={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.getByText("No 24-hour route history available.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /historical/i }));

    expect(screen.getByText("No previous-day route history available.")).toBeInTheDocument();
  });

  it("forwards trip selection and graph actions from the trips tab", () => {
    const onTripSelect = vi.fn();
    const onOpenGraph = vi.fn();

    render(
      <TripHistoryTabsWidget
        vehicle={vehicle}
        route={route}
        historicalRoute={route}
        activeTripId={null}
        isLoadingRoute={false}
        onTripSelect={onTripSelect}
        onOpenGraph={onOpenGraph}
      />,
    );

    screen.getByRole("button", { name: /trip 1/i }).click();
    screen.getByTitle("Open segment graph").click();

    expect(onTripSelect).toHaveBeenCalledWith("trip-1");
    expect(onOpenGraph).toHaveBeenCalledWith("trip-1");
  });
});
