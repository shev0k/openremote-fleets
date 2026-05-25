import L from "leaflet";

export type MapTileType = "default" | "satellite" | "terrain";
export type MapThemeMode = "light" | "dark";

export interface TileConfig {
  url: string;
  attribution: string;
}

export const DEFAULT_CENTER: [number, number] = [51.4416, 5.4697];
export const DEFAULT_ZOOM = 13;

export function getStableLeafletMapOptions(): L.MapOptions {
  return {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: false,
    attributionControl: false,
    zoomAnimation: true,
    markerZoomAnimation: true,
    fadeAnimation: true,
  };
}

export function getTileConfig(mapType: MapTileType, themeMode: MapThemeMode): TileConfig {
  if (mapType === "satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri",
    };
  }

  if (mapType === "terrain") {
    return {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
    };
  }

  return {
    url:
      themeMode === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: themeMode === "dark" ? "&copy; OpenStreetMap contributors &copy; CARTO" : "&copy; OpenStreetMap contributors",
  };
}

export function getTileLayerClassName(mapType: MapTileType, themeMode: MapThemeMode) {
  if (mapType !== "default") {
    return "";
  }

  return themeMode === "light"
    ? "map-tile-light-detailed"
    : "map-tile-dark-neutral-readable";
}
