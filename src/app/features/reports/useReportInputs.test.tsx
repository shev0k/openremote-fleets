/* @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FleetRepository } from "../../../domain/repositories/fleetRepository";
import type { ReportsRepository } from "../../../domain/repositories/reportsRepository";
import {
  TEST_REPORT_DEFINITIONS,
  TEST_REPORT_PARAMETERS,
} from "../../test-utils/reportBuilders";
import { TEST_FLEET_VEHICLES } from "../../test-utils/vehicleBuilders";
import { useReportInputs } from "./useReportInputs";

describe("useReportInputs", () => {
  it("loads report builder inputs and derives the initial draft from definitions", async () => {
    const fleetRepository = {
      listVehicles: vi.fn().mockResolvedValue(TEST_FLEET_VEHICLES),
    } as unknown as FleetRepository;
    const reportsRepository = {
      listReportDefinitions: vi.fn().mockResolvedValue(TEST_REPORT_DEFINITIONS),
      listReportParameters: vi.fn().mockResolvedValue(TEST_REPORT_PARAMETERS),
    } as unknown as ReportsRepository;

    const { result } = renderHook(() => useReportInputs({ fleetRepository, reportsRepository }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.draft?.definitionId).toBe(TEST_REPORT_DEFINITIONS[0].id);
    });

    expect(result.current.definitions).toHaveLength(TEST_REPORT_DEFINITIONS.length);
    expect(result.current.parameters).toHaveLength(TEST_REPORT_PARAMETERS.length);
    expect(result.current.vehicles).toHaveLength(TEST_FLEET_VEHICLES.length);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
