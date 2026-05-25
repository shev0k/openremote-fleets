import { describe, expect, it } from "vitest";
import { GRAPH_WIDGET_CATALOG } from "../graphsDashboardModel";
import { getGraphWidgetRegistration, graphWidgetRegistry } from "./graphWidgetRegistry";

describe("graph widget registry", () => {
  it("registers one render component and icon for every catalog widget", () => {
    const catalogIds = GRAPH_WIDGET_CATALOG.map((widget) => widget.id);

    expect(Object.keys(graphWidgetRegistry).sort()).toEqual([...catalogIds].sort());
    catalogIds.forEach((widgetId) => {
      const registration = getGraphWidgetRegistration(widgetId);

      expect(registration.component).toBeTypeOf("function");
      expect(registration.icon).toBeDefined();
    });
  });
});
