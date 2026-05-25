import type L from "leaflet";

const WORLD_LONGITUDE_DEGREES = 360;
const DEFAULT_VIEWPORT_MARGIN_PX = 96;
const COORDINATE_PRECISION = 12;

export interface WrappedLongitudeWorldOffsetInput {
  projectedX: number;
  pixelMinX: number;
  pixelMaxX: number;
  worldWidthPx: number;
  viewportMarginPx?: number;
  includeBaseWorld?: boolean;
}

export interface WrappedMarkerPosition {
  key: string;
  latLng: [number, number];
  worldOffset: number;
}

interface WrappedMarkerPositionInput {
  map: L.Map;
  vehicleId: string;
  latitude: number;
  longitude: number;
  viewportMarginPx?: number;
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(COORDINATE_PRECISION));
}

export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) {
    return longitude;
  }

  const normalized = ((((longitude + 180) % WORLD_LONGITUDE_DEGREES) + WORLD_LONGITUDE_DEGREES) % WORLD_LONGITUDE_DEGREES) - 180;
  return normalized === -180 && longitude > 0 ? 180 : roundCoordinate(normalized);
}

export function getWrappedMarkerKey(vehicleId: string, worldOffset: number) {
  return worldOffset === 0 ? vehicleId : `${vehicleId}::wrap:${worldOffset}`;
}

export function getVisibleLongitudeWorldOffsets({
  projectedX,
  pixelMinX,
  pixelMaxX,
  worldWidthPx,
  viewportMarginPx = DEFAULT_VIEWPORT_MARGIN_PX,
  includeBaseWorld = true,
}: WrappedLongitudeWorldOffsetInput): number[] {
  if (
    !isFiniteNumber(projectedX) ||
    !isFiniteNumber(pixelMinX) ||
    !isFiniteNumber(pixelMaxX) ||
    !isFiniteNumber(worldWidthPx) ||
    worldWidthPx <= 0
  ) {
    return [0];
  }

  const minOffset = Math.ceil((pixelMinX - viewportMarginPx - projectedX) / worldWidthPx);
  const maxOffset = Math.floor((pixelMaxX + viewportMarginPx - projectedX) / worldWidthPx);
  const offsets = new Set<number>();

  for (let offset = minOffset; offset <= maxOffset; offset += 1) {
    offsets.add(offset);
  }

  if (includeBaseWorld) {
    offsets.add(0);
  }

  return Array.from(offsets).sort((left, right) => left - right);
}

function getPixelWorldWidth(map: L.Map, zoom: number) {
  const worldBounds = map.getPixelWorldBounds?.(zoom);
  const worldSize = worldBounds?.getSize?.();
  return worldSize?.x;
}

export function getWrappedMarkerPositions({
  map,
  vehicleId,
  latitude,
  longitude,
  viewportMarginPx,
}: WrappedMarkerPositionInput): WrappedMarkerPosition[] {
  const normalizedLongitude = normalizeLongitude(longitude);
  const basePosition: WrappedMarkerPosition = {
    key: getWrappedMarkerKey(vehicleId, 0),
    latLng: [latitude, normalizedLongitude],
    worldOffset: 0,
  };

  if (!Number.isFinite(latitude) || !Number.isFinite(normalizedLongitude)) {
    return [];
  }

  const zoom = map.getZoom?.();
  const pixelBounds = map.getPixelBounds?.();

  if (!isFiniteNumber(zoom) || !pixelBounds?.min || !pixelBounds.max) {
    return [basePosition];
  }

  const worldWidthPx = getPixelWorldWidth(map, zoom);
  const projectedPoint = map.project?.([latitude, normalizedLongitude], zoom);

  if (!projectedPoint || !isFiniteNumber(projectedPoint.x) || !isFiniteNumber(worldWidthPx)) {
    return [basePosition];
  }

  return getVisibleLongitudeWorldOffsets({
    projectedX: projectedPoint.x,
    pixelMinX: pixelBounds.min.x,
    pixelMaxX: pixelBounds.max.x,
    worldWidthPx,
    viewportMarginPx,
    includeBaseWorld: true,
  }).map((worldOffset) => ({
    key: getWrappedMarkerKey(vehicleId, worldOffset),
    latLng: [latitude, roundCoordinate(normalizedLongitude + worldOffset * WORLD_LONGITUDE_DEGREES)],
    worldOffset,
  }));
}
