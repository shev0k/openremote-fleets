import { describe, expect, it } from "vitest";
import { TEST_REPORT_SNAPSHOTS } from "../../test-utils/reportBuilders";
import { TEST_FLEET_VEHICLES } from "../../test-utils/vehicleBuilders";
import { createGraphDashboardExportFiles } from "./graphExportService";

describe("graph export service", () => {
  it("creates concrete CSV and JSON dashboard export files for the selected widgets", () => {
    const files = createGraphDashboardExportFiles({
      dateRangeLabel: "Last 7 Days",
      snapshot: TEST_REPORT_SNAPSHOTS["last-7-days"],
      vehicles: TEST_FLEET_VEHICLES,
      selectedWidgetIds: ["fleet-kpis", "tracker-health", "fuel-battery"],
      formats: ["csv", "json"],
      fileName: "fleet-graphs-last-7-days",
    });

    expect(files.map((file) => file.fileName)).toEqual([
      "fleet-graphs-last-7-days.csv",
      "fleet-graphs-last-7-days.json",
    ]);
    expect(files.find((file) => file.format === "csv")?.text).toContain("Selected Widgets");
    expect(files.find((file) => file.format === "csv")?.text).toContain("Tracker Health");
    expect(files.find((file) => file.format === "csv")?.text).toContain("Delta 24");
    expect(files.find((file) => file.format === "json")?.text).toContain('"dateRangeLabel": "Last 7 Days"');
    expect(files.find((file) => file.format === "json")?.text).toContain('"tracker-health"');
  });

  it("exports selected chart widget datapoints without unrelated widget sections", () => {
    const [file] = createGraphDashboardExportFiles({
      dateRangeLabel: "Last 7 Days",
      snapshot: TEST_REPORT_SNAPSHOTS["last-7-days"],
      vehicles: TEST_FLEET_VEHICLES,
      selectedWidgetIds: ["daily-activity", "speed-trend", "speed-distribution", "vehicle-activity"],
      formats: ["csv"],
      fileName: "fleet-graphs-charts",
    });

    expect(file.text).toContain("Daily Activity,Mon,19 trips,188 km");
    expect(file.text).toContain("Speed Trend,Mon,41 km/h average,79 km/h max");
    expect(file.text).toContain("Speed Distribution,81+,6%,Reports snapshot");
    expect(file.text).toContain("Vehicle Activity,Atlas 12,28 trips,412 km");
    expect(file.text).not.toContain("Tracker Health");
    expect(file.text).not.toContain("Fuel And Battery");
  });

  it("does not export missing real telemetry as zero-valued RPM or odometer rows", () => {
    const [file] = createGraphDashboardExportFiles({
      dateRangeLabel: "Today",
      snapshot: TEST_REPORT_SNAPSHOTS.today,
      vehicles: [
        {
          ...TEST_FLEET_VEHICLES[0],
          id: "partial-real",
          name: "Partial Real",
          availableTelemetrySignals: TEST_FLEET_VEHICLES[0].availableTelemetrySignals,
          latestTelemetrySamples: [
            {
              signalId: "speed",
              timestampIso: "2026-05-06T09:00:00.000Z",
              value: 42,
              sourceAttribute: "speed",
            },
          ],
          teltonika: undefined,
        },
      ],
      selectedWidgetIds: ["engine-load", "odometer-distance"],
      formats: ["csv"],
      fileName: "partial-real",
    });

    expect(file.text).not.toContain("Engine Load,Partial Real,0 rpm");
    expect(file.text).not.toContain("Odometer And Distance,Partial Real,0 km,0 km trip");
  });
});
