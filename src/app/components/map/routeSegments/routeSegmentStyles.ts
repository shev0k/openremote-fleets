import { RouteSegmentSpeedBand, TripSegment, getTripSegmentSpeedBand } from "../../../../domain/models/playback";
import { type AppMapColorPreferences } from "../../../../domain/models/preferences";

export type RouteSegmentAnimation = "none" | "pulse" | "flow";

export interface ResolvedRouteSegmentStyle {
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  lineCap: "round";
  lineJoin: "round";
  animation: RouteSegmentAnimation;
}

export interface RouteSegmentStyleOptions {
  isActive?: boolean;
  segmentIndex?: number;
  mapColors?: AppMapColorPreferences;
}

const SEGMENT_COLOR_PALETTE = ["#a1d200", "#38bdf8", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6"];

const SPEED_BAND_STYLES: Record<RouteSegmentSpeedBand, ResolvedRouteSegmentStyle> = {
  stationary: {
    color: "#64748b",
    weight: 4,
    opacity: 0.72,
    dashArray: "4 8",
    lineCap: "round",
    lineJoin: "round",
    animation: "pulse",
  },
  slow: {
    color: "#f59e0b",
    weight: 4,
    opacity: 0.78,
    dashArray: "6 7",
    lineCap: "round",
    lineJoin: "round",
    animation: "flow",
  },
  normal: {
    color: "#a1d200",
    weight: 4,
    opacity: 0.82,
    dashArray: undefined,
    lineCap: "round",
    lineJoin: "round",
    animation: "none",
  },
  fast: {
    color: "#8b5cf6",
    weight: 5,
    opacity: 0.86,
    dashArray: undefined,
    lineCap: "round",
    lineJoin: "round",
    animation: "flow",
  },
  overspeed: {
    color: "#ef4444",
    weight: 6,
    opacity: 0.94,
    lineCap: "round",
    lineJoin: "round",
    animation: "pulse",
  },
};

function getSegmentSpeedBand(segment: TripSegment): RouteSegmentSpeedBand {
  return segment.telemetryState?.speedBand ?? segment.speedBand ?? getTripSegmentSpeedBand(segment.averageSpeedKph);
}

function getSegmentColor(options: RouteSegmentStyleOptions): string {
  const segmentIndex = Math.max(0, options.segmentIndex ?? 0);
  return SEGMENT_COLOR_PALETTE[segmentIndex % SEGMENT_COLOR_PALETTE.length];
}

export function resolveRouteSegmentStyle(
  segment: TripSegment,
  options: RouteSegmentStyleOptions = {},
): ResolvedRouteSegmentStyle {
  const semanticStyle = SPEED_BAND_STYLES[getSegmentSpeedBand(segment)];
  const segmentColor = getSegmentColor(options);

  if (!options.isActive) {
    return {
      ...semanticStyle,
      color: segmentColor,
      weight: 5,
      opacity: 0.92,
      dashArray: "10 8",
      animation: "none",
    };
  }

  return {
    ...semanticStyle,
    color: segmentColor,
    dashArray: undefined,
    weight: semanticStyle.weight + 1,
    opacity: Math.min(1, semanticStyle.opacity + 0.12),
  };
}

export function getRouteSegmentClassName(style: ResolvedRouteSegmentStyle): string {
  const baseClassName = "route-segment-line route-segment-line-appear";

  if (style.animation === "pulse") {
    return `${baseClassName} route-segment-line-pulse`;
  }

  if (style.animation === "flow") {
    return `${baseClassName} route-segment-line-flow`;
  }

  return baseClassName;
}
