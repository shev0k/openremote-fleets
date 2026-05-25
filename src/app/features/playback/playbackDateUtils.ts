import { PlaybackQuery } from "../../../domain/models/playback";

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dateIso: string, dayOffset: number): string {
  const [year = "0", month = "1", day = "1"] = dateIso.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  date.setDate(date.getDate() + dayOffset);
  return formatDateInputValue(date);
}

export function getPlaybackQueryCalendarDateValue(query: PlaybackQuery, now = new Date()): string {
  const todayValue = formatDateInputValue(now);

  if (query.preset === "customDate" && query.customDateIso) {
    return query.customDateIso.slice(0, 10);
  }

  if (query.preset === "yesterday") {
    return addCalendarDays(todayValue, -1);
  }

  return todayValue;
}

export function getPlaybackQueryCalendarMonth(query: PlaybackQuery, now = new Date()) {
  const activeDateValue = getPlaybackQueryCalendarDateValue(query, now);
  const baseDate = new Date(`${activeDateValue}T00:00:00`);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlankDays = firstDay.getDay();

  return {
    monthLabel: firstDay.toLocaleDateString([], { month: "long", year: "numeric" }),
    days: [...Array(leadingBlankDays).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)],
    year,
    month,
  };
}
