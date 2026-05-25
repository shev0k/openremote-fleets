/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WallDisplayTimeline } from "./WallDisplayTimeline";
import type { WallDisplayViewModel } from "./wallDisplayViewModel";

const viewModel = {
  generatedAtLabel: "12:05",
  fleet: {
    totalVehicles: 1,
    connectedVehicles: 1,
    offlineVehicles: 0,
    movingVehicles: 0,
    idlingVehicles: 0,
    parkedVehicles: 1,
    stationaryVehicles: 0,
    activeAlarmCount: 0,
    occupancyPercent: 100,
  },
  metricCards: [],
  telemetryCards: [],
  timelineItems: [
    {
      id: "veh-parked",
      vehicleName: "Atlas 12",
      plate: "BR-482-K",
      statusId: "parked",
      statusLabel: "Parked",
      statusBadgeClassName: "vehicle-status-badge vehicle-status-parked",
      statusColorClassName: "vehicle-status-text vehicle-status-parked",
      detail: "0 km/h - Mila Janssen",
      timeLabel: "1 min ago",
      tone: "info",
    },
  ],
} as unknown as WallDisplayViewModel;

describe("WallDisplayTimeline", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders vehicle cards with the shared status badge color classes", () => {
    render(<WallDisplayTimeline viewModel={viewModel} />);

    const statusBadges = screen.getAllByText("Parked");
    expect(statusBadges[0]).toHaveClass("vehicle-status-badge");
    expect(statusBadges[0]).toHaveClass("vehicle-status-parked");
  });
});
