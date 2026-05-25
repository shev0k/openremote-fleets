import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS } from "./navItems";

describe("APP_NAV_ITEMS", () => {
  it("separates dashboard graphs from the report generation workspace", () => {
    expect(APP_NAV_ITEMS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Graphs", path: "/graphs" }),
        expect.objectContaining({ name: "Reports", path: "/reports" }),
      ]),
    );
  });

  it("keeps navigation generated from route metadata", () => {
    expect(APP_NAV_ITEMS.every((item) => Boolean(item.icon))).toBe(true);
    expect(APP_NAV_ITEMS.map((item) => item.path)).toEqual([
      "/",
      "/playback",
      "/alerts",
      "/graphs",
      "/reports",
      "/admin",
    ]);
  });
});
