import type { PlaybackQuery } from "../../../domain/models/playback";
import type { OpenRemoteDatapointHistoryWindow } from "../services/OpenRemoteRouteHistoryService";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).valueOf();
}

function addLocalDays(timestamp: number, dayOffset: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + dayOffset);
  return date.valueOf();
}

function startOfLocalDateInput(dateIso: string): number {
  const [year, month, day] = dateIso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).valueOf();
}

export function getOpenRemoteDatapointWindowFromPlaybackQuery(query: PlaybackQuery = { preset: "last24Hours" }): OpenRemoteDatapointHistoryWindow {
  const now = Date.now();
  if (query.preset === "today") {
    return { fromTimestamp: startOfLocalDay(new Date(now)), toTimestamp: now };
  }
  if (query.preset === "yesterday") {
    const todayStart = startOfLocalDay(new Date(now));
    return { fromTimestamp: addLocalDays(todayStart, -1), toTimestamp: todayStart - 1 };
  }
  if (query.preset === "last7Days") {
    return { fromTimestamp: now - 7 * DAY_MS, toTimestamp: now };
  }
  if (query.preset === "customDate" && query.customDateIso) {
    const customStart = startOfLocalDateInput(query.customDateIso);
    return { fromTimestamp: customStart, toTimestamp: addLocalDays(customStart, 1) - 1 };
  }
  return { fromTimestamp: now - DAY_MS, toTimestamp: now };
}
