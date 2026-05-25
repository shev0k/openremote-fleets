import { PlaybackRoute, TripSegment } from "../../../../domain/models/playback";

export function getRouteSegmentPointIndex(pointsLength: number, progressPercent: number) {
  if (!pointsLength) {
    return 0;
  }

  return Math.min(pointsLength - 1, Math.max(0, Math.round((progressPercent / 100) * (pointsLength - 1))));
}

export function getRouteSegmentLatLngs(route: PlaybackRoute, segment: TripSegment): [number, number][] {
  const startIndex = getRouteSegmentPointIndex(route.points.length, segment.startProgressPercent);
  const endIndex = Math.max(startIndex, getRouteSegmentPointIndex(route.points.length, segment.endProgressPercent));

  return route.points.slice(startIndex, endIndex + 1).map((point) => [point.latitude, point.longitude]);
}

export function hasDrawableRouteSegments(route: PlaybackRoute | null | undefined): boolean {
  return Boolean(
    route?.tripSegments.some((segment) => getRouteSegmentLatLngs(route, segment).length >= 2),
  );
}
