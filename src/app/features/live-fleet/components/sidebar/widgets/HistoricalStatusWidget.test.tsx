/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybackRoute } from "../../../../../../domain/models/playback";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { HistoricalStatusWidget } from "./HistoricalStatusWidget";

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
      endProgressPercent: 42,
      eventMarkers: [{ id: "alarm-1", eventType: "alarm", timestampIso: "2026-03-28T08:12:00.000Z", label: "Fuel warning" }],
    },
    {
      id: "trip-2",
      startLabel: "09:00",
      endLabel: "09:18",
      startTimeIso: "2026-03-28T09:00:00.000Z",
      endTimeIso: "2026-03-28T09:18:00.000Z",
      durationLabel: "18 min",
      durationMinutes: 18,
      distanceLabel: "8.1 km",
      distanceKm: 8.1,
      stopCount: 0,
      maxSpeedLabel: "42 km/h",
      maxSpeedKph: 42,
      averageSpeedLabel: "27 km/h",
      averageSpeedKph: 27,
      startProgressPercent: 42,
      endProgressPercent: 100,
    },
  ],
};

describe("HistoricalStatusWidget", () => {
  afterEach(() => {
    cleanup();
  });

  it("summarizes previous-day route activity and can focus a trip", () => {
    const onTripSelect = vi.fn();

    render(<HistoricalStatusWidget vehicle={vehicle} route={route} onTripSelect={onTripSelect} />);

    expect(screen.getByText("Historical status")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("2 trips")).toBeInTheDocument();
    expect(screen.getByText("20.5 km")).toBeInTheDocument();
    expect(screen.getByText("1 alarm")).toBeInTheDocument();

    screen.getByRole("button", { name: /08:00 to 08:24/i }).click();

    expect(onTripSelect).toHaveBeenCalledWith("trip-1");
  });

  it("renders embedded summary cards with vehicle-overlay style icon label rows", () => {
    render(<HistoricalStatusWidget vehicle={vehicle} route={route} isEmbedded />);

    const summaryCards = screen.getAllByTestId("historical-status-summary-card");
    expect(summaryCards).toHaveLength(4);

    summaryCards.forEach((card) => {
      const labelRow = card.querySelector("[data-testid='historical-status-summary-label-row']");
      expect(labelRow?.querySelector("svg")).toBeInTheDocument();
      expect(labelRow).toHaveClass("gap-1");
      expect(card).toHaveClass("px-2.5", "py-2");
    });
  });
});
