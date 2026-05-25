import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import { PlaybackRoute } from "../../../domain/models/playback";
import { Vehicle } from "../../../domain/models/vehicle";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import {
  getStableLeafletMapOptions,
  getTileConfig,
  getTileLayerClassName,
} from "./mapTileConfig";
import {
  getMapFocusDecision,
  getMapFocusTravelAnimation,
  getOffsetFocusLatLng,
  getRouteFitBoundsOptions,
  getRouteFitKey,
  getSelectedVehicleFocusOptions,
  getVehicleFocusTravelAnimation,
  shouldRenderRouteSegmentLayer,
} from "./mapFocus";
import { RouteSegmentLayer } from "./routeSegments/RouteSegmentLayer";
import { hasDrawableRouteSegments } from "./routeSegments/routeSegmentGeometry";
import {
  useRoutePolylineLayers,
  useTileLayer,
  useVehicleMarkerLayer,
} from "./useCustomMapLayers";
import { useCustomMapFocus } from "./useCustomMapFocus";
import { useLeafletMapLifecycle } from "./useLeafletMapLifecycle";
import { createVehicleTooltipHtml } from "./vehicleMarkerHtml";

export {
  getStableLeafletMapOptions,
  getTileConfig,
  getTileLayerClassName,
} from "./mapTileConfig";
export {
  getAnchoredFocusPanStart,
  getMapFocusDecision,
  getMapFocusTravelAnimation,
  getOffsetFocusLatLng,
  getRouteFitBoundsOptions,
  getRouteFitKey,
  getSelectedVehicleFocusOptions,
  getSelectedVehicleFocusTarget,
  getVehicleFocusTravelAnimation,
  shouldRenderRouteSegmentLayer,
} from "./mapFocus";
export {
  createVehicleMarkerHtml,
  createVehicleTooltipHtml,
  getReliableVehicleHeading,
} from "./vehicleMarkerHtml";

interface CustomMapProps {
  vehicles?: Vehicle[];
  selectedVehicleId?: string | null;
  onVehicleClick?: (vehicleId: string) => void;
  routeLine?: [number, number][];
  activeSegmentLine?: [number, number][];
  route?: PlaybackRoute | null;
  activeSegmentId?: string | null;
  onRouteSegmentClick?: (segmentId: string) => void;
  mapType?: "default" | "satellite" | "terrain";
  isRouteLoading?: boolean;
  fitPaddingBottomPx?: number;
  defaultFitScope?: "route" | "fleet";
}

export interface CustomMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  refreshLayout: () => void;
}

export const CustomMap = forwardRef<CustomMapHandle, CustomMapProps>(function CustomMap(
  {
    vehicles = [],
    selectedVehicleId,
    onVehicleClick,
    routeLine = [],
    activeSegmentLine = [],
    route = null,
    activeSegmentId = null,
    onRouteSegmentClick,
    mapType = "default",
    isRouteLoading = false,
    fitPaddingBottomPx = 0,
    defaultFitScope = "route",
  },
  ref,
) {
  const mapRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const activeSegmentPolylineRef = useRef<L.Polyline | null>(null);
  const { leafletMap, mapInstanceRef } = useLeafletMapLifecycle(mapRef);
  const { resolvedTheme } = useTheme();
  const { preferences } = useAppPreferences();

  const themeMode = resolvedTheme === "light" ? "light" : "dark";
  const mapColors = preferences.mapColors;
  const timeFormat = preferences.behavior.timeFormat;
  const shouldUseSegmentRouteLayer = hasDrawableRouteSegments(route);
  const routeFitKey = useMemo(
    () => getRouteFitKey(routeLine, fitPaddingBottomPx, route?.vehicleId ?? selectedVehicleId ?? ""),
    [fitPaddingBottomPx, route?.vehicleId, routeLine, selectedVehicleId],
  );
  const shouldRenderSegmentRouteLayer = shouldRenderRouteSegmentLayer(shouldUseSegmentRouteLayer, false);

  useTileLayer({
    mapInstanceRef,
    tileLayerRef,
    mapType,
    themeMode,
  });

  useVehicleMarkerLayer({
    mapInstanceRef,
    markersRef,
    vehicles,
    selectedVehicleId,
    onVehicleClick,
    themeMode,
    mapColors,
  });

  useRoutePolylineLayers({
    mapInstanceRef,
    routePolylineRef,
    activeSegmentPolylineRef,
    routeLine,
    activeSegmentLine,
    shouldUseSegmentRouteLayer,
    routeColor: mapColors.route,
    activeRouteColor: mapColors.routeActive,
    themeMode,
  });

  const mapActions = useCustomMapFocus({
    mapElementRef: mapRef,
    mapInstanceRef,
    vehicles,
    routeLine,
    fitPaddingBottomPx,
    defaultFitScope,
    selectedVehicleId,
    routeFitKey,
    shouldUseSegmentRouteLayer,
    isRouteLoading,
  });

  useImperativeHandle(ref, () => mapActions, [mapActions]);

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col">
      <div ref={mapRef} className="h-full w-full bg-map-surface" />
      <RouteSegmentLayer
        map={leafletMap}
        route={shouldRenderSegmentRouteLayer ? route : null}
        activeSegmentId={activeSegmentId}
        themeMode={themeMode}
        mapColors={mapColors}
        timeFormat={timeFormat}
        onSegmentClick={onRouteSegmentClick}
      />
    </div>
  );
});
