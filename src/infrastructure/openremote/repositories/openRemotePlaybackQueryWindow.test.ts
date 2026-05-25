import { afterEach, describe, expect, it, vi } from "vitest";
import { getOpenRemoteDatapointWindowFromPlaybackQuery } from "./openRemotePlaybackQueryWindow";

describe("getOpenRemoteDatapointWindowFromPlaybackQuery", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps playback presets to OpenRemote datapoint timestamp windows", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T00:07:00.000Z"));
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf();
    const yesterdayStartDate = new Date(todayStart);
    yesterdayStartDate.setDate(yesterdayStartDate.getDate() - 1);
    const yesterdayStart = yesterdayStartDate.valueOf();
    const customStart = new Date(2026, 4, 9).valueOf();

    expect(getOpenRemoteDatapointWindowFromPlaybackQuery({ preset: "today" })).toEqual({
      fromTimestamp: todayStart,
      toTimestamp: Date.parse("2026-05-15T00:07:00.000Z"),
    });
    expect(getOpenRemoteDatapointWindowFromPlaybackQuery({ preset: "yesterday" })).toEqual({
      fromTimestamp: yesterdayStart,
      toTimestamp: todayStart - 1,
    });
    expect(getOpenRemoteDatapointWindowFromPlaybackQuery({ preset: "last7Days" })).toEqual({
      fromTimestamp: Date.parse("2026-05-08T00:07:00.000Z"),
      toTimestamp: Date.parse("2026-05-15T00:07:00.000Z"),
    });
    expect(getOpenRemoteDatapointWindowFromPlaybackQuery({ preset: "customDate", customDateIso: "2026-05-09" })).toEqual({
      fromTimestamp: customStart,
      toTimestamp: new Date(2026, 4, 10).valueOf() - 1,
    });
  });

  it("falls back to the last 24 hours for incomplete custom dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T10:30:00.000Z"));

    expect(getOpenRemoteDatapointWindowFromPlaybackQuery({ preset: "customDate" })).toEqual({
      fromTimestamp: Date.parse("2026-05-12T10:30:00.000Z"),
      toTimestamp: Date.parse("2026-05-13T10:30:00.000Z"),
    });
  });
});
