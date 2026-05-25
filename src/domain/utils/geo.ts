export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function getDistanceMeters(start: GeoPoint, end: GeoPoint): number {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCoordinateDistanceMeters(start: [number, number], end: [number, number]): number {
  return getDistanceMeters(
    { latitude: start[0], longitude: start[1] },
    { latitude: end[0], longitude: end[1] },
  );
}

export function getRouteDistanceMeters<TPoint extends GeoPoint>(points: TPoint[]): number {
  return points.reduce((totalDistance, point, pointIndex) => {
    const previousPoint = points[pointIndex - 1];
    return previousPoint ? totalDistance + getDistanceMeters(previousPoint, point) : totalDistance;
  }, 0);
}

export function getBearingDegrees(start: GeoPoint, end: GeoPoint): number {
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function getRoundedBearingDegrees(start: GeoPoint, end: GeoPoint): number {
  return Math.round(getBearingDegrees(start, end));
}

export function getBearingDifference(first: number, second: number): number {
  return Math.abs(((first - second + 540) % 360) - 180);
}
