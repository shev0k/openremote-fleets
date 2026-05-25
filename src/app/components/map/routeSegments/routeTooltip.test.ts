import { describe, expect, it } from "vitest";
import { buildRouteTooltipHtml, escapeTooltipText } from "./routeTooltip";

describe("routeTooltip", () => {
  it("escapes tooltip text before callers place it in html strings", () => {
    expect(escapeTooltipText(`Depot <A> & "B"`)).toBe("Depot &lt;A&gt; &amp; &quot;B&quot;");
  });

  it("builds the shared route tooltip shell", () => {
    const tooltip = buildRouteTooltipHtml({
      themeMode: "light",
      minWidth: 212,
      body: "<span>Route</span>",
    });

    expect(tooltip).toContain("min-width: 212px");
    expect(tooltip).toContain("rgba(255,255,255,0.96)");
    expect(tooltip).toContain("<span>Route</span>");
  });
});
