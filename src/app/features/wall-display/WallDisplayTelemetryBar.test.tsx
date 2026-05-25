/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WallDisplayTelemetryBar } from "./WallDisplayTelemetryBar";
import { WallDisplayViewModel } from "./wallDisplayViewModel";

const viewModel: WallDisplayViewModel = {
  generatedAtLabel: "12:05",
  fleet: {
    totalVehicles: 3,
    connectedVehicles: 2,
    offlineVehicles: 1,
    movingVehicles: 1,
    idlingVehicles: 1,
    parkedVehicles: 0,
    stationaryVehicles: 0,
    activeAlarmCount: 1,
    occupancyPercent: 67,
  },
  metricCards: [
    { id: "mileage", label: "Mileage today", value: "35.0 km", detail: "Trip odometer total", tone: "brand" },
    { id: "alarms", label: "Active alarms", value: "1", detail: "Needs attention", tone: "danger" },
  ],
  telemetryCards: [
    { id: "fuel", label: "Fuel", value: "50%", detail: "Average tank level", tone: "brand" },
    { id: "battery", label: "Battery", value: "75%", detail: "Tracker battery", tone: "brand" },
    { id: "gnss", label: "GNSS", value: "1.1 HDOP", detail: "Lower is better", tone: "info" },
  ],
  timelineItems: [],
};

describe("WallDisplayTelemetryBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders telemetry as one auto-scrolling ticker row with configure and section scale controls", () => {
    render(<WallDisplayTelemetryBar viewModel={viewModel} />);

    expect(screen.getByTestId("wall-display-telemetry-ticker")).toBeInTheDocument();
    expect(screen.getAllByTestId("wall-display-telemetry-card-mileage").length).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: /configure telemetry/i })).toBeInTheDocument();
    expect(screen.getByTitle("Scale telemetry section")).toBeInTheDocument();
    expect(screen.getByTestId("wall-display-telemetry-scale-frame").getAttribute("style")).toContain("--wall-display-telemetry-scale: 1");
    expect(screen.getByText("Updated 12:05")).toBeInTheDocument();
  });

  it("allows telemetry items to be hidden and reordered", () => {
    render(<WallDisplayTelemetryBar viewModel={viewModel} />);

    fireEvent.click(screen.getByRole("button", { name: /configure telemetry/i }));
    const panel = screen.getByTestId("wall-display-telemetry-config");
    expect(panel).toHaveClass("h-[560px]");
    expect(panel).toHaveClass("max-h-[calc(100vh-160px)]");

    fireEvent.click(within(panel).getByTitle("Hide Fuel"));
    expect(screen.queryByTestId("wall-display-telemetry-card-fuel")).not.toBeInTheDocument();

    fireEvent.click(within(panel).getByTitle("Move GNSS up"));
    fireEvent.click(within(panel).getByTitle("Move GNSS up"));
    fireEvent.click(within(panel).getByTitle("Move GNSS up"));
    fireEvent.click(within(panel).getByTitle("Move GNSS up"));
    const visibleCards = screen.getAllByTestId(/^wall-display-telemetry-card-/);
    expect(visibleCards[0]).toHaveAttribute("data-card-id", "gnss");
  });

  it("allows telemetry rows to be reordered by drag and drop", () => {
    render(<WallDisplayTelemetryBar viewModel={viewModel} />);

    fireEvent.click(screen.getByRole("button", { name: /configure telemetry/i }));
    const panel = screen.getByTestId("wall-display-telemetry-config");
    const mileageRow = within(panel).getByTestId("wall-display-telemetry-config-row-mileage");
    const gnssRow = within(panel).getByTestId("wall-display-telemetry-config-row-gnss");

    fireEvent.dragStart(gnssRow);
    fireEvent.dragOver(mileageRow);
    fireEvent.drop(mileageRow);

    const visibleCards = screen.getAllByTestId(/^wall-display-telemetry-card-/);
    expect(visibleCards[0]).toHaveAttribute("data-card-id", "gnss");
  });

  it("shows an empty state when every telemetry metric is hidden", () => {
    render(<WallDisplayTelemetryBar viewModel={viewModel} />);

    fireEvent.click(screen.getByRole("button", { name: /configure telemetry/i }));
    const panel = screen.getByTestId("wall-display-telemetry-config");

    for (const card of [...viewModel.metricCards, ...viewModel.telemetryCards]) {
      fireEvent.click(within(panel).getByTitle(`Hide ${card.label}`));
    }

    expect(screen.queryAllByTestId(/^wall-display-telemetry-card-/)).toHaveLength(0);
    expect(screen.getByTestId("wall-display-telemetry-empty")).toHaveTextContent("No telemetry metrics visible");
  });
});
