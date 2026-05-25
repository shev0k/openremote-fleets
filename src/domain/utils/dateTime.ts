import { formatTimeByPreference, type AppTimeFormat } from "../models/preferences";

export function formatUtcTimestampTimeLabel(
  timestampIso: string,
  timeZone?: string,
  timeFormat: AppTimeFormat = "24h",
): string {
  const timestamp = new Date(timestampIso);

  if (Number.isNaN(timestamp.valueOf())) {
    return "--:--";
  }

  return formatTimeByPreference(timestamp, timeFormat, timeZone);
}
