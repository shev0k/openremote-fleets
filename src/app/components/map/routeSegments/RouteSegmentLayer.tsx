import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { PlaybackRoute, RouteSegmentEventMarker, RouteSegmentMarker, TripSegment } from "../../../../domain/models/playback";
import type { AppMapColorPreferences, AppTimeFormat } from "../../../../domain/models/preferences";
import { RouteStopMarkers } from "./RouteStopMarkers";
import { getRouteSegmentLatLngs, getRouteSegmentPointIndex } from "./routeSegmentGeometry";
import { getRouteSegmentClassName, resolveRouteSegmentStyle } from "./routeSegmentStyles";
import {
  RouteTooltipThemeMode,
  buildRouteTooltipHtml,
  escapeTooltipText,
  getRouteTooltipClassName,
  getRouteTooltipPalette,
} from "./routeTooltip";

export const SEGMENT_REDRAW_EVENTS = "zoomend moveend viewreset resize";

interface RouteSegmentLayerProps {
  map: L.Map | null;
  route: PlaybackRoute | null;
  activeSegmentId?: string | null;
  themeMode: RouteTooltipThemeMode;
  mapColors?: AppMapColorPreferences;
  timeFormat?: AppTimeFormat;
  onSegmentClick?: (segmentId: string) => void;
}

function getSegmentSpeedColor(segment: TripSegment, segmentIndex = 0, mapColors?: AppMapColorPreferences) {
  const style = resolveRouteSegmentStyle(segment, { segmentIndex, mapColors });
  return style.color;
}

function getRouteSegmentCasingColor(themeMode: RouteTooltipThemeMode) {
  return themeMode === "light" ? "#ffffff" : "#000000";
}

function redrawRouteSegmentPolylines(layer: L.LayerGroup | null) {
  layer?.eachLayer((leafletLayer) => {
    if (leafletLayer instanceof L.Polyline) {
      leafletLayer.redraw();
    }
  });
}

export function getRouteSegmentMarkerModel(route: PlaybackRoute | null) {
  const stopMarkers: RouteSegmentMarker[] = [];

  route?.tripSegments.forEach((segment) => {
    stopMarkers.push(...(segment.markers ?? []));
    stopMarkers.push(...getSegmentAlarmMarkers(route, segment));
  });

  return { stopMarkers };
}

function getTimestampMs(timestampIso: string): number {
  const timestampMs = new Date(timestampIso).valueOf();
  return Number.isFinite(timestampMs) ? timestampMs : 0;
}

function getNearestPointForEvent(route: PlaybackRoute, segment: TripSegment, eventMarker: RouteSegmentEventMarker) {
  const startIndex = getRouteSegmentPointIndex(route.points.length, segment.startProgressPercent);
  const endIndex = Math.max(startIndex, getRouteSegmentPointIndex(route.points.length, segment.endProgressPercent));
  const segmentPoints = route.points.slice(startIndex, endIndex + 1);

  if (!segmentPoints.length) {
    return null;
  }

  const eventTimeMs = getTimestampMs(eventMarker.timestampIso);
  return segmentPoints.reduce((nearestPoint, point) => {
    const pointDistance = Math.abs(getTimestampMs(point.timestampIso) - eventTimeMs);
    const nearestDistance = Math.abs(getTimestampMs(nearestPoint.timestampIso) - eventTimeMs);

    return pointDistance < nearestDistance ? point : nearestPoint;
  }, segmentPoints[0]);
}

function getSegmentAlarmMarkers(route: PlaybackRoute, segment: TripSegment): RouteSegmentMarker[] {
  return (segment.eventMarkers ?? []).flatMap((eventMarker) => {
    if (eventMarker.eventType !== "alarm" || eventMarker.severity !== "critical") {
      return [];
    }

    const point = getNearestPointForEvent(route, segment, eventMarker);
    if (!point) {
      return [];
    }

    return [
      {
        id: eventMarker.id,
        type: "alarm",
        timestampIso: eventMarker.timestampIso,
        latitude: point.latitude,
        longitude: point.longitude,
        label: eventMarker.label,
      },
    ];
  });
}

export function getSegmentTooltip(
  segment: TripSegment,
  themeMode: RouteTooltipThemeMode,
  segmentIndex = 0,
  mapColors?: AppMapColorPreferences,
) {
  const palette = getRouteTooltipPalette(themeMode);
  const speedColor = getSegmentSpeedColor(segment, segmentIndex, mapColors);
  const tripLabel = `Trip ${segmentIndex + 1}`;

  return buildRouteTooltipHtml({
    themeMode,
    minWidth: 212,
    body: `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:14px; font-weight:700;">
        <span>${escapeTooltipText(segment.startLabel)} -> ${escapeTooltipText(segment.endLabel)}</span>
        <span style="display:inline-flex; align-items:center; justify-content:center; min-width:64px; padding:4px 8px; border-radius:999px; background:${speedColor}18; color:${speedColor}; font-size:11px; font-weight:700;">${tripLabel}</span>
      </div>
      <div style="font-size:12px; color:${palette.subtle};">${escapeTooltipText(segment.durationLabel)}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; border-top:1px solid ${palette.border}; padding-top:8px; font-size:12px;">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="color:${palette.subtle}; text-transform:uppercase; letter-spacing:0.08em;">Average</span>
          <span style="font-weight:700; color:${speedColor};">${escapeTooltipText(segment.averageSpeedLabel)}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="color:${palette.subtle}; text-transform:uppercase; letter-spacing:0.08em;">Distance</span>
          <span style="font-weight:700;">${escapeTooltipText(segment.distanceLabel)}</span>
        </div>
      </div>
    `,
  });
}

export function RouteSegmentLayer({
  map,
  route,
  activeSegmentId,
  themeMode,
  mapColors,
  timeFormat,
  onSegmentClick,
}: RouteSegmentLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  const markerModel = useMemo(() => getRouteSegmentMarkerModel(route), [route]);

  useEffect(() => {
    if (!map) {
      return;
    }

    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerRef.current;
    layer.clearLayers();

    route?.tripSegments.forEach((segment, segmentIndex) => {
      const latLngs = getRouteSegmentLatLngs(route, segment);
      if (latLngs.length < 2) {
        return;
      }

      const style = resolveRouteSegmentStyle(segment, {
        isActive: segment.id === activeSegmentId,
        segmentIndex,
        mapColors,
      });
      const segmentTooltip = getSegmentTooltip(segment, themeMode, segmentIndex, mapColors);
      const casingPolyline = L.polyline(latLngs, {
        color: getRouteSegmentCasingColor(themeMode),
        weight: style.weight + 5,
        opacity: themeMode === "light" ? 0.82 : 0.78,
        dashArray: style.dashArray,
        lineCap: style.lineCap,
        lineJoin: style.lineJoin,
        className: "route-segment-casing",
        interactive: false,
      });
      const routePolyline = L.polyline(latLngs, {
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        dashArray: style.dashArray,
        lineCap: style.lineCap,
        lineJoin: style.lineJoin,
        className: getRouteSegmentClassName(style),
      }).bindTooltip(segmentTooltip, {
        sticky: true,
        direction: "top",
        className: getRouteTooltipClassName(),
      });

      const hitAreaPolyline = L.polyline(latLngs, {
        color: style.color,
        weight: Math.max(style.weight + 14, 20),
        opacity: 0.01,
        lineCap: "round",
        lineJoin: "round",
        className: "route-segment-hit-area",
      }).bindTooltip(segmentTooltip, {
        sticky: true,
        direction: "top",
        className: getRouteTooltipClassName(),
      });

      if (onSegmentClick) {
        routePolyline.on("click", () => onSegmentClick(segment.id));
        hitAreaPolyline.on("click", () => onSegmentClick(segment.id));
      }

      casingPolyline.addTo(layer);
      routePolyline.addTo(layer);
      hitAreaPolyline.addTo(layer);
    });

    return () => {
      layer.clearLayers();
    };
  }, [activeSegmentId, map, mapColors, onSegmentClick, route, themeMode]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const redrawSegments = () => redrawRouteSegmentPolylines(layerRef.current);

    map.on(SEGMENT_REDRAW_EVENTS, redrawSegments);
    return () => {
      map.off(SEGMENT_REDRAW_EVENTS, redrawSegments);
    };
  }, [map]);

  useEffect(() => {
    return () => {
      if (map && layerRef.current) {
        map.removeLayer(layerRef.current);
      }
      layerRef.current = null;
    };
  }, [map]);

  return (
    <>
      <RouteStopMarkers
        map={map}
        markers={markerModel.stopMarkers}
        themeMode={themeMode}
        mapColors={mapColors}
        timeFormat={timeFormat}
      />
    </>
  );
}
