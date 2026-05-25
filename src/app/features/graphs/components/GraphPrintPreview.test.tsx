/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_REPORT_SNAPSHOTS } from "../../../test-utils/reportBuilders";
import { TEST_FLEET_VEHICLES } from "../../../test-utils/vehicleBuilders";
import { GRAPH_WIDGET_CATALOG } from "../graphsDashboardModel";
import { GraphPrintPreview } from "./GraphPrintPreview";

describe("GraphPrintPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders every selected dashboard widget in print order", () => {
    render(
      <GraphPrintPreview
        dateRangeLabel="Last 7 Days"
        snapshot={TEST_REPORT_SNAPSHOTS["last-7-days"]}
        vehicles={TEST_FLEET_VEHICLES}
        selectedWidgetIds={GRAPH_WIDGET_CATALOG.map((widget) => widget.id)}
      />,
    );

    GRAPH_WIDGET_CATALOG.forEach((widget) => {
      expect(screen.getByTestId(`graph-print-widget-${widget.id}`)).toHaveTextContent(widget.title);
    });
  });

  it("prints chart widgets as static SVG graphics with visible line series", () => {
    render(
      <GraphPrintPreview
        dateRangeLabel="Last 7 Days"
        snapshot={TEST_REPORT_SNAPSHOTS["last-7-days"]}
        vehicles={TEST_FLEET_VEHICLES}
        selectedWidgetIds={["daily-activity", "speed-trend", "odometer-distance"]}
      />,
    );

    const speedTrend = screen.getByTestId("graph-print-widget-speed-trend");
    expect(within(speedTrend).getByTestId("graph-print-line-chart")).toBeInTheDocument();
    expect(within(speedTrend).getByTestId("graph-print-line-series-average")).toHaveAttribute("stroke", "#9fca16");
    expect(within(speedTrend).getByTestId("graph-print-line-series-max")).toHaveAttribute("stroke", "#ef4444");

    expect(screen.getByTestId("graph-print-widget-daily-activity")).toContainElement(
      screen.getByTestId("graph-print-daily-bars"),
    );
    expect(screen.getByTestId("graph-print-widget-odometer-distance")).toContainElement(
      screen.getByTestId("graph-print-odometer-bars"),
    );
  });

  it("prints empty states instead of zero-valued telemetry when real data is absent", () => {
    render(
      <GraphPrintPreview
        dateRangeLabel="Today"
        snapshot={{
          metrics: {
            maxSpeedKph: 0,
            maxSpeedDeltaPercent: 0,
            averageTripDurationLabel: "--",
            overspeedEvents: 0,
            overspeedDeltaPercent: 0,
            totalDistanceKm: 0,
          },
          dailyTrips: [],
          dailySpeed: [],
          speedDistribution: [],
          mostActiveVehicles: [],
        }}
        vehicles={[]}
        selectedWidgetIds={["engine-load", "odometer-distance"]}
      />,
    );

    expect(screen.getByText("No engine RPM data for this fleet.")).toBeInTheDocument();
    expect(screen.getByText("No odometer data for this fleet.")).toBeInTheDocument();
  });
});
