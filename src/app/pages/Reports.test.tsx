/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GeneratedReportPreview } from "../../domain/models/reports";
import { AppServices } from "../../domain/services/appServices";
import type { AppDataMode } from "../../domain/services/appServices";
import {
  TEST_REPORT_DEFINITIONS,
  TEST_REPORT_PARAMETERS,
} from "../test-utils/reportBuilders";
import { TEST_FLEET_VEHICLES } from "../test-utils/vehicleBuilders";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { Reports } from "./Reports";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function createPreview(request: { parameterIds: string[] }, vehicleId = "veh-atlas-12"): GeneratedReportPreview {
  return {
    request: {
      definitionId: "daily-summary",
      period: { type: "preset", preset: "today" },
      vehicleSelection: { mode: "all" },
      parameterIds: request.parameterIds,
      outputMode: "preview",
    },
    generatedAtIso: "2026-05-06T09:00:00Z",
    columns: TEST_REPORT_PARAMETERS.filter((parameter) => request.parameterIds.includes(parameter.id)),
    rows: [
      {
        vehicleId,
        timestampIso: "2026-05-06T09:00:00Z",
        values: { speed: 42, movement: true, ignition: true },
      },
    ],
    summary: { vehicleCount: 1, parameterCount: request.parameterIds.length },
    metadata: {
      title: "Fleet Daily Summary",
      selectedVehiclesLabel: "All vehicles",
      periodLabel: "Today / Full day",
      filters: ["all", "today", "fullDay"],
    },
    sections: [
      {
        id: "summary",
        title: "Operational summary",
        kind: "summary",
        items: [
          { label: "Total distance", value: "196 km", detail: "Across compatible vehicles" },
          { label: "Active vehicles", value: "4 of 5", detail: "Moving or ignition on" },
        ],
      } as never,
      {
        id: "distance-by-day",
        title: "Distance by day",
        kind: "chart",
        chart: {
          type: "bar",
          unit: "km",
          points: [
            { label: "08:00", value: 28 },
            { label: "10:00", value: 44 },
          ],
        },
      } as never,
    ],
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function renderReports(
  previewReportImplementation?: (request: { parameterIds: string[] }) => Promise<GeneratedReportPreview>,
  dataMode: AppDataMode = "mock",
) {
  const reportsRepository = {
    getFleetReports: vi.fn(),
    listReportDefinitions: vi.fn().mockResolvedValue(TEST_REPORT_DEFINITIONS),
    listReportParameters: vi.fn().mockResolvedValue(TEST_REPORT_PARAMETERS),
    previewReport: vi.fn().mockImplementation(previewReportImplementation ?? ((request) => Promise.resolve(createPreview(request)))),
  };
  const services = {
    dataMode,
    reportsRepository,
    alertsRepository: {} as never,
    assetsRepository: {} as never,
    fleetRepository: {
      listVehicles: vi.fn().mockResolvedValue(TEST_FLEET_VEHICLES),
      getVehicleDetail: vi.fn(),
      listAvailableTelemetrySignals: vi.fn(),
      getVehicleTelemetryTimeline: vi.fn(),
    },
    liveFleetStateService: {} as never,
    playbackRepository: {} as never,
    preferencesRepository: {} as never,
  } satisfies AppServices;

  render(
    <AppServicesProvider services={services}>
      <Reports />
    </AppServicesProvider>,
  );

  return reportsRepository;
}

describe("Reports page", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a three-panel capability-aware reporting workspace", async () => {
    renderReports();

    expect(await screen.findByTestId("reports-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("reports-catalog-panel")).toBeInTheDocument();
    expect(screen.getByTestId("reports-builder-panel")).toBeInTheDocument();
    expect(screen.getByTestId("reports-output-panel")).toBeInTheDocument();
    expect(screen.getByTestId("report-library-list")).toHaveClass("flex-1");
    expect(screen.getByText(/Build a report request to inspect the generated payload/i)).toBeInTheDocument();
    expect(screen.queryByText(/before export, email, or scheduling work is connected/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Fleet Daily Summary").length).toBeGreaterThan(0);
    expect(screen.getByText("CANBus Details")).toBeInTheDocument();
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText(/unavailable because none of the selected vehicles expose CANBus data/i)).toBeInTheDocument();
  });

  it("separates fixed date presets from custom ranges and explains report controls", async () => {
    renderReports();

    await screen.findByTestId("report-definition-daily-summary");

    expect(screen.getByText(/Fixed presets use relative fleet history periods/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Custom start date")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(await screen.findByRole("button", { name: "Custom Range" }));

    expect(screen.getByLabelText("Custom start date")).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Custom start date"));
    expect(await screen.findByText("Select Start Date")).toBeInTheDocument();
    expect(screen.getByText(/Custom range requires both start and end dates/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByLabelText("Custom start time")).toBeInTheDocument();
    expect(document.querySelector('input[type="time"]')).not.toBeInTheDocument();
    expect(screen.getByText(/Choose the tracker attributes included in the report/i)).toBeInTheDocument();
    expect(screen.getByText(/Grouping controls how rows are organized/i)).toBeInTheDocument();
    expect(screen.getByText(/Map adds route and location context/i)).toBeInTheDocument();
  });

  it("generates report previews for all vehicles without dropping the vehicle selection", async () => {
    const reportsRepository = renderReports();

    await screen.findByTestId("report-definition-daily-summary");

    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(reportsRepository.previewReport).toHaveBeenCalledWith(
        expect.objectContaining({
          definitionId: "daily-summary",
          outputMode: "preview",
          vehicleSelection: { mode: "all" },
          parameterIds: expect.arrayContaining(["speed", "movement", "ignition"]),
          timeWindow: { preset: "fullDay" },
        }),
      );
    });

    expect(screen.getByTestId("report-preview-table")).toBeInTheDocument();
    expect(screen.getByText("veh-atlas-12")).toBeInTheDocument();
    expect(screen.getByText("Total distance")).toBeInTheDocument();
    expect(screen.getByText("196 km")).toBeInTheDocument();
    expect(screen.getByText("Distance by day")).toBeInTheDocument();
    expect(screen.getByText("44 km")).toBeInTheDocument();
  });

  it("uses selected vehicle groups in the generation request", async () => {
    const reportsRepository = renderReports();

    await screen.findByTestId("report-definition-daily-summary");

    fireEvent.click(screen.getByRole("button", { name: "Groups" }));
    fireEvent.click(screen.getByRole("button", { name: /trucks/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(reportsRepository.previewReport).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleSelection: { mode: "groups", groupIds: ["class-truck"] },
        }),
      );
    });
  });

  it("exports multiple selected formats from the generated preview", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:report"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const createObjectUrl = vi.mocked(URL.createObjectURL);
    const revokeObjectUrl = vi.mocked(URL.revokeObjectURL);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const reportsRepository = renderReports();

    await screen.findByTestId("report-definition-daily-summary");

    expect(screen.getByTestId("reports-output-mode")).toHaveClass("overflow-visible");

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: /generate and export/i }));

    await waitFor(() => {
      expect(reportsRepository.previewReport).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
    });
    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalled();
  });

  it("keeps email and schedule output modes local-only in mock mode", async () => {
    renderReports();

    await screen.findByTestId("report-definition-daily-summary");

    fireEvent.click(screen.getByRole("button", { name: "Email" }));
    expect(screen.getByText(/Delivery modes prepare a local request payload/i)).toBeInTheDocument();
    expect(screen.queryByText(/backend job/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/ops@example.com/i), { target: { value: "ops@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(screen.getByText(/Recurring schedule prepared. No recurring schedule was saved./i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/backend automation/i)).not.toBeInTheDocument();
  });

  it("keeps email and schedule output modes payload-only in real mode", async () => {
    const reportsRepository = renderReports(undefined, "openRemote");

    await screen.findByTestId("report-definition-daily-summary");

    fireEvent.click(screen.getByRole("button", { name: "Email" }));
    expect(screen.getByText(/Delivery modes prepare a local request payload/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/ops@example.com/i), { target: { value: "ops@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(reportsRepository.previewReport).toHaveBeenCalledWith(
        expect.objectContaining({
          outputMode: "email",
          delivery: expect.objectContaining({
            recipientEmails: ["ops@example.com"],
          }),
        }),
      );
      expect(screen.getByText(/Email payload prepared. No message was sent./i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(reportsRepository.previewReport).toHaveBeenCalledWith(
        expect.objectContaining({
          outputMode: "schedule",
          schedule: expect.objectContaining({
            enabled: true,
            frequency: "weekly",
            recipientEmails: ["ops@example.com"],
          }),
        }),
      );
      expect(screen.getByText(/Recurring schedule prepared. No recurring schedule was saved./i)).toBeInTheDocument();
    });
  });

  it("passes map and raw data output selections into preview generation", async () => {
    const reportsRepository = renderReports();

    await screen.findByTestId("report-definition-daily-summary");
    const outputOptions = screen.getByTestId("report-output-section-options");

    expect(within(outputOptions).queryAllByRole("checkbox")).toHaveLength(0);
    expect(within(outputOptions).getByRole("button", { name: /Summary output/i })).toHaveClass("rounded-[14px]");

    fireEvent.click(within(outputOptions).getByRole("button", { name: /Map output/i }));
    fireEvent.click(within(outputOptions).getByRole("button", { name: /Raw data output/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(reportsRepository.previewReport).toHaveBeenCalledWith(
        expect.objectContaining({
          includeMap: true,
          includeRawData: true,
        }),
      );
    });
  });

  it("prints after the generated preview is rendered", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {
      const printRoot = document.body.querySelector<HTMLElement>('[data-testid="report-print-root"]');

      expect(printRoot).toBeInTheDocument();
      expect(within(printRoot!).getByTestId("report-preview-table")).toBeInTheDocument();
      expect(printRoot).toHaveTextContent("veh-atlas-12");
    });
    renderReports();

    await screen.findByTestId("report-definition-daily-summary");

    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    fireEvent.click(screen.getByRole("button", { name: /generate and print/i }));

    await waitFor(() => {
      expect(print).toHaveBeenCalled();
    });
  });

  it("does not let stale preview responses overwrite a changed report selection", async () => {
    const first = createDeferred<GeneratedReportPreview>();
    const previewReport = vi
      .fn()
      .mockImplementationOnce(() => first.promise);
    renderReports(previewReport);

    await screen.findByTestId("report-definition-daily-summary");

    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));
    await waitFor(() => expect(previewReport).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId("report-definition-trip-activity"));
    await waitFor(() => expect(screen.getAllByText("Vehicle Trips").length).toBeGreaterThan(0));

    await act(async () => {
      first.resolve(createPreview({ parameterIds: ["speed", "movement", "ignition"] }, "stale-preview"));
      await first.promise;
    });

    expect(screen.queryByText("stale-preview")).not.toBeInTheDocument();
    expect(screen.getByTestId("report-preview-empty")).toBeInTheDocument();
  });
});
