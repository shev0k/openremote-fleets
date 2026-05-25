/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GeneratedReportPreview } from "../../../domain/models/reports";
import { ReportPreview } from "./ReportPreview";

function createChartPreview(): GeneratedReportPreview {
  return {
    request: {
      definitionId: "daily-summary",
      period: { type: "preset", preset: "today" },
      vehicleSelection: { mode: "all" },
      parameterIds: ["speed"],
      outputMode: "preview",
    },
    generatedAtIso: "2026-05-07T08:00:00Z",
    columns: [],
    rows: [],
    summary: { vehicleCount: 2 },
    metadata: {
      title: "Fleet Daily Summary",
      selectedVehiclesLabel: "All vehicles",
      periodLabel: "Today / Full day",
      filters: ["all", "today"],
    },
    sections: [
      {
        id: "distance-by-day",
        title: "Distance by day",
        kind: "chart",
        description: "Mock chart generated from compatible vehicle telemetry and Teltonika-aligned parameters.",
        chart: {
          type: "bar",
          unit: "km",
          points: [
            { label: "08:00", value: 28 },
            { label: "10:00", value: 44 },
          ],
        },
      },
    ],
  };
}

describe("ReportPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders chart bars as print-safe SVG graphics", () => {
    render(<ReportPreview preview={createChartPreview()} isLoading={false} />);

    const chart = screen.getByTestId("report-chart-distance-by-day");
    const graphics = within(chart).getAllByTestId("report-chart-bar-graphic");
    const fills = within(chart).getAllByTestId("report-chart-bar-fill");

    expect(graphics).toHaveLength(2);
    expect(graphics[0].tagName.toLowerCase()).toBe("svg");
    expect(fills).toHaveLength(2);
    expect(fills[0].tagName.toLowerCase()).toBe("rect");
    expect(fills[0]).toHaveAttribute("fill", "#9fca16");
    expect(fills[0]).toHaveAttribute("width", "63.63636363636363");
  });
});
