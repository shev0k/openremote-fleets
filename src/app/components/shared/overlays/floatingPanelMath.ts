export interface FloatingPanelPosition {
  x: number;
  y: number;
}

export interface FloatingPanelBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampPosition(position: FloatingPanelPosition, bounds: FloatingPanelBounds): FloatingPanelPosition {
  return {
    x: clamp(position.x, bounds.minX, bounds.maxX),
    y: clamp(position.y, bounds.minY, bounds.maxY),
  };
}

export function isSamePosition(left: FloatingPanelPosition, right: FloatingPanelPosition) {
  return left.x === right.x && left.y === right.y;
}
