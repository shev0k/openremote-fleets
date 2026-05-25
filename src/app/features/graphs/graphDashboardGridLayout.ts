import type { Layout, ResizeHandleAxis } from "react-grid-layout";
import {
  GRAPH_DASHBOARD_COLUMN_COUNT,
  type GraphWidgetLayoutItem,
} from "./graphsDashboardModel";

export const graphGridMargin: [number, number] = [16, 16];
export const graphGridContainerPadding: [number, number] = [0, 0];
export const graphGridRowHeight = 56;
export const graphGridResizeHandles: ResizeHandleAxis[] = ["s", "e", "se"];

export function toReactGridLayout(layout: GraphWidgetLayoutItem[], columnCount = GRAPH_DASHBOARD_COLUMN_COUNT): Layout {
  if (columnCount === GRAPH_DASHBOARD_COLUMN_COUNT) {
    return layout.map((item) => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
      maxW: item.maxW,
      resizeHandles: graphGridResizeHandles,
    }));
  }

  let cursorY = 0;
  return [...layout]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((item) => {
      const h = item.id === "fleet-kpis" ? Math.max(item.h, 4) : item.h;
      const nextItem = {
        i: item.id,
        x: 0,
        y: cursorY,
        w: columnCount,
        h,
        minW: columnCount,
        minH: item.minH,
        maxW: columnCount,
        resizeHandles: [],
      };
      cursorY += h;
      return nextItem;
    });
}

export function areGraphWidgetLayoutsEqual(left: GraphWidgetLayoutItem[], right: GraphWidgetLayoutItem[]): boolean {
  if (left.length !== right.length) return false;

  return left.every((leftItem, index) => {
    const rightItem = right[index];
    return (
      leftItem.id === rightItem.id &&
      leftItem.size === rightItem.size &&
      leftItem.x === rightItem.x &&
      leftItem.y === rightItem.y &&
      leftItem.w === rightItem.w &&
      leftItem.h === rightItem.h
    );
  });
}
