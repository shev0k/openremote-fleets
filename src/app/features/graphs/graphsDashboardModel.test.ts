import { describe, expect, it } from "vitest";
import type { TelemetrySignalDefinition } from "../../../domain/models/telemetry";
import { TEST_REPORT_SNAPSHOTS } from "../../test-utils/reportBuilders";
import { TEST_FLEET_VEHICLES } from "../../test-utils/vehicleBuilders";
import {
  GRAPH_DASHBOARD_COLUMN_COUNT,
  DEFAULT_GRAPH_WIDGET_IDS,
  DEFAULT_GRAPH_WIDGET_LAYOUT,
  GRAPH_WIDGET_CATALOG,
  createGraphDashboardSummary,
  getGraphWidgetGridDimensions,
  moveGraphWidget,
  normalizeGraphWidgetLayout,
  packGraphWidgetLayout,
  resizeGraphWidget,
  toggleGraphWidget,
  updateGraphWidgetGridLayout,
} from "./graphsDashboardModel";

describe("graphs dashboard model", () => {
  it("defines a broad, non-duplicated widget catalog grounded in fleet operations data", () => {
    const ids = GRAPH_WIDGET_CATALOG.map((widget) => widget.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(GRAPH_WIDGET_CATALOG.length).toBeGreaterThanOrEqual(12);
    expect(DEFAULT_GRAPH_WIDGET_IDS.every((id) => ids.includes(id))).toBe(true);
    expect(GRAPH_WIDGET_CATALOG.map((widget) => widget.title)).toEqual(
      expect.arrayContaining([
        "Fleet KPIs",
        "Daily Activity",
        "Speed Trend",
        "Fleet Status",
        "Fuel And Battery",
        "Tracker Health",
        "Driver Coverage",
        "Engine Load",
      ]),
    );
  });

  it("derives dense operational summaries from report snapshots and latest Teltonika samples", () => {
    const summary = createGraphDashboardSummary(TEST_REPORT_SNAPSHOTS["last-7-days"], TEST_FLEET_VEHICLES);

    expect(summary.vehicleCount).toBe(5);
    expect(summary.statusRows).toEqual([
      { id: "moving", label: "Moving", count: 2, percentage: 40 },
      { id: "idling", label: "Idling", count: 1, percentage: 20 },
      { id: "parked", label: "Parked", count: 0, percentage: 0 },
      { id: "stationary", label: "Stationary", count: 0, percentage: 0 },
      { id: "alerting", label: "Alerting", count: 1, percentage: 20 },
      { id: "offline", label: "Offline", count: 1, percentage: 20 },
    ]);
    expect(summary.telemetryCoverageRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalId: "speed",
          label: "Speed",
          sourceLabel: "Teltonika 24",
          supportedVehicleCount: 5,
        }),
        expect.objectContaining({
          signalId: "gnssHdop",
          label: "GNSS HDOP",
          sourceLabel: "Teltonika 182",
          supportedVehicleCount: 5,
        }),
      ]),
    );
    expect(summary.fuelBatteryRows[0]).toMatchObject({
      vehicleId: "veh-delta-24",
      vehicleName: "Delta 24",
      fuelLevel: 23,
      batteryLevel: 54,
    });
    expect(summary.trackerHealthRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "GSM Signal", averageLabel: "3.0 / 5" }),
        expect.objectContaining({ label: "GNSS HDOP", averageLabel: "1.4" }),
        expect.objectContaining({ label: "External Voltage", averageLabel: "12.1 V" }),
      ]),
    );
    expect(summary.driverCoverage.assignedCount).toBe(5);
    expect(summary.engineRows[0]).toMatchObject({ vehicleName: "Harbor 07", rpm: 1960 });
  });

  it("keeps real-mode catalog definitions separate from observed graph telemetry", () => {
    const catalog: TelemetrySignalDefinition[] = ["speed", "fuelLevel", "engineRpm", "totalOdometer", "tripOdometer"].map((signalId) => ({
      id: signalId,
      attributeName: signalId,
      displayName: signalId,
      valueType: "numeric",
      source: "teltonika",
    }));
    const summary = createGraphDashboardSummary(TEST_REPORT_SNAPSHOTS["last-7-days"], [
      {
        ...TEST_FLEET_VEHICLES[0],
        id: "partial-real",
        name: "Partial Real",
        availableTelemetrySignals: catalog,
        latestTelemetrySamples: [
          {
            signalId: "speed",
            timestampIso: "2026-05-06T09:00:00.000Z",
            value: 42,
            sourceAttribute: "speed",
          },
        ],
        teltonika: undefined,
        fuelLevelPercent: undefined,
        batteryLevelPercent: undefined,
      },
    ]);

    expect(summary.telemetryCoverageRows.find((row) => row.signalId === "speed")).toMatchObject({
      supportedVehicleCount: 1,
      percentage: 100,
    });
    expect(summary.telemetryCoverageRows.find((row) => row.signalId === "fuelLevel")).toMatchObject({
      supportedVehicleCount: 0,
      percentage: 0,
    });
    expect(summary.engineRows).toEqual([]);
    expect(summary.odometerRows).toEqual([]);
  });

  it("keeps widget layout as ordered, resizable dashboard state", () => {
    expect(DEFAULT_GRAPH_WIDGET_LAYOUT.map((item) => item.id)).toEqual(DEFAULT_GRAPH_WIDGET_IDS);
    expect(DEFAULT_GRAPH_WIDGET_LAYOUT.find((item) => item.id === "fleet-kpis")).toMatchObject({
      size: "wide",
      x: 0,
      y: 0,
      w: 6,
      h: 3,
      minH: 3,
    });
    expect(getGraphWidgetGridDimensions("fleet-status", "compact")).toMatchObject({ w: 3, h: 3, minH: 3 });
    expect(getGraphWidgetGridDimensions("fleet-status", "medium")).toMatchObject({ w: 4, h: 4, minH: 4 });
    expect(getGraphWidgetGridDimensions("fleet-status", "wide")).toMatchObject({ w: 6, h: 4, minH: 4 });
    expect(getGraphWidgetGridDimensions("alerts-by-vehicle", "compact")).toMatchObject({ w: 3, h: 3, minH: 3 });
    expect(DEFAULT_GRAPH_WIDGET_LAYOUT.every((item) => item.x + item.w <= GRAPH_DASHBOARD_COLUMN_COUNT)).toBe(true);

    const resized = resizeGraphWidget(DEFAULT_GRAPH_WIDGET_LAYOUT, "tracker-health", "wide");
    expect(resized.find((item) => item.id === "tracker-health")?.size).toBe("wide");
    expect(resized.find((item) => item.id === "tracker-health")).toMatchObject({ w: 6, h: 4 });
    expect(DEFAULT_GRAPH_WIDGET_LAYOUT.find((item) => item.id === "tracker-health")?.size).toBe("medium");

    const moved = moveGraphWidget(resized, "tracker-health", "fleet-kpis");
    expect(moved.map((item) => item.id).slice(0, 2)).toEqual(["tracker-health", "fleet-kpis"]);
    expect(new Set(moved.map((item) => item.id)).size).toBe(moved.length);

    const removed = toggleGraphWidget(moved, "tracker-health");
    expect(removed.some((item) => item.id === "tracker-health")).toBe(false);

    const restored = toggleGraphWidget(removed, "tracker-health");
    expect(restored.at(-1)).toMatchObject({ id: "tracker-health", size: "medium", x: 0 });
  });

  it("normalizes stored grid placement and supports explicit packing", () => {
    const legacyLayout = normalizeGraphWidgetLayout([
      { id: "fleet-kpis", size: "wide" },
      { id: "tracker-health", size: "medium" },
    ]);

    expect(legacyLayout).toEqual([
      expect.objectContaining({ id: "fleet-kpis", x: 0, y: 0, w: 6, h: 3 }),
      expect.objectContaining({ id: "tracker-health", x: 6, y: 0, w: 4, h: 4 }),
    ]);

    const explicitLayout = normalizeGraphWidgetLayout([
      { id: "fleet-kpis", size: "wide", x: 11, y: -4, w: 20, h: 1 },
      { id: "driver-coverage", size: "compact", x: 8, y: 8, w: 2, h: 1 },
    ]);

    expect(explicitLayout[0]).toMatchObject({ id: "fleet-kpis", x: 0, y: 0, w: 12, h: 3, size: "wide" });
    expect(explicitLayout[1]).toMatchObject({ id: "driver-coverage", x: 8, y: 8, w: 2, h: 2, size: "compact" });

    const updatedLayout = updateGraphWidgetGridLayout(legacyLayout, [{ i: "tracker-health", x: 3, y: 7, w: 3, h: 3 }]);
    expect(updatedLayout.find((item) => item.id === "tracker-health")).toMatchObject({
      x: 3,
      y: 7,
      w: 3,
      h: 3,
      size: "compact",
    });

    const packedLayout = packGraphWidgetLayout(updatedLayout);
    expect(packedLayout[0]).toMatchObject({ id: "fleet-kpis", x: 0, y: 0 });
    expect(packedLayout[1]).toMatchObject({ id: "tracker-health", x: 6, y: 0 });
  });
});
