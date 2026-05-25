import { ArrowLeft, Maximize2, Minimize2, Radio } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { PlaybackRoute } from "../../domain/models/playback";
import { LIVE_DATA_REFRESH_INTERVAL_MS } from "../../domain/services/liveDataRefreshPolicy";
import { CustomMap, CustomMapHandle } from "../components/map/CustomMap";
import { ThemeToggleButton } from "../components/layout/ThemeToggleButton";
import { useAsyncPolling } from "../hooks/useAsyncPolling";
import { useFleetVehicles } from "../hooks/useFleetVehicles";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { useAppServices } from "../providers/AppServicesProvider";
import { WallDisplayTelemetryBar } from "../features/wall-display/WallDisplayTelemetryBar";
import { WallDisplayTimeline } from "../features/wall-display/WallDisplayTimeline";
import { applyWallDisplayDemoTelemetry } from "../features/wall-display/wallDisplayDemoTelemetry";
import { buildWallDisplayViewModel } from "../features/wall-display/wallDisplayViewModel";

const WALL_DISPLAY_SIMULATION_SPEED = 2;
const WALL_DISPLAY_ROUTE_QUERY = { preset: "last24Hours" } as const;

export function hasFullscreenElement() {
  return typeof document !== "undefined" && Boolean(document.fullscreenElement);
}

export function WallDisplay() {
  const { playbackRepository, liveFleetStateService } = useAppServices();
  const { preferences } = useAppPreferences();
  const fleetVehiclesQuery = useFleetVehicles();
  const isDemoMode = liveFleetStateService.supportsRouteBackedSimulation;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<CustomMapHandle | null>(null);
  const simulationStartedAtMsRef = useRef(Date.now());
  const [simulationRoutesByVehicleId, setSimulationRoutesByVehicleId] = useState<Record<string, PlaybackRoute>>({});
  const [routeLoadError, setRouteLoadError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [isFullscreenActive, setFullscreenActive] = useState(hasFullscreenElement);
  const vehicles = fleetVehiclesQuery.data;
  const loadError = fleetVehiclesQuery.error || routeLoadError ? "Fleet data is temporarily unavailable." : null;

  const refreshMapLayout = useCallback(() => {
    mapRef.current?.refreshLayout();
    window.requestAnimationFrame(() => {
      mapRef.current?.refreshLayout();
    });
    window.setTimeout(() => {
      mapRef.current?.refreshLayout();
    }, 280);
  }, []);

  const refreshVehicles = useCallback(async () => {
    await fleetVehiclesQuery.refresh();
  }, [fleetVehiclesQuery]);

  useAsyncPolling(refreshVehicles, LIVE_DATA_REFRESH_INTERVAL_MS.fleetVehicles);

  useEffect(() => {
    let isMounted = true;

    async function loadSimulationRoutes() {
      if (!isDemoMode) {
        setSimulationRoutesByVehicleId({});
        setRouteLoadError(null);
        return;
      }

      try {
        const routeEntries = await Promise.all(
          vehicles.map(async (vehicle) => [vehicle.id, await playbackRepository.getPlaybackRoute(vehicle.id, WALL_DISPLAY_ROUTE_QUERY)] as const),
        );

        if (!isMounted) {
          return;
        }

        setSimulationRoutesByVehicleId(
          Object.fromEntries(routeEntries.flatMap(([vehicleId, route]) => (route ? [[vehicleId, route]] : []))),
        );
        setRouteLoadError(null);
      } catch {
        if (isMounted) {
          setRouteLoadError("simulation-routes");
        }
      }
    }

    void loadSimulationRoutes();

    return () => {
      isMounted = false;
    };
  }, [isDemoMode, playbackRepository, vehicles]);

  useEffect(() => {
    const timerId = window.setInterval(() => setClock(new Date()), isDemoMode ? 5000 : 30000);
    return () => window.clearInterval(timerId);
  }, [isDemoMode]);

  useEffect(() => {
    function handleFullscreenChange() {
      setFullscreenActive(hasFullscreenElement());
      refreshMapLayout();
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [refreshMapLayout]);

  async function handleFullscreenToggle() {
    try {
      if (hasFullscreenElement()) {
        await document.exitFullscreen?.();
        return;
      }

      await rootRef.current?.requestFullscreen?.();
    } finally {
      refreshMapLayout();
    }
  }

  const routeMovedVehicles = useMemo(() => {
    if (!isDemoMode || !Object.keys(simulationRoutesByVehicleId).length) {
      return vehicles;
    }

    return liveFleetStateService.createSnapshot({
      vehicles,
      routesByVehicleId: simulationRoutesByVehicleId,
      nowMs: Math.max(0, (clock.valueOf() - simulationStartedAtMsRef.current) * WALL_DISPLAY_SIMULATION_SPEED),
    }).vehicles;
  }, [clock, isDemoMode, liveFleetStateService, simulationRoutesByVehicleId, vehicles]);
  const wallDisplayVehicles = useMemo(
    () => (isDemoMode ? applyWallDisplayDemoTelemetry(routeMovedVehicles, clock) : vehicles),
    [clock, isDemoMode, routeMovedVehicles, vehicles],
  );
  const viewModel = useMemo(
    () => buildWallDisplayViewModel(wallDisplayVehicles, clock, { timeFormat: preferences.behavior.timeFormat }),
    [clock, preferences.behavior.timeFormat, wallDisplayVehicles],
  );
  const FullscreenIcon = isFullscreenActive ? Minimize2 : Maximize2;

  return (
    <div ref={rootRef} className="relative h-screen overflow-hidden bg-map-surface text-content-primary">
      <CustomMap
        ref={mapRef}
        vehicles={wallDisplayVehicles}
        selectedVehicleId={null}
        mapType={preferences.behavior.defaultMapLayer}
      />

      <div className="pointer-events-none absolute inset-0 z-[1200]">
        <header className="absolute left-6 right-6 top-6 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <WallDisplayTimeline viewModel={viewModel} />
          </div>

          <div className="app-panel pointer-events-auto flex shrink-0 items-center gap-2 rounded-[20px] px-3 py-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-panel-muted px-3 py-2 text-[13px] font-semibold text-content-secondary">
              <Radio className={`h-4 w-4 ${loadError ? "text-warning" : "text-brand"}`} />
              {fleetVehiclesQuery.isLoading ? "Syncing" : loadError ? "Data fallback" : "Live monitor"}
            </span>
            <ThemeToggleButton />
            <button
              type="button"
              onClick={() => void handleFullscreenToggle()}
              className="app-control inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold"
              aria-label={isFullscreenActive ? "Exit fullscreen wall display" : "Enter fullscreen wall display"}
            >
              <FullscreenIcon className="h-4 w-4" />
              {isFullscreenActive ? "Exit fullscreen" : "Fullscreen"}
            </button>
            <Link to="/" className="app-control inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold">
              <ArrowLeft className="h-4 w-4" />
              Exit
            </Link>
          </div>
        </header>

        <div className="absolute bottom-6 left-6 right-6 flex justify-center">
          <WallDisplayTelemetryBar viewModel={viewModel} />
        </div>

        {loadError ? (
          <div className="app-panel pointer-events-auto absolute right-6 top-[108px] max-w-[360px] rounded-[22px] border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-content-primary">
            {loadError} Existing map context remains visible until the next successful refresh.
          </div>
        ) : null}
      </div>
    </div>
  );
}
