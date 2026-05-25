/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readStoredWidgetHeights } from "./widgetHeightStorage";

const storageKey = "openremote.live-fleet.widget-heights.v1";
const { readLocalStorageItemMock } = vi.hoisted(() => ({
  readLocalStorageItemMock: vi.fn(),
}));

vi.mock("../../../../components/shared/storage/safeStorage", () => ({
  isPlainStorageObject: (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value),
  parseStoredJson: <TValue,>(rawValue: string | null | undefined, guard: (value: unknown) => value is TValue) => {
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as unknown;
    return guard(parsed) ? parsed : null;
  },
  readLocalStorageItem: readLocalStorageItemMock,
  removeLocalStorageItem: vi.fn(),
  writeLocalStorageItem: vi.fn(),
}));

describe("widgetHeightStorage", () => {
  beforeEach(() => {
    readLocalStorageItemMock.mockReset();
  });

  it("ignores stored widget heights unless the payload is a plain object", () => {
    readLocalStorageItemMock.mockImplementation((key: string) => (key === storageKey ? "[120,240]" : null));
    expect(readStoredWidgetHeights()).toEqual({});
  });

  it("keeps only positive finite numeric heights from object payloads", () => {
    readLocalStorageItemMock.mockImplementation((key: string) =>
      key === storageKey
        ? JSON.stringify({
        criticalAlerts: 320,
        fleetList: -1,
        tripHistory: "240",
          })
        : null,
    );

    expect(readStoredWidgetHeights()).toEqual({ criticalAlerts: 320 });
  });
});
