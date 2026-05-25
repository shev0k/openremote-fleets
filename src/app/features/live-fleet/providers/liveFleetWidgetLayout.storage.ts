/* ======== IMPORTS ======== */

import {
  LEGACY_DEFAULT_VISIBLE_WIDGETS,
  LEGACY_DEFAULT_WIDGET_ORDER,
  LIVE_FLEET_DEFAULT_WIDGET_LAYOUT,
  LIVE_FLEET_LAYOUT_STORAGE_KEY,
  LIVE_FLEET_MAP_TYPE_STORAGE_KEY,
  LIVE_FLEET_WIDGET_IDS,
} from "./liveFleetWorkspace.constants";
import {
  LiveFleetMapType,
  LiveFleetWidgetId,
  LiveFleetWidgetLayoutState,
} from "./liveFleetWorkspace.types";
import { isPlainStorageObject, parseStoredJson, readLocalStorageItem } from "../../../components/shared/storage/safeStorage";

/* ======== HELPERS ======== */

function isWidgetId(value: string): value is LiveFleetWidgetId {
  return LIVE_FLEET_WIDGET_IDS.includes(value as LiveFleetWidgetId);
}

function sanitizeWidgetIds(values: unknown): LiveFleetWidgetId[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const uniqueValues = new Set<LiveFleetWidgetId>();

  values.forEach((value) => {
    if (typeof value === "string" && isWidgetId(value)) {
      uniqueValues.add(value);
    }
  });

  return [...uniqueValues];
}

function readStringIds(values: unknown) {
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
}

function areWidgetIdsEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/* ======== EXPORTS ======== */

export function sortWidgetIdsByOrder(widgetIds: LiveFleetWidgetId[], widgetOrderIds: LiveFleetWidgetId[]) {
  return [...widgetIds].sort((left, right) => widgetOrderIds.indexOf(left) - widgetOrderIds.indexOf(right));
}

export function readStoredLiveFleetLayout(): LiveFleetWidgetLayoutState {
  if (typeof window === "undefined") {
    return LIVE_FLEET_DEFAULT_WIDGET_LAYOUT;
  }

  try {
    const parsed = parseStoredJson(
      readLocalStorageItem(LIVE_FLEET_LAYOUT_STORAGE_KEY),
      isPlainStorageObject,
    ) as Partial<LiveFleetWidgetLayoutState> | null;
    if (!parsed) {
      return LIVE_FLEET_DEFAULT_WIDGET_LAYOUT;
    }

    const rawVisibleIds = readStringIds(parsed.visibleWidgetIds);
    const rawOrderIds = readStringIds(parsed.widgetOrderIds);
    const activeTab = parsed.activeTab === "quickPanels" ? "quickPanels" : "workspace";

    if (
      areWidgetIdsEqual(rawOrderIds, LEGACY_DEFAULT_WIDGET_ORDER) &&
      areWidgetIdsEqual(rawVisibleIds, LEGACY_DEFAULT_VISIBLE_WIDGETS)
    ) {
      return {
        ...LIVE_FLEET_DEFAULT_WIDGET_LAYOUT,
        activeTab,
      };
    }

    const storedVisibleIds = sanitizeWidgetIds(parsed.visibleWidgetIds);
    const storedOrderIds = sanitizeWidgetIds(parsed.widgetOrderIds);
    const widgetOrderIds = storedOrderIds.length
      ? [...storedOrderIds, ...LIVE_FLEET_WIDGET_IDS.filter((widgetId) => !storedOrderIds.includes(widgetId))]
      : storedVisibleIds.length
        ? [...storedVisibleIds, ...LIVE_FLEET_WIDGET_IDS.filter((widgetId) => !storedVisibleIds.includes(widgetId))]
        : LIVE_FLEET_DEFAULT_WIDGET_LAYOUT.widgetOrderIds;
    const visibleWidgetIds = storedVisibleIds.length
      ? sortWidgetIdsByOrder(storedVisibleIds, widgetOrderIds)
      : LIVE_FLEET_DEFAULT_WIDGET_LAYOUT.visibleWidgetIds;

    const nextLayout: LiveFleetWidgetLayoutState = {
      activeTab,
      widgetOrderIds,
      visibleWidgetIds,
    };

    return nextLayout;
  } catch {
    return LIVE_FLEET_DEFAULT_WIDGET_LAYOUT;
  }
}

export function readInitialWorkspaceOpen() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.innerWidth >= 1280;
}

function isLiveFleetMapType(value: string | null): value is LiveFleetMapType {
  return value === "default" || value === "satellite" || value === "terrain";
}

export function hasStoredLiveFleetMapType(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return isLiveFleetMapType(readLocalStorageItem(LIVE_FLEET_MAP_TYPE_STORAGE_KEY));
}

export function readStoredLiveFleetMapType(fallback: LiveFleetMapType = "default"): LiveFleetMapType {
  if (typeof window === "undefined") {
    return fallback;
  }

  const mapType = readLocalStorageItem(LIVE_FLEET_MAP_TYPE_STORAGE_KEY);
  if (isLiveFleetMapType(mapType)) {
    return mapType;
  }

  return fallback;
}
