import { useEffect, type MutableRefObject } from "react";
import L from "leaflet";
import type { AppMapColorPreferences } from "../../../domain/models/preferences";
import { hasValidVehicleLocation, type Vehicle } from "../../../domain/models/vehicle";
import {
  getTileConfig,
  getTileLayerClassName,
  type MapThemeMode,
  type MapTileType,
} from "./mapTileConfig";
import { createIcon, createVehicleTooltipHtml } from "./vehicleMarkerHtml";
import { getWrappedMarkerPositions } from "./wrappedWorldMarkers";

type TileLayerFactory = (url: string, options?: L.TileLayerOptions) => L.TileLayer;
type MarkerFactory = (latLng: L.LatLngExpression, options?: L.MarkerOptions) => L.Marker;
type IconFactory = (vehicle: Vehicle, isSelected: boolean) => L.Icon | L.DivIcon;
type TooltipFactory = (vehicle: Vehicle) => string;
type PolylineFactory = (latLngs: L.LatLngExpression[] | L.LatLngExpression[][], options?: L.PolylineOptions) => L.Polyline;

interface SyncTileLayerParams {
  map: L.Map;
  tileLayerRef: MutableRefObject<L.TileLayer | null>;
  mapType: MapTileType;
  themeMode: MapThemeMode;
  createTileLayer?: TileLayerFactory;
}

interface SyncVehicleMarkerLayerParams {
  map: L.Map;
  markersRef: MutableRefObject<Record<string, L.Marker>>;
  vehicles: Vehicle[];
  selectedVehicleId?: string | null;
  onVehicleClick?: (vehicleId: string) => void;
  themeMode: MapThemeMode;
  mapColors: AppMapColorPreferences;
  createLeafletMarker?: MarkerFactory;
  createIconForVehicle?: IconFactory;
  createTooltipHtmlForVehicle?: TooltipFactory;
}

interface SyncPolylineLayerParams {
  map: L.Map;
  polylineRef: MutableRefObject<L.Polyline | null>;
  line: [number, number][];
  color: string;
  shouldRender: boolean;
  polylineOptions: Omit<L.PolylineOptions, "color">;
  createPolyline?: PolylineFactory;
}

interface UseTileLayerParams {
  mapInstanceRef: MutableRefObject<L.Map | null>;
  tileLayerRef: MutableRefObject<L.TileLayer | null>;
  mapType: MapTileType;
  themeMode: MapThemeMode;
}

interface UseVehicleMarkerLayerParams {
  mapInstanceRef: MutableRefObject<L.Map | null>;
  markersRef: MutableRefObject<Record<string, L.Marker>>;
  vehicles: Vehicle[];
  selectedVehicleId?: string | null;
  onVehicleClick?: (vehicleId: string) => void;
  themeMode: MapThemeMode;
  mapColors: AppMapColorPreferences;
}

interface UseRoutePolylineLayersParams {
  mapInstanceRef: MutableRefObject<L.Map | null>;
  routePolylineRef: MutableRefObject<L.Polyline | null>;
  activeSegmentPolylineRef: MutableRefObject<L.Polyline | null>;
  routeLine: [number, number][];
  activeSegmentLine: [number, number][];
  shouldUseSegmentRouteLayer: boolean;
  routeColor: string;
  activeRouteColor: string;
  themeMode: MapThemeMode;
}

export function syncTileLayer({
  map,
  tileLayerRef,
  mapType,
  themeMode,
  createTileLayer = L.tileLayer,
}: SyncTileLayerParams) {
  const tileConfig = getTileConfig(mapType, themeMode);

  if (tileLayerRef.current) {
    map.removeLayer(tileLayerRef.current);
  }

  tileLayerRef.current = createTileLayer(tileConfig.url, {
    maxZoom: 19,
    attribution: tileConfig.attribution,
    className: getTileLayerClassName(mapType, themeMode),
  }).addTo(map);
}

export function syncVehicleMarkerLayer({
  map,
  markersRef,
  vehicles,
  selectedVehicleId,
  onVehicleClick,
  themeMode,
  mapColors,
  createLeafletMarker = (latLng, options) => L.marker(latLng, options),
  createIconForVehicle = (vehicle, isSelected) => createIcon(vehicle, themeMode, isSelected, mapColors),
  createTooltipHtmlForVehicle = (vehicle) => createVehicleTooltipHtml(vehicle, themeMode, mapColors),
}: SyncVehicleMarkerLayerParams) {
  const vehiclesWithLocation = vehicles.filter(hasValidVehicleLocation);
  const markerEntries = vehiclesWithLocation.flatMap((vehicle) =>
    getWrappedMarkerPositions({
      map,
      vehicleId: vehicle.id,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
    }).map((position) => ({ vehicle, position })),
  );
  const currentMarkerKeys = new Set(markerEntries.map((entry) => entry.position.key));

  Object.entries(markersRef.current).forEach(([markerKey, marker]) => {
    if (!currentMarkerKeys.has(markerKey)) {
      map.removeLayer(marker);
      delete markersRef.current[markerKey];
    }
  });

  markerEntries.forEach(({ vehicle, position }) => {
    const marker = markersRef.current[position.key];
    const icon = createIconForVehicle(vehicle, selectedVehicleId === vehicle.id);

    if (marker) {
      marker.setLatLng(position.latLng);
      marker.setIcon(icon);
      marker.off?.("click");
      if (onVehicleClick) {
        marker.on("click", () => {
          onVehicleClick(vehicle.id);
        });
      }
    } else {
      const nextMarker = createLeafletMarker(position.latLng, { icon }).addTo(map);
      if (onVehicleClick) {
        nextMarker.on("click", () => {
          onVehicleClick(vehicle.id);
        });
      }
      markersRef.current[position.key] = nextMarker;
    }

    markersRef.current[position.key].bindTooltip(createTooltipHtmlForVehicle(vehicle), {
      direction: "top",
      offset: [0, -18],
      className: "!bg-transparent !border-0 !shadow-none !p-0",
    });
  });
}

export function syncPolylineLayer({
  map,
  polylineRef,
  line,
  color,
  shouldRender,
  polylineOptions,
  createPolyline = (latLngs, options) => L.polyline(latLngs, options),
}: SyncPolylineLayerParams) {
  if (shouldRender && line.length > 1) {
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(line);
      polylineRef.current.setStyle({ color });
      polylineRef.current.redraw();
    } else {
      polylineRef.current = createPolyline(line, {
        color,
        ...polylineOptions,
      }).addTo(map);
    }
  } else if (polylineRef.current) {
    map.removeLayer(polylineRef.current);
    polylineRef.current = null;
  }
}

export function useTileLayer({ mapInstanceRef, tileLayerRef, mapType, themeMode }: UseTileLayerParams) {
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    syncTileLayer({ map, tileLayerRef, mapType, themeMode });
  }, [mapInstanceRef, mapType, themeMode, tileLayerRef]);
}

export function useVehicleMarkerLayer({
  mapInstanceRef,
  markersRef,
  vehicles,
  selectedVehicleId,
  onVehicleClick,
  themeMode,
  mapColors,
}: UseVehicleMarkerLayerParams) {
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    const syncMarkers = () => syncVehicleMarkerLayer({
      map,
      markersRef,
      vehicles,
      selectedVehicleId,
      onVehicleClick,
      themeMode,
      mapColors,
    });

    syncMarkers();
    map.on("moveend zoomend resize viewreset", syncMarkers);

    return () => {
      map.off("moveend zoomend resize viewreset", syncMarkers);
    };
  }, [mapColors, mapInstanceRef, markersRef, onVehicleClick, selectedVehicleId, themeMode, vehicles]);
}

export function useRoutePolylineLayers({
  mapInstanceRef,
  routePolylineRef,
  activeSegmentPolylineRef,
  routeLine,
  activeSegmentLine,
  shouldUseSegmentRouteLayer,
  routeColor,
  activeRouteColor,
  themeMode,
}: UseRoutePolylineLayersParams) {
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    syncPolylineLayer({
      map,
      polylineRef: routePolylineRef,
      line: routeLine,
      color: routeColor,
      shouldRender: !shouldUseSegmentRouteLayer,
      polylineOptions: {
        opacity: 0.95,
        weight: 3,
        dashArray: "7 5",
        smoothFactor: 0,
      },
    });
  }, [mapInstanceRef, routeColor, routeLine, routePolylineRef, shouldUseSegmentRouteLayer]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    syncPolylineLayer({
      map,
      polylineRef: activeSegmentPolylineRef,
      line: activeSegmentLine,
      color: activeRouteColor,
      shouldRender: !shouldUseSegmentRouteLayer,
      polylineOptions: {
        opacity: 1,
        weight: 5,
        smoothFactor: 0,
      },
    });
  }, [activeRouteColor, activeSegmentLine, activeSegmentPolylineRef, mapInstanceRef, shouldUseSegmentRouteLayer, themeMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    const redrawOverlays = () => {
      routePolylineRef.current?.redraw();
      activeSegmentPolylineRef.current?.redraw();
    };

    map.on("moveend zoomend viewreset", redrawOverlays);
    return () => {
      map.off("moveend zoomend viewreset", redrawOverlays);
    };
  }, [activeSegmentPolylineRef, mapInstanceRef, routePolylineRef]);
}
