/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { forwardRef, useImperativeHandle } from "react";
import { PlaybackRoute } from "../../domain/models/playback";
import { Vehicle } from "../../domain/models/vehicle";
import { AppServices } from "../../domain/services/appServices";
import { AppThemeProvider } from "../providers/AppThemeProvider";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { WallDisplay, hasFullscreenElement } from "./WallDisplay";

const customMapProps: Array<{ selectedVehicleId?: string | null; vehicles?: Vehicle[] }> = [];
const { refreshLayoutMock } = vi.hoisted(() => ({
  refreshLayoutMock: vi.fn(),
}));

vi.mock("../components/map/CustomMap", () => ({
  CustomMap: forwardRef((props: { selectedVehicleId?: string | null; vehicles?: Vehicle[] }, ref) => {
    useImperativeHandle(ref, () => ({
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetView: vi.fn(),
      refreshLayout: refreshLayoutMock,
    }));
    customMapProps.push(props);
    return <div data-testid="wall-display-map" data-selected-vehicle-id={props.selectedVehicleId ?? ""} />;
  }),
}));

const vehicles: Vehicle[] = [
  {
    id: "veh-alerting",
    name: "Alerting",
    plate: "AA-001-A",
    status: "alerting",
    speedKph: 18,
    ignitionOn: true,
    latitude: 51.4416,
    longitude: 5.4697,
    heading: 90,
    lastUpdatedIso: "2026-05-07T12:00:00.000Z",
    driverName: "Driver One",
    trackerId: "352093086403655",
    assetName: "Alerting Van",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 1,
  },
  {
    id: "veh-online",
    name: "Online",
    plate: "AA-002-A",
    status: "moving",
    speedKph: 28,
    ignitionOn: true,
    latitude: 51.4492,
    longitude: 5.4814,
    heading: 80,
    lastUpdatedIso: "2026-05-07T12:00:00.000Z",
    driverName: "Driver Two",
    trackerId: "352093086403699",
    assetName: "Online Van",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
  },
];

const routeByVehicleId: Record<string, PlaybackRoute> = {
  "veh-alerting": {
    vehicleId: "veh-alerting",
    points: [
      {
        latitude: 51.4416,
        longitude: 5.4697,
        timestampIso: "2026-05-07T12:00:00.000Z",
        speedKph: 18,
        directionDegrees: 90,
        ignitionOn: true,
        movement: true,
      },
      {
        latitude: 51.4426,
        longitude: 5.4897,
        timestampIso: "2026-05-07T12:01:00.000Z",
        speedKph: 36,
        directionDegrees: 92,
        ignitionOn: true,
        movement: true,
      },
    ],
    tripSegments: [],
  },
  "veh-online": {
    vehicleId: "veh-online",
    points: [
      {
        latitude: 51.4492,
        longitude: 5.4814,
        timestampIso: "2026-05-07T12:00:00.000Z",
        speedKph: 28,
        directionDegrees: 80,
        ignitionOn: true,
        movement: true,
      },
      {
        latitude: 51.4592,
        longitude: 5.5014,
        timestampIso: "2026-05-07T12:01:00.000Z",
        speedKph: 42,
        directionDegrees: 84,
        ignitionOn: true,
        movement: true,
      },
    ],
    tripSegments: [],
  },
};

function renderWallDisplay(overrides: Partial<AppServices> = {}) {
  customMapProps.length = 0;

  const services = {
    dataMode: "openRemote",
    fleetRepository: {
      listVehicles: vi.fn().mockResolvedValue(vehicles),
      getVehicleDetail: vi.fn(),
      listAvailableTelemetrySignals: vi.fn(),
      getVehicleTelemetryTimeline: vi.fn(),
    },
    playbackRepository: {
      listPlaybackVehicles: vi.fn(),
      getPlaybackRoute: vi.fn(async (vehicleId: string) => routeByVehicleId[vehicleId] ?? null),
      getPlaybackTelemetryTimeline: vi.fn(),
    },
    alertsRepository: {} as never,
    assetsRepository: {} as never,
    reportsRepository: {} as never,
    preferencesRepository: {} as never,
    liveFleetStateService: {
      supportsRouteBackedSimulation: false,
      createSnapshot: vi.fn(({ vehicles: inputVehicles }: { vehicles: Vehicle[] }) => ({
        vehicles: inputVehicles,
        vehicleDetailsById: {},
        selectedRoute: null,
      })),
    },
    ...overrides,
  } satisfies AppServices;

  render(
    <MemoryRouter>
      <AppThemeProvider>
        <AppServicesProvider services={services}>
          <WallDisplay />
        </AppServicesProvider>
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe("WallDisplay", () => {
  let fullscreenElement: Element | null = null;

  beforeEach(() => {
    fullscreenElement = null;
    refreshLayoutMock.mockClear();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: vi.fn(function requestFullscreen(this: HTMLElement) {
        fullscreenElement = this;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      }),
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(() => {
        fullscreenElement = null;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the wall map unselected so it does not auto-zoom to alerting vehicles", async () => {
    renderWallDisplay();

    await waitFor(() => {
      expect(screen.getByTestId("wall-display-map")).toBeInTheDocument();
      expect(customMapProps.at(-1)?.selectedVehicleId).toBeNull();
    });
  });

  it("passes route-moved demo vehicles into the wall map", async () => {
    const liveFleetStateService = {
      supportsRouteBackedSimulation: true,
      createSnapshot: vi.fn(({ vehicles: inputVehicles }: { vehicles: Vehicle[] }) => ({
        vehicles: inputVehicles.map((vehicle) => ({
          ...vehicle,
          longitude: vehicle.longitude + 0.05,
        })),
        vehicleDetailsById: {},
        selectedRoute: null,
      })),
    };

    renderWallDisplay({ dataMode: "mock", liveFleetStateService } as Partial<AppServices>);

    await waitFor(() => {
      expect(liveFleetStateService.createSnapshot).toHaveBeenCalled();
      expect(customMapProps.at(-1)?.vehicles?.find((vehicle) => vehicle.id === "veh-online")?.longitude).toBeGreaterThan(5.4814);
    });
    expect(customMapProps.at(-1)?.selectedVehicleId).toBeNull();
  });

  it("uses the top row for the ticker and controls instead of the monitor title card", async () => {
    renderWallDisplay();

    await waitFor(() => {
      expect(screen.getByText("Live monitor")).toBeInTheDocument();
    });

    expect(screen.queryByText("Fleet operations monitor")).not.toBeInTheDocument();
    expect(screen.queryByText("Wall display")).not.toBeInTheDocument();
    expect(screen.getByTestId("wall-display-operations-ticker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open appearance settings/i })).toBeInTheDocument();
  });

  it("toggles fullscreen state and refreshes the map layout after viewport changes", async () => {
    renderWallDisplay();

    const fullscreenButton = await screen.findByRole("button", { name: /enter fullscreen wall display/i });
    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /exit fullscreen wall display/i })).toBeInTheDocument();
    });
    expect(refreshLayoutMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /exit fullscreen wall display/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enter fullscreen wall display/i })).toBeInTheDocument();
    });
  });

  it("can initialize fullscreen state without browser fullscreen globals", () => {
    const originalDocument = globalThis.document;
    vi.stubGlobal("document", undefined);

    try {
      expect(hasFullscreenElement()).toBe(false);
    } finally {
      vi.stubGlobal("document", originalDocument);
    }
  });
});
