import { describe, expect, it } from "vitest";
import { getPlaybackQueryCalendarDateValue, getPlaybackQueryCalendarMonth } from "./playbackDateUtils";

describe("playback date utils", () => {
  const now = new Date("2026-05-07T10:00:00");

  it("resolves relative presets to dynamic calendar dates", () => {
    expect(getPlaybackQueryCalendarDateValue({ preset: "today" }, now)).toBe("2026-05-07");
    expect(getPlaybackQueryCalendarDateValue({ preset: "yesterday" }, now)).toBe("2026-05-06");
    expect(getPlaybackQueryCalendarDateValue({ preset: "customDate", customDateIso: "2026-05-05" }, now)).toBe("2026-05-05");
  });

  it("uses the resolved preset date to choose the visible calendar month", () => {
    const month = getPlaybackQueryCalendarMonth({ preset: "yesterday" }, new Date("2026-06-01T10:00:00"));

    expect(month.monthLabel).toBe("May 2026");
    expect(month.year).toBe(2026);
    expect(month.month).toBe(4);
  });
});
