/* ======== IMPORTS ======== */

import {
  LiveFleetWidgetId,
  LiveFleetWidgetLayoutState,
} from "./liveFleetWorkspace.types";

/* ======== CONSTANTS ======== */

export const LEGACY_DEFAULT_WIDGET_ORDER = ["fleetSummary", "criticalAlerts", "fleetList", "tripHistory"];

export const LEGACY_DEFAULT_VISIBLE_WIDGETS = ["fleetSummary", "criticalAlerts", "fleetList"];

export const LIVE_FLEET_WIDGET_IDS: LiveFleetWidgetId[] = ["fleetList", "criticalAlerts", "tripHistory"];

export const LIVE_FLEET_DEFAULT_WIDGET_LAYOUT: LiveFleetWidgetLayoutState = {
  activeTab: "workspace",
  widgetOrderIds: LIVE_FLEET_WIDGET_IDS,
  visibleWidgetIds: ["fleetList", "criticalAlerts"],
};

export const LIVE_FLEET_LAYOUT_STORAGE_KEY = "openremote.live-fleet.layout.v1";
export const LIVE_FLEET_MAP_TYPE_STORAGE_KEY = "openremote.live-fleet.map-type.v1";
