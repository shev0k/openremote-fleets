import {
  parseStoredJson,
  readLocalStorageItem,
  writeLocalStorageItem,
} from "../../components/shared/storage/safeStorage";
import {
  DEFAULT_GRAPH_WIDGET_LAYOUT,
  GRAPH_WIDGET_CATALOG,
  type GraphDashboardLayoutMode,
  type GraphWidgetId,
  type GraphWidgetLayoutItem,
  type GraphWidgetLayoutSize,
  normalizeGraphWidgetLayout,
} from "./graphsDashboardModel";

const graphWidgetLayoutStorageKey = "openremote-fleets.graphs.widgetLayout";
const graphDashboardLayoutModeStorageKey = "openremote-fleets.graphs.layoutMode";
const graphWidgetIds = new Set(GRAPH_WIDGET_CATALOG.map((widget) => widget.id));
const graphWidgetLayoutSizes = new Set<GraphWidgetLayoutSize>(["compact", "medium", "wide"]);

export function defaultGraphWidgetLayout(): GraphWidgetLayoutItem[] {
  return DEFAULT_GRAPH_WIDGET_LAYOUT.map((item) => ({ ...item }));
}

function isGraphWidgetId(value: unknown): value is GraphWidgetId {
  return typeof value === "string" && graphWidgetIds.has(value as GraphWidgetId);
}

function isGraphWidgetLayoutSize(value: unknown): value is GraphWidgetLayoutSize {
  return typeof value === "string" && graphWidgetLayoutSizes.has(value as GraphWidgetLayoutSize);
}

function isFiniteLayoutValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isGraphDashboardLayoutMode(value: unknown): value is GraphDashboardLayoutMode {
  return value === "packed" || value === "free";
}

export function readStoredGraphWidgetLayout(): GraphWidgetLayoutItem[] {
  if (typeof window === "undefined") return defaultGraphWidgetLayout();

  try {
    const parsed = parseStoredJson(readLocalStorageItem(graphWidgetLayoutStorageKey), Array.isArray);
    if (!Array.isArray(parsed)) return defaultGraphWidgetLayout();

    const seen = new Set<GraphWidgetId>();
    const layout = parsed.reduce<Array<{ id: GraphWidgetId; size: GraphWidgetLayoutSize; x?: number; y?: number; w?: number; h?: number }>>((items, item) => {
      if (!item || typeof item !== "object") return items;
      const candidate = item as { id?: unknown; size?: unknown; x?: unknown; y?: unknown; w?: unknown; h?: unknown };
      if (!isGraphWidgetId(candidate.id) || !isGraphWidgetLayoutSize(candidate.size) || seen.has(candidate.id)) {
        return items;
      }
      seen.add(candidate.id);
      items.push({
        id: candidate.id,
        size: candidate.size,
        x: isFiniteLayoutValue(candidate.x) ? candidate.x : undefined,
        y: isFiniteLayoutValue(candidate.y) ? candidate.y : undefined,
        w: isFiniteLayoutValue(candidate.w) ? candidate.w : undefined,
        h: isFiniteLayoutValue(candidate.h) ? candidate.h : undefined,
      });
      return items;
    }, []);

    return layout.length ? normalizeGraphWidgetLayout(layout) : defaultGraphWidgetLayout();
  } catch {
    return defaultGraphWidgetLayout();
  }
}

export function writeStoredGraphWidgetLayout(layout: GraphWidgetLayoutItem[]): void {
  try {
    writeLocalStorageItem(graphWidgetLayoutStorageKey, JSON.stringify(layout));
  } catch {
    // Layout persistence is local convenience only; the dashboard should still work without storage.
  }
}

export function readStoredGraphDashboardLayoutMode(): GraphDashboardLayoutMode {
  if (typeof window === "undefined") return "packed";

  try {
    const stored = readLocalStorageItem(graphDashboardLayoutModeStorageKey);
    return isGraphDashboardLayoutMode(stored) ? stored : "packed";
  } catch {
    return "packed";
  }
}

export function writeStoredGraphDashboardLayoutMode(layoutMode: GraphDashboardLayoutMode): void {
  try {
    writeLocalStorageItem(graphDashboardLayoutModeStorageKey, layoutMode);
  } catch {
    // Layout mode persistence is local convenience only.
  }
}
