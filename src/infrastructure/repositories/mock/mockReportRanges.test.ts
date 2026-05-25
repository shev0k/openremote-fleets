import { describe, expect, it } from "vitest";
import { ReportGenerationRequest } from "../../../domain/models/reports";
import { normalizeReportRange, resolveReportSnapshotKey } from "./mockReportRanges";

describe("mock report range helpers", () => {
  it("normalizes legacy report range labels to fixture keys", () => {
    expect(normalizeReportRange("Today")).toBe("today");
    expect(normalizeReportRange("Last 7 Days")).toBe("last-7-days");
    expect(normalizeReportRange("Custom Range: 2026-05-01 - 2026-05-06")).toBe("custom-range");
    expect(normalizeReportRange("unsupported")).toBe("last-7-days");
  });

  it("resolves generation request periods to snapshot keys", () => {
    const request: ReportGenerationRequest = {
      definitionId: "daily-summary",
      period: { type: "preset", preset: "previousMonth" },
      vehicleSelection: { mode: "all" },
      parameterIds: [],
      outputMode: "preview",
    };

    expect(resolveReportSnapshotKey(request)).toBe("last-30-days");
    expect(resolveReportSnapshotKey({ ...request, period: { type: "custom" } })).toBe("custom-range");
  });
});
