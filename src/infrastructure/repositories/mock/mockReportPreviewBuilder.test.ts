import { describe, expect, it } from "vitest";
import { MOCK_REPORT_FIXTURES } from "./fixtures/reportsFixtures";
import { createMockReportPreview } from "./mockReportPreviewBuilder";

describe("mock report preview builder", () => {
  it("keeps incompatible report previews safe and explicit", () => {
    const preview = createMockReportPreview({
      snapshots: MOCK_REPORT_FIXTURES,
      request: {
        definitionId: "canbus-details",
        period: { type: "preset", preset: "today" },
        vehicleSelection: { mode: "all" },
        parameterIds: [],
        outputMode: "preview",
      },
    });

    expect(preview.rows).toEqual([]);
    expect(preview.summary.excludedVehicles).toBeGreaterThan(0);
    expect(preview.metadata?.warnings?.[0]).toContain("incompatible vehicles");
    expect(preview.sections?.find((section) => section.kind === "summary")?.items).toContainEqual(
      expect.objectContaining({ label: "Excluded" }),
    );
  });

  it("builds selected chart sections from compatible rows", () => {
    const preview = createMockReportPreview({
      snapshots: MOCK_REPORT_FIXTURES,
      request: {
        definitionId: "fuel-management",
        period: { type: "preset", preset: "last7Days" },
        vehicleSelection: { mode: "selected", vehicleIds: ["veh-atlas-12", "veh-courier-19"] },
        parameterIds: ["fuelLevel", "fuelRateGps"],
        columnIds: ["fuelLevel", "fuelRateGps"],
        chartIds: ["fuel-level-history"],
        outputMode: "preview",
      },
    });
    const chart = preview.sections?.find((section) => section.id === "fuel-level-history")?.chart;

    expect(chart?.unit).toBe("%");
    expect(chart?.points.map((point) => point.label)).toEqual(["atlas-12", "courier-19"]);
    expect(chart?.points.map((point) => point.value)).toEqual([68, 57]);
  });
});
