import type { DatapointLike, OpenRemoteDatapointHistory } from "../models/openRemoteDatapoints";

export function getOpenRemoteDatapointTimestamp(datapoint: DatapointLike): number | null {
  if ("timestamp" in datapoint && typeof datapoint.timestamp === "number") return datapoint.timestamp;
  if ("x" in datapoint && typeof datapoint.x === "number") return datapoint.x;
  return null;
}

export function getOpenRemoteDatapointValue(datapoint: DatapointLike): unknown {
  if ("value" in datapoint) return datapoint.value;
  if ("y" in datapoint) return datapoint.y;
  return undefined;
}

export function getSortedOpenRemoteDatapoints(history: OpenRemoteDatapointHistory, attributeName: string): DatapointLike[] {
  return [...(history[attributeName] ?? [])].sort((left, right) => (getOpenRemoteDatapointTimestamp(left) ?? 0) - (getOpenRemoteDatapointTimestamp(right) ?? 0));
}

export function findNearestOpenRemoteValue(history: OpenRemoteDatapointHistory, attributeName: string, timestamp: number): unknown {
  const points = getSortedOpenRemoteDatapoints(history, attributeName);
  let nearest: DatapointLike | undefined;
  points.forEach((point) => {
    const pointTimestamp = getOpenRemoteDatapointTimestamp(point);
    if (pointTimestamp !== null && pointTimestamp <= timestamp) {
      nearest = point;
    }
  });
  return nearest ? getOpenRemoteDatapointValue(nearest) : undefined;
}

export function findNearestOpenRemoteNumber(history: OpenRemoteDatapointHistory, attributeName: string, timestamp: number): number | undefined {
  const value = findNearestOpenRemoteValue(history, attributeName, timestamp);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function findNearestOpenRemoteBoolean(history: OpenRemoteDatapointHistory, attributeName: string, timestamp: number): boolean | undefined {
  const value = findNearestOpenRemoteValue(history, attributeName, timestamp);
  return typeof value === "boolean" ? value : typeof value === "number" ? value > 0 : undefined;
}
