import { useEffect, useRef } from "react";
import L from "leaflet";
import { RouteSegmentMarker } from "../../../../domain/models/playback";
import {
  DEFAULT_APP_PREFERENCES,
  formatTimeByPreference,
  type AppMapColorPreferences,
  type AppTimeFormat,
} from "../../../../domain/models/preferences";
import {
  RouteTooltipThemeMode,
  buildRouteTooltipHtml,
  escapeTooltipText,
  getRouteTooltipClassName,
  getRouteTooltipPalette,
} from "./routeTooltip";

interface RouteStopMarkersProps {
  map: L.Map | null;
  markers: RouteSegmentMarker[];
  themeMode: RouteTooltipThemeMode;
  mapColors?: AppMapColorPreferences;
  timeFormat?: AppTimeFormat;
}

export const ROUTE_STOP_MARKER_SIZE = 22;
const ROUTE_STOP_MARKER_ANCHOR = ROUTE_STOP_MARKER_SIZE / 2;

const MARKER_META: Record<RouteSegmentMarker["type"], { label: string; path: string }> = {
  stop: {
    label: "Stop",
    path: "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-3 6h6v2H9v-2Z",
  },
  idle: {
    label: "Idling",
    path: "M8 5h3v14H8V5Zm5 0h3v14h-3V5Z",
  },
  break: {
    label: "Break",
    path: "M7 5h10v7a5 5 0 0 1-10 0V5Zm10 3h1a3 3 0 0 1 0 6h-1V8Zm0 2v2h1a1 1 0 0 0 0-2h-1ZM6 19h12v2H6v-2Z",
  },
  engineOff: {
    label: "Engine off",
    path: "M12 3v8m5.66-4.66A8 8 0 1 1 6.34 6.34",
  },
  offline: {
    label: "Offline",
    path: "M12 3v8m5.66-4.66A8 8 0 1 1 6.34 6.34",
  },
  signal: {
    label: "Signal",
    path: "M4 13a11 11 0 0 1 16 0l-2 2a8 8 0 0 0-12 0l-2-2Zm4 4a5 5 0 0 1 8 0l-2 2a2 2 0 0 0-4 0l-2-2Z",
  },
  alarm: {
    label: "Alarm",
    path: "M12 4 21 20H3L12 4Zm-1 6v4h2v-4h-2Zm0 6v2h2v-2h-2Z",
  },
};

export function getRouteStopMarkerColor(marker: RouteSegmentMarker, mapColors: AppMapColorPreferences) {
  if (marker.type === "alarm") return mapColors.vehicleAlerting;
  if (marker.type === "break") return mapColors.vehicleDriverBreak;
  if (marker.type === "engineOff") return mapColors.vehicleParked;
  if (marker.type === "offline") return mapColors.vehicleOffline;
  if (marker.type === "signal") return mapColors.vehicleSignalDegraded;
  if (marker.type === "idle" || marker.type === "stop") return mapColors.vehicleIdling;
  return mapColors.vehicleStationary;
}

function createStopIcon(marker: RouteSegmentMarker, mapColors: AppMapColorPreferences) {
  const meta = MARKER_META[marker.type];
  const color = getRouteStopMarkerColor(marker, mapColors);
  const strokeOnly = marker.type === "engineOff" || marker.type === "offline";

  return L.divIcon({
    className: "route-stop-marker",
    html: `
      <div style="
        width: ${ROUTE_STOP_MARKER_SIZE}px;
        height: ${ROUTE_STOP_MARKER_SIZE}px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.72);
        border: 2px solid ${color};
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.22);
      ">
        <svg viewBox="0 0 24 24" width="12" height="12" ${strokeOnly ? `fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"` : `fill="${color}"`} aria-hidden="true">
          <path d="${meta.path}"></path>
        </svg>
      </div>
    `,
    iconSize: [ROUTE_STOP_MARKER_SIZE, ROUTE_STOP_MARKER_SIZE],
    iconAnchor: [ROUTE_STOP_MARKER_ANCHOR, ROUTE_STOP_MARKER_ANCHOR],
  });
}

function getMarkerTitle(marker: RouteSegmentMarker) {
  const meta = MARKER_META[marker.type];
  const duration = marker.durationMinutes ? ` (${marker.durationMinutes} min)` : "";
  return `${marker.label ?? meta.label}${duration}`;
}

function getStopTooltip(
  marker: RouteSegmentMarker,
  themeMode: RouteTooltipThemeMode,
  mapColors: AppMapColorPreferences,
  timeFormat: AppTimeFormat,
) {
  const meta = MARKER_META[marker.type];
  const color = getRouteStopMarkerColor(marker, mapColors);
  const palette = getRouteTooltipPalette(themeMode);
  const title = marker.label ?? meta.label;
  const duration = marker.durationMinutes ? `${marker.durationMinutes} min` : "Instant event";
  const timeLabel = formatTimeByPreference(marker.timestampIso, timeFormat);

  return buildRouteTooltipHtml({
    themeMode,
    body: `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:14px; font-weight:700;">
        <span>${escapeTooltipText(title)}</span>
        <span style="display:inline-flex; align-items:center; justify-content:center; min-width:64px; padding:4px 8px; border-radius:999px; background:${color}18; color:${color}; font-size:11px; font-weight:700; text-transform:uppercase;">${escapeTooltipText(meta.label)}</span>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid ${palette.border}; padding-top:8px; font-size:12px;">
        <span style="color:${palette.subtle}; text-transform:uppercase; letter-spacing:0.08em;">Time</span>
        <span style="font-weight:700;">${escapeTooltipText(timeLabel)}</span>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
        <span style="color:${palette.subtle}; text-transform:uppercase; letter-spacing:0.08em;">Duration</span>
        <span style="font-weight:700; color:${color};">${escapeTooltipText(duration)}</span>
      </div>
    `,
  });
}

export function RouteStopMarkers({
  map,
  markers,
  themeMode,
  mapColors = DEFAULT_APP_PREFERENCES.mapColors,
  timeFormat = DEFAULT_APP_PREFERENCES.behavior.timeFormat,
}: RouteStopMarkersProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerRef.current;
    layer.clearLayers();

    markers.forEach((marker) => {
      L.marker([marker.latitude, marker.longitude], {
        icon: createStopIcon(marker, mapColors),
        title: getMarkerTitle(marker),
      })
        .bindTooltip(getStopTooltip(marker, themeMode, mapColors, timeFormat), {
          direction: "top",
          offset: [0, -18],
          className: getRouteTooltipClassName(),
        })
        .addTo(layer);
    });

    return () => {
      layer.clearLayers();
    };
  }, [map, mapColors, markers, themeMode, timeFormat]);

  useEffect(() => {
    return () => {
      if (map && layerRef.current) {
        map.removeLayer(layerRef.current);
      }
      layerRef.current = null;
    };
  }, [map]);

  return null;
}
