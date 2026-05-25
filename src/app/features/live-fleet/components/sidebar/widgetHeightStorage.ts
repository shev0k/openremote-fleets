/* ======== IMPORTS ======== */

import type { LiveFleetWidgetId } from "../../providers/liveFleetWorkspace.types";
import {
  isPlainStorageObject,
  parseStoredJson,
  readLocalStorageItem,
  removeLocalStorageItem,
  writeLocalStorageItem,
} from "../../../../components/shared/storage/safeStorage";

/* ======== CONSTANTS ======== */

const WIDGET_HEIGHTS_STORAGE_KEY = "openremote.live-fleet.widget-heights.v1";

/* ======== HELPERS ======== */

export function readStoredWidgetHeights() {
  if (typeof window === "undefined") {
    return {} as Partial<Record<LiveFleetWidgetId, number>>;
  }

  try {
    const parsed = parseStoredJson(readLocalStorageItem(WIDGET_HEIGHTS_STORAGE_KEY), isPlainStorageObject);
    if (!parsed) {
      return {} as Partial<Record<LiveFleetWidgetId, number>>;
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [LiveFleetWidgetId, number] =>
          typeof entry[0] === "string" &&
          typeof entry[1] === "number" &&
          Number.isFinite(entry[1]) &&
          entry[1] > 0,
      ),
    ) as Partial<Record<LiveFleetWidgetId, number>>;
  } catch {
    return {} as Partial<Record<LiveFleetWidgetId, number>>;
  }
}

export function persistWidgetHeights(widgetHeights: Partial<Record<LiveFleetWidgetId, number>>) {
  if (typeof window === "undefined") {
    return;
  }

  writeLocalStorageItem(WIDGET_HEIGHTS_STORAGE_KEY, JSON.stringify(widgetHeights));
}

export function clearStoredWidgetHeights() {
  if (typeof window === "undefined") {
    return;
  }

  removeLocalStorageItem(WIDGET_HEIGHTS_STORAGE_KEY);
}
