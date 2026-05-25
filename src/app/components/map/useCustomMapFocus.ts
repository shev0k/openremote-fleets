import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import L from "leaflet";
import { hasValidVehicleLocation, type Vehicle } from "../../../domain/models/vehicle";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "./mapTileConfig";
import {
  DEFAULT_FLEET_FIT_PADDING,
  getFleetBounds,
  getMapFocusDecision,
  getMapFocusTravelAnimation,
  getOffsetFocusLatLng,
  getRouteBounds,
  getRouteFitBoundsOptions,
  getSelectedVehicleFocusOptions,
  getVehicleFocusTravelAnimation,
  SELECTED_VEHICLE_FOCUS_ZOOM,
  VEHICLE_FOCUS_TRAVEL_CLASS,
  type DefaultFitScope,
  type MapFocusTravelAnimation,
} from "./mapFocus";

interface FitDefaultMapBoundsParams {
  map: L.Map;
  vehicles: Vehicle[];
  routeLine: [number, number][];
  fitPaddingBottomPx: number;
  defaultFitScope: DefaultFitScope;
  animate?: boolean;
}

interface UseCustomMapFocusParams {
  mapElementRef: MutableRefObject<HTMLDivElement | null>;
  mapInstanceRef: MutableRefObject<L.Map | null>;
  vehicles: Vehicle[];
  routeLine: [number, number][];
  fitPaddingBottomPx: number;
  defaultFitScope: DefaultFitScope;
  selectedVehicleId?: string | null;
  routeFitKey: string;
  shouldUseSegmentRouteLayer: boolean;
  isRouteLoading: boolean;
}

interface CustomMapFocusActions {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  refreshLayout: () => void;
}

function useSyncedRef<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

export function fitDefaultMapBounds({
  map,
  vehicles,
  routeLine,
  fitPaddingBottomPx,
  defaultFitScope,
  animate = true,
}: FitDefaultMapBoundsParams) {
  const vehiclesWithLocation = vehicles.filter(hasValidVehicleLocation);

  if (defaultFitScope === "route" && routeLine.length > 1) {
    map.fitBounds(getRouteBounds(routeLine), getRouteFitBoundsOptions(fitPaddingBottomPx, animate));
    return;
  }

  if (vehiclesWithLocation.length > 1) {
    map.fitBounds(getFleetBounds(vehiclesWithLocation), {
      padding: DEFAULT_FLEET_FIT_PADDING,
      maxZoom: 13,
      animate,
    });
    return;
  }

  if (vehiclesWithLocation.length === 1) {
    map.setView([vehiclesWithLocation[0].latitude, vehiclesWithLocation[0].longitude], 14, { animate });
    return;
  }

  if (routeLine.length > 1) {
    map.fitBounds(getRouteBounds(routeLine), getRouteFitBoundsOptions(fitPaddingBottomPx, animate));
    return;
  }

  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate });
}

function clearFocusTravelProperties(element: HTMLElement) {
  element.classList.remove(VEHICLE_FOCUS_TRAVEL_CLASS);
  element.style.removeProperty("--custom-map-focus-translate-x");
  element.style.removeProperty("--custom-map-focus-translate-y");
  element.style.removeProperty("--custom-map-focus-scale");
}

export function resetMapFocusTravelElement(
  element: HTMLElement | null,
  timeoutRef: MutableRefObject<number | null>,
) {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  if (element) {
    clearFocusTravelProperties(element);
  }
}

export function playMapFocusTravel(
  mapElement: HTMLElement | null,
  timeoutRef: MutableRefObject<number | null>,
  animation: MapFocusTravelAnimation,
) {
  if (!animation || !mapElement) {
    return;
  }

  resetMapFocusTravelElement(mapElement, timeoutRef);

  mapElement.classList.remove(animation.className);
  mapElement.style.setProperty("--custom-map-focus-translate-x", `${animation.translateX}px`);
  mapElement.style.setProperty("--custom-map-focus-translate-y", `${animation.translateY}px`);
  mapElement.style.setProperty("--custom-map-focus-scale", String(animation.scale));
  void mapElement.offsetWidth;
  mapElement.classList.add(animation.className);

  timeoutRef.current = window.setTimeout(() => {
    clearFocusTravelProperties(mapElement);
    timeoutRef.current = null;
  }, animation.resetDelayMs);
}

export function useCustomMapFocus({
  mapElementRef,
  mapInstanceRef,
  vehicles,
  routeLine,
  fitPaddingBottomPx,
  defaultFitScope,
  selectedVehicleId,
  routeFitKey,
  shouldUseSegmentRouteLayer,
  isRouteLoading,
}: UseCustomMapFocusParams): CustomMapFocusActions {
  const hasFittedInitialBoundsRef = useRef(false);
  const lastFittedRouteFitKeyRef = useRef("");
  const previousSelectedVehicleIdRef = useRef<string | null>(null);
  const focusTravelTimeoutRef = useRef<number | null>(null);
  const refreshLayoutTimeoutRef = useRef<number | null>(null);
  const vehiclesRef = useSyncedRef(vehicles);
  const routeLineRef = useSyncedRef(routeLine);
  const fitPaddingBottomPxRef = useSyncedRef(fitPaddingBottomPx);
  const defaultFitScopeRef = useSyncedRef(defaultFitScope);

  const fitDefaultBounds = useCallback((options: { animate?: boolean } = {}) => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    fitDefaultMapBounds({
      map,
      vehicles: vehiclesRef.current,
      routeLine: routeLineRef.current,
      fitPaddingBottomPx: fitPaddingBottomPxRef.current,
      defaultFitScope: defaultFitScopeRef.current,
      animate: options.animate ?? true,
    });
  }, [defaultFitScopeRef, fitPaddingBottomPxRef, mapInstanceRef, routeLineRef, vehiclesRef]);

  const playFocusTravel = useCallback(
    (animation: MapFocusTravelAnimation) => {
      playMapFocusTravel(mapElementRef.current, focusTravelTimeoutRef, animation);
    },
    [mapElementRef],
  );

  const refreshLayout = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    map.invalidateSize({ animate: false });
    fitDefaultBounds();
    if (refreshLayoutTimeoutRef.current !== null) {
      window.clearTimeout(refreshLayoutTimeoutRef.current);
    }
    refreshLayoutTimeoutRef.current = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      fitDefaultBounds();
      refreshLayoutTimeoutRef.current = null;
    }, 180);
  }, [fitDefaultBounds, mapInstanceRef]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    const currentVehicles = vehiclesRef.current;
    const focusDecision = getMapFocusDecision({
      vehicles: currentVehicles,
      selectedVehicleId,
      previousSelectedVehicleId: previousSelectedVehicleIdRef.current,
      hasFittedInitialBounds: hasFittedInitialBoundsRef.current,
      defaultFitScope,
      routeFitKey,
      lastFittedRouteFitKey: lastFittedRouteFitKeyRef.current,
    });

    if (focusDecision.type === "selectedVehicle") {
      map.stop();
      const focusTarget = getOffsetFocusLatLng(
        map,
        [focusDecision.latitude, focusDecision.longitude],
        SELECTED_VEHICLE_FOCUS_ZOOM,
        fitPaddingBottomPx,
      );
      const focusOptions = getSelectedVehicleFocusOptions(isRouteLoading);
      if (isRouteLoading) {
        const previousCenter = map.getCenter();
        const previousZoom = map.getZoom();
        const finalCenter = L.latLng(focusTarget as L.LatLngExpression);
        const focusTravelAnimation = getVehicleFocusTravelAnimation({
          isRouteLoading,
          previousCenter,
          previousZoom,
          finalCenter,
          finalZoom: SELECTED_VEHICLE_FOCUS_ZOOM,
          containerSize: map.getSize(),
          project: (latLng, zoom) => map.project(latLng, zoom),
        });
        map.setView(finalCenter, SELECTED_VEHICLE_FOCUS_ZOOM, { animate: false });
        playFocusTravel(focusTravelAnimation);
      } else {
        map.flyTo(focusTarget as L.LatLngExpression, SELECTED_VEHICLE_FOCUS_ZOOM, focusOptions);
      }
      hasFittedInitialBoundsRef.current = true;
      previousSelectedVehicleIdRef.current = selectedVehicleId ?? null;
      return;
    }

    if (focusDecision.type === "initialFit") {
      if (currentVehicles.length === 0 && routeLineRef.current.length === 0) {
        return;
      }
      const shouldUseRouteFitTravel = shouldUseSegmentRouteLayer && defaultFitScope === "route";
      const previousCenter = shouldUseRouteFitTravel ? map.getCenter() : null;
      const previousZoom = shouldUseRouteFitTravel ? map.getZoom() : null;
      fitDefaultBounds({ animate: !shouldUseRouteFitTravel });
      if (shouldUseRouteFitTravel && previousCenter && typeof previousZoom === "number") {
        playFocusTravel(
          getMapFocusTravelAnimation({
            isEnabled: true,
            previousCenter,
            previousZoom,
            finalCenter: map.getCenter(),
            finalZoom: map.getZoom(),
            containerSize: map.getSize(),
            project: (latLng, zoom) => map.project(latLng, zoom),
          }),
        );
      }
      hasFittedInitialBoundsRef.current = true;
      if (routeFitKey) {
        lastFittedRouteFitKeyRef.current = routeFitKey;
        previousSelectedVehicleIdRef.current = selectedVehicleId ?? null;
      }
      return;
    }

    if (focusDecision.type === "clearedSelection") {
      fitDefaultBounds();
      previousSelectedVehicleIdRef.current = null;
    }
  }, [
    defaultFitScope,
    fitDefaultBounds,
    fitPaddingBottomPx,
    isRouteLoading,
    mapInstanceRef,
    playFocusTravel,
    routeFitKey,
    routeLineRef,
    selectedVehicleId,
    shouldUseSegmentRouteLayer,
    vehicles.length,
    vehiclesRef,
  ]);

  useEffect(() => {
    return () => {
      resetMapFocusTravelElement(mapElementRef.current, focusTravelTimeoutRef);

      if (refreshLayoutTimeoutRef.current !== null) {
        window.clearTimeout(refreshLayoutTimeoutRef.current);
        refreshLayoutTimeoutRef.current = null;
      }
    };
  }, [mapElementRef]);

  return useMemo(
    () => ({
      zoomIn: () => mapInstanceRef.current?.zoomIn(undefined, { animate: true }),
      zoomOut: () => mapInstanceRef.current?.zoomOut(undefined, { animate: true }),
      resetView: () => fitDefaultBounds(),
      refreshLayout,
    }),
    [fitDefaultBounds, mapInstanceRef, refreshLayout],
  );
}
