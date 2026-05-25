/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AppServices } from "../../domain/services/appServices";
import { PassthroughFleetLiveStateService } from "../../domain/services/liveFleetStateService";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { TEST_REPORT_SNAPSHOTS } from "../test-utils/reportBuilders";
import { TEST_FLEET_VEHICLES } from "../test-utils/vehicleBuilders";
import { Graphs } from "./Graphs";

beforeAll(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    },
  });
  globalThis.ResizeObserver = class {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: { width: 900, height: 320 } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        this,
      );
    }

    unobserve() {}
    disconnect() {}
  };
  URL.createObjectURL = vi.fn(() => "blob:graphs-export");
  URL.revokeObjectURL = vi.fn();
});

function renderGraphs() {
  const reportsRepository = {
    getFleetReports: vi.fn().mockResolvedValue(TEST_REPORT_SNAPSHOTS["last-7-days"]),
    listReportDefinitions: vi.fn().mockResolvedValue([]),
    listReportParameters: vi.fn().mockResolvedValue([]),
    previewReport: vi.fn(),
  };
  const fleetRepository = {
    listVehicles: vi.fn().mockResolvedValue(TEST_FLEET_VEHICLES),
    getVehicleDetail: vi.fn(),
    listAvailableTelemetrySignals: vi.fn(),
    getVehicleTelemetryTimeline: vi.fn(),
  };
  const services = {
    dataMode: "mock",
    reportsRepository,
    alertsRepository: {} as never,
    assetsRepository: {} as never,
    fleetRepository,
    playbackRepository: {} as never,
    preferencesRepository: {} as never,
    liveFleetStateService: new PassthroughFleetLiveStateService(),
  } satisfies AppServices;

  const renderResult = render(
    <AppServicesProvider services={services}>
      <Graphs />
    </AppServicesProvider>,
  );

  return {
    reportsRepository,
    fleetRepository,
    container: renderResult.container,
    unmount: renderResult.unmount,
  };
}

describe("Graphs page", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("keeps the existing dashboard charts under a richer configurable Graphs workspace", async () => {
    const { fleetRepository } = renderGraphs();

    await waitFor(() => {
      expect(screen.getByText("Graphs")).toBeInTheDocument();
    });

    expect(fleetRepository.listVehicles).toHaveBeenCalled();
    expect(screen.getByText("Max Speed Recorded")).toBeInTheDocument();
    expect(screen.getByText("Widget Library")).toBeInTheDocument();
    expect(screen.getByTestId("graph-widget-tracker-health")).toBeInTheDocument();
    expect(screen.getByTestId("graph-widget-fuel-battery")).toBeInTheDocument();
    expect(screen.queryByText("Fleet Reports")).not.toBeInTheDocument();
  });

  it("lets users hide and restore dashboard widgets", async () => {
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByText("Graphs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /hide tracker health widget/i }));

    expect(screen.queryByTestId("graph-widget-tracker-health")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show tracker health widget/i }));

    expect(screen.getByTestId("graph-widget-tracker-health")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show driver coverage widget/i }));
    const driverCoverageWidget = screen.getByTestId("graph-widget-driver-coverage");
    expect(within(driverCoverageWidget).getByText("iButton coverage")).toBeInTheDocument();
    expect(within(driverCoverageWidget).getByText("5/5 assigned")).toBeInTheDocument();
  });

  it("supports a custom date picker range for graph snapshots", async () => {
    const { reportsRepository } = renderGraphs();

    await waitFor(() => {
      expect(screen.getByText("Graphs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /date range/i }));
    fireEvent.click(await screen.findByText("Custom Range"));

    await waitFor(() => {
      expect(reportsRepository.getFleetReports).toHaveBeenLastCalledWith(
        expect.stringMatching(/^Custom Range: \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/),
      );
    });
    expect(screen.getByRole("button", { name: /custom start date/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /custom start date/i }));
    expect(await screen.findByText(/Select Start Date/i)).toBeInTheDocument();
  });

  it("keeps graph date presets focused without overlapping monthly choices", async () => {
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByText("Graphs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /date range/i }));

    expect(screen.queryByText("Last 30 Days")).not.toBeInTheDocument();
    expect(screen.getByText("This Month")).toBeInTheDocument();
    expect(screen.getByText("Custom Range")).toBeInTheDocument();
  });

  it("lets users resize widgets and choose packed or free dashboard placement", async () => {
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByTestId("graph-widget-tracker-health")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /set tracker health widget to wide/i }));
    expect(screen.getByTestId("graph-widget-tracker-health")).toHaveAttribute("data-widget-size", "wide");
    expect(screen.getByTestId("graph-grid-item-tracker-health")).toHaveAttribute("data-graph-grid-width", "6");

    fireEvent.click(screen.getByRole("button", { name: /set fleet status widget to medium/i }));
    expect(screen.getByTestId("graph-widget-fleet-status")).toHaveAttribute("data-widget-size", "medium");
    expect(screen.getByTestId("graph-grid-item-fleet-status")).toHaveAttribute("data-graph-grid-height", "4");

    fireEvent.click(screen.getByRole("button", { name: /set fleet status widget to wide/i }));
    expect(screen.getByTestId("graph-widget-fleet-status")).toHaveAttribute("data-widget-size", "wide");
    expect(screen.getByTestId("graph-grid-item-fleet-status")).toHaveAttribute("data-graph-grid-height", "4");

    fireEvent.click(screen.getByRole("button", { name: /use free dashboard placement/i }));
    expect(screen.getByTestId("graph-dashboard-grid")).toHaveAttribute("data-layout-mode", "free");

    fireEvent.click(screen.getByRole("button", { name: /compact graph dashboard gaps/i }));
    expect(screen.getByTestId("graph-dashboard-grid")).toHaveAttribute("data-layout-mode", "packed");
  });

  it("uses an explicit grid layout so mixed widget heights can be packed or left with gaps", async () => {
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByTestId("graph-dashboard-grid")).toBeInTheDocument();
    });

    expect(screen.getByTestId("graph-dashboard-grid")).toHaveAttribute("data-layout-mode", "packed");
    expect(screen.getByTestId("graph-grid-item-fleet-kpis")).toHaveAttribute("data-graph-grid-width", "6");
    expect(screen.getByTestId("graph-grid-item-fleet-kpis")).toHaveAttribute("data-graph-grid-height", "3");
    expect(screen.getByTestId("graph-grid-item-fleet-status")).toHaveAttribute("data-graph-grid-width", "3");
    expect(screen.getByTestId("graph-grid-item-fleet-status")).toHaveAttribute("data-graph-grid-height", "3");
    expect(within(screen.getByTestId("graph-widget-fleet-status")).queryByText(/active vehicles and .* active alerts/i)).not.toBeInTheDocument();
  });

  it("renders compact-specific widget bodies instead of squeezing full-size charts into S cards", async () => {
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByTestId("graph-widget-speed-trend")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /set speed trend widget to compact/i }));
    fireEvent.click(screen.getByRole("button", { name: /set fleet kpis widget to compact/i }));

    expect(screen.getByTestId("graph-widget-speed-trend")).toHaveAttribute("data-widget-size", "compact");
    expect(screen.getByTestId("graph-speed-trend-compact")).toBeInTheDocument();
    expect(screen.queryByTestId("graph-speed-trend-chart")).not.toBeInTheDocument();

    expect(screen.getByTestId("graph-widget-fleet-kpis")).toHaveAttribute("data-widget-size", "compact");
    expect(screen.getByTestId("graph-kpi-compact-metrics")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /set fleet kpis widget to medium/i }));
    expect(screen.getByTestId("graph-widget-fleet-kpis")).toHaveAttribute("data-widget-size", "medium");
    expect(screen.getByTestId("graph-grid-item-fleet-kpis")).toHaveAttribute("data-graph-grid-height", "4");
    expect(screen.getByTestId("graph-kpi-standard-metrics")).toBeInTheDocument();
  });

  it("keeps widget header actions focused on size controls instead of source badges", async () => {
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByTestId("graph-widget-fleet-kpis")).toBeInTheDocument();
    });

    const fleetKpisWidget = screen.getByTestId("graph-widget-fleet-kpis");
    expect(within(fleetKpisWidget).queryByText("Reports snapshot")).not.toBeInTheDocument();
    expect(within(fleetKpisWidget).getByRole("button", { name: /set fleet kpis widget to compact/i })).toBeInTheDocument();
    expect(within(fleetKpisWidget).getByRole("button", { name: /set fleet kpis widget to medium/i })).toBeInTheDocument();
    expect(within(fleetKpisWidget).getByRole("button", { name: /set fleet kpis widget to wide/i })).toBeInTheDocument();
  });

  it("persists dashboard layout customizations for the next visit", async () => {
    const firstRender = renderGraphs();

    await waitFor(() => {
      expect(screen.getByTestId("graph-widget-tracker-health")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /set tracker health widget to wide/i }));
    await waitFor(() => {
      expect(screen.getByTestId("graph-widget-tracker-health")).toHaveAttribute("data-widget-size", "wide");
    });
    firstRender.unmount();

    renderGraphs();

    await waitFor(() => {
      expect(screen.getByTestId("graph-widget-tracker-health")).toHaveAttribute("data-widget-size", "wide");
    });
  });

  it("prints the full selected dashboard with chart graphics", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {
      const printRoot = document.body.querySelector<HTMLElement>('[data-testid="graph-print-root"]');

      expect(printRoot).toBeInTheDocument();
      expect(within(printRoot!).getByTestId("graph-print-widget-daily-activity")).toBeInTheDocument();
      expect(within(printRoot!).getByTestId("graph-print-widget-speed-trend")).toBeInTheDocument();
      expect(within(printRoot!).getByTestId("graph-print-line-series-average")).toBeInTheDocument();
      expect(within(printRoot!).getByTestId("graph-print-widget-telemetry-coverage")).toBeInTheDocument();
    });
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByText("Graphs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /print graphs/i }));

    await waitFor(() => {
      expect(print).toHaveBeenCalled();
    });
  });

  it("opens a concrete graph export workflow instead of deferring to Reports", async () => {
    renderGraphs();

    await waitFor(() => {
      expect(screen.getByText("Graphs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /download graph report/i }));

    expect(screen.getByText("Export Graphs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download selected formats/i })).toBeInTheDocument();
    expect(screen.queryByText("Use Reports to generate export files.")).not.toBeInTheDocument();
    expect(screen.queryByText(/TODO/i)).not.toBeInTheDocument();
  });
});
