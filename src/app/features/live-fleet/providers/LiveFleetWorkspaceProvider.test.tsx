/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { memo, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEFAULT_APP_PREFERENCES, mergeAppPreferences, type AppPreferences } from "../../../../domain/models/preferences";
import { LIVE_DATA_REFRESH_INTERVAL_MS } from "../../../../domain/services/liveDataRefreshPolicy";
import { createMockAppServices } from "../../../../infrastructure/services/createMockAppServices";
import { FleetLiveStateService } from "../../../../domain/services/liveFleetStateService";
import { AppPreferencesContextProviderForTest } from "../../../providers/AppPreferencesProvider.test-utils";
import { AppServicesProvider } from "../../../providers/AppServicesProvider";
import { interpolatePlaybackRoutePosition } from "../../../components/playback/playbackUtils";
import {
  LiveFleetWorkspaceProvider,
} from "./LiveFleetWorkspaceProvider";
import {
  useMapConfig,
  useOverlayManager,
  useVehicleInteraction,
  useWidgetLayout,
} from "./LiveFleetWorkspaceCompatibility";
import { useLiveFleetVehicleData } from "./LiveFleetDataContext";
import { useLiveFleetLayoutState } from "./LiveFleetLayoutContext";
import { LIVE_FLEET_MAP_TYPE_STORAGE_KEY } from "./liveFleetWorkspace.constants";
import type { PlaybackRoute } from "../../../../domain/models/playback";
import type { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";

const LAYOUT_STORAGE_KEY = "openremote.live-fleet.layout.v1";

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function WorkspaceProbe() {
  const { mapType, setMapType } = useMapConfig();
  const { widgetLayout, setActiveTab, toggleWidgetVisibility } = useWidgetLayout();
  const {
    vehicles,
    historicalRoute,
    selectedSegmentId,
    selectedVehicleId,
    playbackProgress,
    route,
    selectVehicle,
    setPlaybackProgress,
    beginTimelineScrub,
    endTimelineScrub,
    simulationSpeed,
    setSimulationSpeed,
    timelineInspectionRevision,
    selectionLoadError,
    vehiclesLoadError,
    vehicleDetailsById,
  } = useVehicleInteraction();
  const { activeVehicleOverlayId, pinnedVehicleIds, pinVehicleOverlay, unpinVehicleOverlay } = useOverlayManager();
  const playbackPosition = interpolatePlaybackRoutePosition(route, playbackProgress);

  return (
    <div>
      <div data-testid="map-type">{mapType}</div>
      <div data-testid="active-tab">{widgetLayout.activeTab}</div>
      <div data-testid="visible-widgets">{widgetLayout.visibleWidgetIds.join(",")}</div>
      <div data-testid="selected-vehicle">{selectedVehicleId ?? "none"}</div>
      <div data-testid="active-overlay">{activeVehicleOverlayId ?? "none"}</div>
      <div data-testid="selected-segment">{selectedSegmentId ?? "none"}</div>
      <div data-testid="vehicle-detail-ids">{Object.keys(vehicleDetailsById).join(",")}</div>
      <div data-testid="vehicles-error">{vehiclesLoadError ?? "none"}</div>
      <div data-testid="selection-error">{selectionLoadError ?? "none"}</div>
      <div data-testid="playback-progress">{playbackProgress}</div>
      <div data-testid="playback-position">{`${playbackPosition[0].toFixed(6)},${playbackPosition[1].toFixed(6)}`}</div>
      <div data-testid="timeline-inspection-revision">{timelineInspectionRevision}</div>
      <div data-testid="simulation-speed">{simulationSpeed}</div>
      <div data-testid="first-vehicle-position">
        {vehicles[0] ? `${vehicles[0].latitude.toFixed(6)},${vehicles[0].longitude.toFixed(6)},${vehicles[0].heading}` : "none"}
      </div>
      <div data-testid="route-point-count">{route?.points.length ?? 0}</div>
      <div data-testid="route-trip-count">{route?.tripSegments.length ?? 0}</div>
      <div data-testid="last-route-segment">{route?.tripSegments.at(-1)?.id ?? "none"}</div>
      <div data-testid="last-route-point">
        {route?.points.at(-1)
          ? `${route.points.at(-1)?.latitude.toFixed(6)},${route.points.at(-1)?.longitude.toFixed(6)},${route.points.at(-1)?.timestampIso}`
          : "none"}
      </div>
      <div data-testid="historical-trip-count">{historicalRoute?.tripSegments.length ?? 0}</div>
      <div data-testid="pins">{pinnedVehicleIds.join(",")}</div>

      <button type="button" onClick={() => setMapType("terrain")}>
        set terrain
      </button>
      <button type="button" onClick={() => setActiveTab("workspace")}>
        set workspace
      </button>
      <button type="button" onClick={() => toggleWidgetVisibility("criticalAlerts")}>
        toggle critical alerts
      </button>
      <button type="button" onClick={() => pinVehicleOverlay("veh-atlas-12")}>
        pin atlas
      </button>
      <button type="button" onClick={() => unpinVehicleOverlay("veh-atlas-12")}>
        unpin atlas
      </button>
      <button type="button" onClick={() => setPlaybackProgress(50)}>
        scrub to 50
      </button>
      <button type="button" onClick={beginTimelineScrub}>
        begin timeline scrub
      </button>
      <button type="button" onClick={endTimelineScrub}>
        end timeline scrub
      </button>
      <button type="button" onClick={() => setSimulationSpeed(4)}>
        set simulation speed 4
      </button>

      {vehicles.map((vehicle) => (
        <button key={vehicle.id} type="button" onClick={() => void selectVehicle(vehicle.id)}>
          select {vehicle.id}
        </button>
      ))}
    </div>
  );
}

function renderWorkspace(services = createMockAppServices(), preferences: AppPreferences = DEFAULT_APP_PREFERENCES) {
  return render(
    <AppPreferencesContextProviderForTest preferences={preferences}>
      <AppServicesProvider services={services}>
        <LiveFleetWorkspaceProvider>
          <WorkspaceProbe />
        </LiveFleetWorkspaceProvider>
      </AppServicesProvider>
    </AppPreferencesContextProviderForTest>,
  );
}

function renderWorkspaceChildren(children: ReactNode, services = createMockAppServices(), preferences: AppPreferences = DEFAULT_APP_PREFERENCES) {
  return render(
    <AppPreferencesContextProviderForTest preferences={preferences}>
      <AppServicesProvider services={services}>
        <LiveFleetWorkspaceProvider>{children}</LiveFleetWorkspaceProvider>
      </AppServicesProvider>
    </AppPreferencesContextProviderForTest>,
  );
}

function parsePosition(value: string | null) {
  const [latitude, longitude] = (value ?? "").split(",").map(Number);
  return { latitude, longitude };
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function getDistanceMeters(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6_371_000;
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createTestVehicle(id: string): Vehicle {
  return {
    id,
    name: id,
    plate: "BR-482-K",
    status: "moving",
    speedKph: 42,
    ignitionOn: true,
    latitude: 51.44,
    longitude: 5.46,
    heading: 90,
    lastUpdatedIso: "2026-03-29T08:00:00.000Z",
    driverName: "Mila Janssen",
    trackerId: id,
    assetName: id,
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
  };
}

function createTestVehicleDetail(id: string): VehicleDetail {
  return {
    ...createTestVehicle(id),
    lastCommunicationIso: "2026-03-29T08:00:00.000Z",
    gpsAccuracyMeters: 6,
    todayMileageKm: 42,
    odometerKm: 18_200,
    fuelInTankLiters: 64,
    averageFuelConsumptionLitersPer100Km: 7.2,
    stoppedDurationMinutes: 12,
  };
}

function createTestRoute(vehicleId: string, segmentId = "segment-1"): PlaybackRoute {
  return {
    vehicleId,
    points: [
      { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00.000Z", speedKph: 24, directionDegrees: 90 },
      { latitude: 51.45, longitude: 5.48, timestampIso: "2026-03-29T08:10:00.000Z", speedKph: 36, directionDegrees: 95 },
    ],
    tripSegments: [
      {
        id: segmentId,
        startLabel: "08:00",
        endLabel: "08:10",
        startTimeIso: "2026-03-29T08:00:00.000Z",
        endTimeIso: "2026-03-29T08:10:00.000Z",
        durationLabel: "10 min",
        durationMinutes: 10,
        distanceLabel: "3.2 km",
        distanceKm: 3.2,
        stopCount: 0,
        maxSpeedLabel: "80 km/h",
        maxSpeedKph: 80,
        averageSpeedLabel: "32 km/h",
        averageSpeedKph: 32,
        startProgressPercent: 0,
        endProgressPercent: 100,
      },
    ],
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("LiveFleetWorkspaceProvider", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      writable: true,
      value: createStorageMock(),
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("hydrates the persisted widget layout and writes updates back to storage", async () => {
    window.localStorage.setItem(LIVE_FLEET_MAP_TYPE_STORAGE_KEY, "satellite");
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        activeTab: "quickPanels",
        visibleWidgetIds: ["fleetList"],
      }),
    );

    renderWorkspace();

    expect(screen.getByTestId("map-type")).toHaveTextContent("satellite");
    expect(screen.getByTestId("active-tab")).toHaveTextContent("quickPanels");
    expect(screen.getByTestId("visible-widgets")).toHaveTextContent("fleetList");

    fireEvent.click(screen.getByRole("button", { name: /set terrain/i }));
    fireEvent.click(screen.getByRole("button", { name: /set workspace/i }));
    fireEvent.click(screen.getByRole("button", { name: /toggle critical alerts/i }));

    await waitFor(() => {
      expect(screen.getByTestId("map-type")).toHaveTextContent("terrain");
      expect(screen.getByTestId("active-tab")).toHaveTextContent("workspace");
      expect(screen.getByTestId("visible-widgets")).toHaveTextContent("fleetList,criticalAlerts");
    });

    const storedLayout = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "{}") as {
      activeTab?: string;
      visibleWidgetIds?: string[];
    };

    expect(storedLayout.activeTab).toBe("workspace");
    expect(storedLayout.visibleWidgetIds).toEqual(["fleetList", "criticalAlerts"]);
    expect(window.localStorage.getItem(LIVE_FLEET_MAP_TYPE_STORAGE_KEY)).toBe("terrain");
  });

  it("removes the retired Fleet Summary widget from persisted layouts", () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        activeTab: "workspace",
        widgetOrderIds: ["fleetSummary", "criticalAlerts", "fleetList", "tripHistory"],
        visibleWidgetIds: ["fleetSummary", "criticalAlerts", "fleetList"],
      }),
    );

    renderWorkspace();

    expect(screen.getByTestId("visible-widgets")).toHaveTextContent("fleetList,criticalAlerts");
  });

  it("loads vehicle detail and playback context on selection and supports pinning overlays", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));

    await waitFor(() => {
      expect(screen.getByTestId("selected-vehicle")).toHaveTextContent("veh-atlas-12");
      expect(Number(screen.getByTestId("route-trip-count").textContent)).toBeGreaterThan(0);
      expect(Number(screen.getByTestId("historical-trip-count").textContent)).toBeGreaterThan(0);
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("100");
      expect(screen.getByTestId("visible-widgets")).toHaveTextContent("tripHistory");
      expect(screen.getByTestId("visible-widgets")).not.toHaveTextContent("historicalStatus");
    });

    fireEvent.click(screen.getByRole("button", { name: /^pin atlas$/i }));
    expect(screen.getByTestId("pins")).toHaveTextContent("veh-atlas-12");

    fireEvent.click(screen.getByRole("button", { name: /^unpin atlas$/i }));
    expect(screen.getByTestId("pins")).toHaveTextContent("");
  });

  it("starts live timeline at the current endpoint and updates segment focus while scrubbing history", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));

    await waitFor(() => {
      expect(screen.getByTestId("selected-segment")).toHaveTextContent(screen.getByTestId("last-route-segment").textContent ?? "");
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("100");
    });

    fireEvent.click(screen.getByRole("button", { name: /scrub to 50/i }));

    await waitFor(() => {
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("50");
      expect(screen.getByTestId("selected-segment")).not.toHaveTextContent("none");
    });
  });

  it("ticks mock live fleet positions and advances selected live route without overriding scrubbed playback", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    const firstPosition = screen.getByTestId("first-vehicle-position").textContent;

    await waitFor(() => {
      expect(screen.getByTestId("first-vehicle-position").textContent).not.toBe(firstPosition);
    }, { timeout: 2_500 });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));

    await waitFor(() => {
      expect(Number(screen.getByTestId("route-point-count").textContent)).toBeGreaterThan(1);
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("100");
    });

    fireEvent.click(screen.getByRole("button", { name: /scrub to 50/i }));
    const scrubbedRouteEndpoint = screen.getByTestId("last-route-point").textContent;
    const scrubbedPlaybackPosition = screen.getByTestId("playback-position").textContent;
    const scrubbedSelectedSegment = screen.getByTestId("selected-segment").textContent;

    await waitFor(() => {
      expect(screen.getByTestId("last-route-point").textContent).not.toBe(scrubbedRouteEndpoint);
      expect(screen.getByTestId("playback-position")).toHaveTextContent(scrubbedPlaybackPosition ?? "");
      expect(Number(screen.getByTestId("playback-progress").textContent)).toBeCloseTo(50, 2);
      expect(screen.getByTestId("selected-segment")).toHaveTextContent(scrubbedSelectedSegment ?? "");
    }, { timeout: 2_500 });
  }, 8_000);

  it("runs demo movement through the app service boundary", async () => {
    const createSnapshot = vi.fn((input: Parameters<FleetLiveStateService["createSnapshot"]>[0]) => ({
      vehicles: input.vehicles.map((vehicle) => ({
        ...vehicle,
        latitude: vehicle.latitude + 0.02,
      })),
      vehicleDetailsById: input.vehicleDetailsById ?? {},
      selectedRoute: null,
    }));
    const liveFleetStateService: FleetLiveStateService = {
      supportsRouteBackedSimulation: true,
      createSnapshot,
    };

    renderWorkspace({ ...createMockAppServices(), liveFleetStateService });

    await waitFor(() => {
      expect(createSnapshot).toHaveBeenCalled();
      expect(screen.getByTestId("first-vehicle-position")).not.toHaveTextContent("none");
    });
  });

  it("uses the global default map layer when no Live Fleet layer is stored", () => {
    renderWorkspace(
      createMockAppServices(),
      mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
        behavior: { defaultMapLayer: "satellite" },
      }),
    );

    expect(screen.getByTestId("map-type")).toHaveTextContent("satellite");
  });

  it("keeps the simulation interval stable while playback progress changes", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /scrub to 50/i })).toBeInTheDocument();
      expect(setIntervalSpy.mock.calls.filter(([, delay]) => delay === 1_500)).toHaveLength(1);
    });

    const registeredIntervals = setIntervalSpy.mock.calls.filter(([, delay]) => delay === 1_500).length;
    fireEvent.click(screen.getByRole("button", { name: /scrub to 50/i }));

    await waitFor(() => {
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("50");
    });
    expect(setIntervalSpy.mock.calls.filter(([, delay]) => delay === 1_500)).toHaveLength(registeredIntervals);
  });

  it("starts mock movement from the emulated route instead of teleporting from fixture endpoints", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
      expect(screen.getByTestId("first-vehicle-position")).not.toHaveTextContent("none");
    });

    const initialPosition = parsePosition(screen.getByTestId("first-vehicle-position").textContent);

    await waitFor(() => {
      expect(screen.getByTestId("first-vehicle-position").textContent).not.toContain(
        `${initialPosition.latitude.toFixed(6)},${initialPosition.longitude.toFixed(6)}`,
      );
    }, { timeout: 2_500 });

    const nextPosition = parsePosition(screen.getByTestId("first-vehicle-position").textContent);

    expect(getDistanceMeters(initialPosition, nextPosition)).toBeLessThan(120);
  }, 8_000);

  it("commits timeline inspection only after scrubbing ends", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));

    await waitFor(() => {
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("100");
    });

    fireEvent.click(screen.getByRole("button", { name: /begin timeline scrub/i }));
    fireEvent.click(screen.getByRole("button", { name: /scrub to 50/i }));

    expect(screen.getByTestId("timeline-inspection-revision")).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: /end timeline scrub/i }));

    await waitFor(() => {
      expect(screen.getByTestId("timeline-inspection-revision")).toHaveTextContent("1");
    });
  });

  it("exposes a demo simulation speed control", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /set simulation speed 4/i })).toBeInTheDocument();
    });

    expect(screen.getByTestId("simulation-speed")).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: /set simulation speed 4/i }));

    expect(screen.getByTestId("simulation-speed")).toHaveTextContent("4");
  });

  it("keeps successful selection slices when one selected vehicle request fails", async () => {
    const services = createMockAppServices();
    const getPlaybackRoute = vi.fn(services.playbackRepository.getPlaybackRoute);
    getPlaybackRoute.mockImplementation((vehicleId, query) => {
      if (query.preset === "last24Hours") {
        return Promise.reject(new Error("current route unavailable"));
      }

      return services.playbackRepository.getPlaybackRoute(vehicleId, query);
    });

    renderWorkspace({
      ...services,
      playbackRepository: {
        ...services.playbackRepository,
        getPlaybackRoute,
      },
      liveFleetStateService: {
        supportsRouteBackedSimulation: false,
        createSnapshot: services.liveFleetStateService.createSnapshot,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));

    await waitFor(() => {
      expect(screen.getByTestId("selected-vehicle")).toHaveTextContent("veh-atlas-12");
      expect(screen.getByTestId("selection-error")).toHaveTextContent("current route");
      expect(screen.getByTestId("vehicle-detail-ids")).toHaveTextContent("veh-atlas-12");
      expect(Number(screen.getByTestId("historical-trip-count").textContent)).toBeGreaterThan(0);
      expect(screen.getByTestId("route-trip-count")).toHaveTextContent("0");
    });
  });

  it("surfaces initial vehicle load failures without leaving the provider loading forever", async () => {
    const services = createMockAppServices();

    renderWorkspace({
      ...services,
      fleetRepository: {
        ...services.fleetRepository,
        listVehicles: vi.fn().mockRejectedValue(new Error("fleet unavailable")),
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("vehicles-error")).toHaveTextContent("fleet unavailable");
      expect(screen.getByTestId("first-vehicle-position")).toHaveTextContent("none");
    });
  });

  it("loads route-backed simulation routes once during the initial vehicle load", async () => {
    const vehicle = createTestVehicle("veh-atlas-12");
    const route = createTestRoute(vehicle.id);
    const services = createMockAppServices();
    const getPlaybackRoute = vi.fn().mockResolvedValue(route);

    renderWorkspace({
      ...services,
      fleetRepository: {
        ...services.fleetRepository,
        listVehicles: vi.fn().mockResolvedValue([vehicle]),
      },
      playbackRepository: {
        ...services.playbackRepository,
        getPlaybackRoute,
      },
      liveFleetStateService: {
        supportsRouteBackedSimulation: true,
        createSnapshot: vi.fn((input) => ({
          vehicles: input.vehicles,
          vehicleDetailsById: input.vehicleDetailsById ?? {},
          selectedRoute: input.selectedVehicleId ? input.routesByVehicleId[input.selectedVehicleId] ?? null : null,
        })),
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("first-vehicle-position")).not.toHaveTextContent("none");
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getPlaybackRoute).toHaveBeenCalledTimes(1);
  });

  it("commits real-mode vehicle and selected route refreshes in the same live tick", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const initialVehicle: Vehicle = {
      ...createTestVehicle("veh-atlas-12"),
      latitude: 51.45,
      longitude: 5.48,
      heading: 95,
      lastUpdatedIso: "2026-03-29T08:10:00.000Z",
    };
    const updatedVehicle: Vehicle = {
      ...initialVehicle,
      latitude: 51.46,
      longitude: 5.5,
      heading: 101,
      lastUpdatedIso: "2026-03-29T08:15:00.000Z",
    };
    const initialRoute = createTestRoute(initialVehicle.id, "segment-initial");
    const updatedRoute: PlaybackRoute = {
      ...createTestRoute(initialVehicle.id, "segment-updated"),
      points: [
        ...initialRoute.points,
        { latitude: 51.46, longitude: 5.5, timestampIso: "2026-03-29T08:15:00.000Z", speedKph: 31, directionDegrees: 101 },
      ],
      tripSegments: [
        {
          ...initialRoute.tripSegments[0],
          id: "segment-updated",
          endTimeIso: "2026-03-29T08:15:00.000Z",
          endLabel: "08:15",
        },
      ],
    };
    const vehicleRefresh = createDeferred<Vehicle[]>();
    const routeRefresh = createDeferred<PlaybackRoute | null>();
    const services = createMockAppServices();
    const listVehicles = vi
      .fn()
      .mockResolvedValueOnce([initialVehicle])
      .mockImplementationOnce(() => vehicleRefresh.promise)
      .mockResolvedValue([updatedVehicle]);
    const getPlaybackRoute = vi.fn((vehicleId: string, query) => {
      if (query.preset === "yesterday") {
        return Promise.resolve(createTestRoute(vehicleId, "historical-segment"));
      }

      if (getPlaybackRoute.mock.calls.filter(([, routeQuery]) => routeQuery.preset !== "yesterday").length === 1) {
        return Promise.resolve(initialRoute);
      }

      return routeRefresh.promise;
    });

    renderWorkspace({
      ...services,
      fleetRepository: {
        ...services.fleetRepository,
        listVehicles,
        getVehicleDetail: vi.fn((vehicleId) => Promise.resolve(createTestVehicleDetail(vehicleId))),
      },
      playbackRepository: {
        ...services.playbackRepository,
        getPlaybackRoute,
      },
      liveFleetStateService: {
        supportsRouteBackedSimulation: false,
        createSnapshot: services.liveFleetStateService.createSnapshot,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));

    await waitFor(() => {
      expect(screen.getByTestId("last-route-segment")).toHaveTextContent("segment-initial");
      expect(screen.getByTestId("route-point-count")).toHaveTextContent("2");
      expect(screen.getByTestId("first-vehicle-position")).toHaveTextContent("51.450000,5.480000,95");
      expect(screen.getByTestId("last-route-point")).toHaveTextContent("51.450000,5.480000,2026-03-29T08:10:00.000Z");
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("100");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_DATA_REFRESH_INTERVAL_MS.fleetVehicles);
    });

    await act(async () => {
      vehicleRefresh.resolve([updatedVehicle]);
      await Promise.resolve();
    });

    expect(screen.getByTestId("first-vehicle-position")).toHaveTextContent("51.450000,5.480000,95");
    expect(screen.getByTestId("last-route-point")).toHaveTextContent("51.450000,5.480000,2026-03-29T08:10:00.000Z");

    await act(async () => {
      routeRefresh.resolve(updatedRoute);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("last-route-segment")).toHaveTextContent("segment-updated");
      expect(screen.getByTestId("selected-segment")).toHaveTextContent("segment-updated");
      expect(screen.getByTestId("route-point-count")).toHaveTextContent("3");
      expect(screen.getByTestId("first-vehicle-position")).toHaveTextContent("51.460000,5.500000,101");
      expect(screen.getByTestId("last-route-point")).toHaveTextContent("51.460000,5.500000,2026-03-29T08:15:00.000Z");
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("100");
    });
  });

  it("keeps the inspected historical position stable when real-mode route history grows", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const initialVehicle: Vehicle = {
      ...createTestVehicle("veh-atlas-12"),
      latitude: 51.45,
      longitude: 5.48,
      heading: 95,
      lastUpdatedIso: "2026-03-29T08:10:00.000Z",
    };
    const updatedVehicle: Vehicle = {
      ...initialVehicle,
      latitude: 51.46,
      longitude: 5.5,
      heading: 101,
      lastUpdatedIso: "2026-03-29T08:15:00.000Z",
    };
    const initialRoute = createTestRoute(initialVehicle.id, "segment-initial");
    const updatedRoute: PlaybackRoute = {
      ...createTestRoute(initialVehicle.id, "segment-updated"),
      points: [
        ...initialRoute.points,
        { latitude: 51.46, longitude: 5.5, timestampIso: "2026-03-29T08:15:00.000Z", speedKph: 31, directionDegrees: 101 },
      ],
      tripSegments: [
        {
          ...initialRoute.tripSegments[0],
          id: "segment-updated",
          endTimeIso: "2026-03-29T08:15:00.000Z",
          endLabel: "08:15",
        },
      ],
    };
    const vehicleRefresh = createDeferred<Vehicle[]>();
    const routeRefresh = createDeferred<PlaybackRoute | null>();
    const services = createMockAppServices();
    const listVehicles = vi
      .fn()
      .mockResolvedValueOnce([initialVehicle])
      .mockImplementationOnce(() => vehicleRefresh.promise)
      .mockResolvedValue([updatedVehicle]);
    const getPlaybackRoute = vi.fn((vehicleId: string, query) => {
      if (query.preset === "yesterday") {
        return Promise.resolve(createTestRoute(vehicleId, "historical-segment"));
      }

      if (getPlaybackRoute.mock.calls.filter(([, routeQuery]) => routeQuery.preset !== "yesterday").length === 1) {
        return Promise.resolve(initialRoute);
      }

      return routeRefresh.promise;
    });

    renderWorkspace({
      ...services,
      fleetRepository: {
        ...services.fleetRepository,
        listVehicles,
        getVehicleDetail: vi.fn((vehicleId) => Promise.resolve(createTestVehicleDetail(vehicleId))),
      },
      playbackRepository: {
        ...services.playbackRepository,
        getPlaybackRoute,
      },
      liveFleetStateService: {
        supportsRouteBackedSimulation: false,
        createSnapshot: services.liveFleetStateService.createSnapshot,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));

    await waitFor(() => {
      expect(screen.getByTestId("last-route-segment")).toHaveTextContent("segment-initial");
      expect(screen.getByTestId("playback-progress")).toHaveTextContent("100");
    });

    fireEvent.click(screen.getByRole("button", { name: /scrub to 50/i }));

    await waitFor(() => {
      expect(screen.getByTestId("playback-position")).toHaveTextContent("51.445000,5.470000");
    });
    const inspectedPlaybackPosition = screen.getByTestId("playback-position").textContent;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_DATA_REFRESH_INTERVAL_MS.fleetVehicles);
    });

    await act(async () => {
      vehicleRefresh.resolve([updatedVehicle]);
      routeRefresh.resolve(updatedRoute);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("last-route-point")).toHaveTextContent("51.460000,5.500000,2026-03-29T08:15:00.000Z");
      expect(screen.getByTestId("playback-position")).toHaveTextContent(inspectedPlaybackPosition ?? "");
    });
  });

  it("clears stale selected vehicle state and pinned overlays when vehicles disappear", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const services = createMockAppServices();
    const atlas = createTestVehicle("veh-atlas-12");
    const delta = createTestVehicle("veh-delta-24");
    const listVehicles = vi.fn().mockResolvedValueOnce([atlas]).mockResolvedValue([delta]);

    renderWorkspace({
      ...services,
      fleetRepository: {
        ...services.fleetRepository,
        listVehicles,
        getVehicleDetail: vi.fn((vehicleId) => Promise.resolve(createTestVehicleDetail(vehicleId))),
      },
      playbackRepository: {
        ...services.playbackRepository,
        getPlaybackRoute: vi.fn((vehicleId, query) =>
          Promise.resolve(createTestRoute(vehicleId, query.preset === "yesterday" ? "historical-segment" : "segment-1")),
        ),
      },
      liveFleetStateService: {
        supportsRouteBackedSimulation: false,
        createSnapshot: services.liveFleetStateService.createSnapshot,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select veh-atlas-12/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /select veh-atlas-12/i }));
    fireEvent.click(screen.getByRole("button", { name: /^pin atlas$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("selected-vehicle")).toHaveTextContent("veh-atlas-12");
      expect(screen.getByTestId("active-overlay")).toHaveTextContent("veh-atlas-12");
      expect(screen.getByTestId("pins")).toHaveTextContent("veh-atlas-12");
      expect(screen.getByTestId("route-trip-count")).toHaveTextContent("1");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_DATA_REFRESH_INTERVAL_MS.fleetVehicles);
    });

    await waitFor(() => {
      expect(screen.getByTestId("selected-vehicle")).toHaveTextContent("none");
      expect(screen.getByTestId("active-overlay")).toHaveTextContent("none");
      expect(screen.getByTestId("pins")).toHaveTextContent("");
      expect(screen.getByTestId("vehicle-detail-ids")).not.toHaveTextContent("veh-atlas-12");
      expect(screen.getByTestId("route-trip-count")).toHaveTextContent("0");
    });
  });

  it("does not re-render layout consumers when vehicle data updates", async () => {
    let layoutRenderCount = 0;
    let dataRenderCount = 0;

    const LayoutConsumer = memo(function LayoutConsumer() {
      layoutRenderCount += 1;
      useLiveFleetLayoutState();
      return <div data-testid="layout-render-count">{layoutRenderCount}</div>;
    });

    const DataConsumer = memo(function DataConsumer() {
      dataRenderCount += 1;
      const { vehicles } = useLiveFleetVehicleData();
      return (
        <div data-testid="first-live-vehicle-position">
          {vehicles[0] ? `${vehicles[0].latitude.toFixed(6)},${vehicles[0].longitude.toFixed(6)}` : "none"}
        </div>
      );
    });

    renderWorkspaceChildren(
      <>
        <LayoutConsumer />
        <DataConsumer />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("first-live-vehicle-position")).not.toHaveTextContent("none");
    });

    const layoutRenderCountAfterLoad = layoutRenderCount;
    const dataRenderCountAfterLoad = dataRenderCount;
    const initialPosition = screen.getByTestId("first-live-vehicle-position").textContent;

    await waitFor(() => {
      expect(screen.getByTestId("first-live-vehicle-position").textContent).not.toBe(initialPosition);
    }, { timeout: 2_500 });

    expect(dataRenderCount).toBeGreaterThan(dataRenderCountAfterLoad);
    expect(layoutRenderCount).toBe(layoutRenderCountAfterLoad);
  }, 8_000);
});
