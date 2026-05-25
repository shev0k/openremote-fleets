import L from "leaflet";
import { hasValidVehicleLocation, type Vehicle } from "../../../domain/models/vehicle";

export type DefaultFitScope = "route" | "fleet";

export type MapFocusDecision =
  | { type: "selectedVehicle"; latitude: number; longitude: number }
  | { type: "initialFit" }
  | { type: "clearedSelection" }
  | { type: "none" };

export const DEFAULT_FLEET_FIT_PADDING: L.PointTuple = [52, 52];
export const DEFAULT_ROUTE_FIT_PADDING = 72;
export const SELECTED_VEHICLE_FOCUS_ZOOM = 14;
export const VEHICLE_FOCUS_TRAVEL_CLASS = "custom-map-focus-travel";

const VEHICLE_FOCUS_TRAVEL_RESET_MS = 620;
const VEHICLE_FOCUS_TRAVEL_MAX_X_RATIO = 0.32;
const VEHICLE_FOCUS_TRAVEL_MAX_Y_RATIO = 0.24;
const VEHICLE_FOCUS_TRAVEL_MIN_SCALE = 0.94;
const VEHICLE_FOCUS_TRAVEL_MAX_SCALE = 1.06;

export interface FocusTravelPoint {
  x: number;
  y: number;
}

export type MapFocusTravelAnimation = ReturnType<typeof getMapFocusTravelAnimation>;

export interface MapFocusTravelAnimationParams {
  isEnabled?: boolean;
  previousCenter?: L.LatLng;
  previousZoom?: number;
  finalCenter?: L.LatLng;
  finalZoom?: number;
  containerSize?: FocusTravelPoint;
  project?: (latLng: L.LatLng, zoom: number) => FocusTravelPoint;
}

interface ProjectedFocusPoint<TPoint> {
  add: (offset: [number, number]) => TPoint;
}

interface FocusProjectionMap<TPoint = unknown> {
  project: (latLng: [number, number], zoom: number) => ProjectedFocusPoint<TPoint>;
  unproject: (point: TPoint, zoom: number) => L.LatLng | unknown;
}

export function getRouteBounds(routeLine: [number, number][]) {
  return L.latLngBounds(routeLine.map((point) => L.latLng(point[0], point[1])));
}

export function getFleetBounds(vehicles: Vehicle[]) {
  return L.latLngBounds(
    vehicles
      .filter(hasValidVehicleLocation)
      .map((vehicle) => L.latLng(vehicle.latitude, vehicle.longitude)),
  );
}

export function getRouteFitKey(routeLine: [number, number][], fitPaddingBottomPx = 0, routeIdentity = "") {
  if (routeLine.length <= 1) {
    return "";
  }

  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  routeLine.forEach(([latitude, longitude]) => {
    south = Math.min(south, latitude);
    west = Math.min(west, longitude);
    north = Math.max(north, latitude);
    east = Math.max(east, longitude);
  });

  if (![south, west, north, east].every(Number.isFinite)) {
    return "";
  }

  return [
    routeIdentity || "route",
    routeLine.length,
    south.toFixed(6),
    west.toFixed(6),
    north.toFixed(6),
    east.toFixed(6),
    Math.max(0, Math.round(fitPaddingBottomPx)),
  ].join(":");
}

export function getRouteFitBoundsOptions(fitPaddingBottomPx = 0, animate = true): L.FitBoundsOptions {
  if (fitPaddingBottomPx <= 0) {
    return {
      padding: [DEFAULT_ROUTE_FIT_PADDING, DEFAULT_ROUTE_FIT_PADDING],
      maxZoom: 14,
      animate,
    };
  }

  return {
    paddingTopLeft: [DEFAULT_ROUTE_FIT_PADDING, DEFAULT_ROUTE_FIT_PADDING],
    paddingBottomRight: [DEFAULT_ROUTE_FIT_PADDING, DEFAULT_ROUTE_FIT_PADDING + fitPaddingBottomPx],
    maxZoom: 14,
    animate,
  };
}

export function getSelectedVehicleFocusOptions(isRouteLoading = false): L.ZoomPanOptions {
  return isRouteLoading ? { animate: true, duration: 0.55 } : { animate: true, duration: 0.75 };
}

export function getMapFocusTravelAnimation({
  isEnabled = false,
  previousCenter,
  previousZoom,
  finalCenter,
  finalZoom,
  containerSize,
  project,
}: MapFocusTravelAnimationParams) {
  if (
    !isEnabled ||
    !previousCenter ||
    typeof previousZoom !== "number" ||
    !Number.isFinite(previousZoom) ||
    !finalCenter ||
    typeof finalZoom !== "number" ||
    !Number.isFinite(finalZoom) ||
    !containerSize ||
    !project
  ) {
    return null;
  }

  const previousFinalPoint = project(finalCenter, previousZoom);
  const previousCenterPoint = project(previousCenter, previousZoom);
  const maxTranslateX = Math.max(120, containerSize.x * VEHICLE_FOCUS_TRAVEL_MAX_X_RATIO);
  const maxTranslateY = Math.max(96, containerSize.y * VEHICLE_FOCUS_TRAVEL_MAX_Y_RATIO);
  const rawScale = 2 ** (previousZoom - finalZoom);

  return {
    className: VEHICLE_FOCUS_TRAVEL_CLASS,
    resetDelayMs: VEHICLE_FOCUS_TRAVEL_RESET_MS,
    translateX: Math.round(Math.max(-maxTranslateX, Math.min(maxTranslateX, previousFinalPoint.x - previousCenterPoint.x))),
    translateY: Math.round(Math.max(-maxTranslateY, Math.min(maxTranslateY, previousFinalPoint.y - previousCenterPoint.y))),
    scale: Math.min(VEHICLE_FOCUS_TRAVEL_MAX_SCALE, Math.max(VEHICLE_FOCUS_TRAVEL_MIN_SCALE, Number(rawScale.toFixed(3)))),
  };
}

export function getVehicleFocusTravelAnimation({
  isRouteLoading = false,
  ...params
}: Omit<MapFocusTravelAnimationParams, "isEnabled"> & { isRouteLoading?: boolean }) {
  return getMapFocusTravelAnimation({ ...params, isEnabled: isRouteLoading });
}

export function getOffsetFocusLatLng<TPoint>(
  map: FocusProjectionMap<TPoint>,
  target: [number, number],
  zoom: number,
  fitPaddingBottomPx = 0,
) {
  if (fitPaddingBottomPx <= 0) {
    return L.latLng(target[0], target[1]);
  }

  const targetPoint = map.project(target, zoom);
  return map.unproject(targetPoint.add([0, fitPaddingBottomPx / 2]), zoom);
}

export function shouldRenderRouteSegmentLayer(shouldUseSegmentRouteLayer: boolean, isMapFocusAnimating: boolean) {
  void isMapFocusAnimating;
  return shouldUseSegmentRouteLayer;
}

export function getAnchoredFocusPanStart<TPoint>(
  map: FocusProjectionMap<TPoint>,
  finalCenter: L.LatLng,
  zoom: number,
  offset: [number, number] = [0, -84],
) {
  const finalPoint = map.project([finalCenter.lat, finalCenter.lng], zoom);
  return map.unproject(finalPoint.add(offset), zoom);
}

export function getSelectedVehicleFocusTarget(
  vehicles: Vehicle[],
  selectedVehicleId: string | null | undefined,
  previousSelectedVehicleId: string | null | undefined,
): { latitude: number; longitude: number } | null {
  if (!selectedVehicleId || selectedVehicleId === previousSelectedVehicleId) {
    return null;
  }

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId && hasValidVehicleLocation(vehicle));
  return selectedVehicle ? { latitude: selectedVehicle.latitude, longitude: selectedVehicle.longitude } : null;
}

export function getMapFocusDecision({
  vehicles,
  selectedVehicleId,
  previousSelectedVehicleId,
  hasFittedInitialBounds,
  defaultFitScope = "route",
  routeFitKey = "",
  lastFittedRouteFitKey = "",
}: {
  vehicles: Vehicle[];
  selectedVehicleId?: string | null;
  previousSelectedVehicleId?: string | null;
  hasFittedInitialBounds: boolean;
  defaultFitScope?: DefaultFitScope;
  routeFitKey?: string;
  lastFittedRouteFitKey?: string;
}): MapFocusDecision {
  if (defaultFitScope === "route" && routeFitKey && routeFitKey !== lastFittedRouteFitKey) {
    return { type: "initialFit" };
  }

  const selectedVehicleFocusTarget = getSelectedVehicleFocusTarget(vehicles, selectedVehicleId, previousSelectedVehicleId);

  if (selectedVehicleFocusTarget) {
    return {
      type: "selectedVehicle",
      ...selectedVehicleFocusTarget,
    };
  }

  if (!hasFittedInitialBounds && vehicles.some(hasValidVehicleLocation)) {
    return { type: "initialFit" };
  }

  if (!selectedVehicleId && previousSelectedVehicleId) {
    return { type: "clearedSelection" };
  }

  return { type: "none" };
}
