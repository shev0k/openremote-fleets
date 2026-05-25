export const LIVE_FLEET_EDGE_PADDING = 20;
export const LIVE_FLEET_WORKSPACE_WIDTH = 396;
export const LIVE_FLEET_TIMELINE_RESERVED_HEIGHT = 184;
export const LIVE_FLEET_TIMELINE_GAP = 20;
export const LIVE_FLEET_TIMELINE_LEFT_OFFSET =
  LIVE_FLEET_EDGE_PADDING + LIVE_FLEET_WORKSPACE_WIDTH + LIVE_FLEET_EDGE_PADDING;

export function getLiveFleetBottomInset(hasTimeline: boolean, timelineHeightPx = 0) {
  if (!hasTimeline) {
    return LIVE_FLEET_EDGE_PADDING;
  }

  return Math.max(LIVE_FLEET_TIMELINE_RESERVED_HEIGHT, Math.ceil(timelineHeightPx) + LIVE_FLEET_TIMELINE_GAP);
}
