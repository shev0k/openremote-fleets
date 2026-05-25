export { rebaseIsoTimestampDate } from "../../../domain/utils/timestampDate";

export function formatMockDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMockCalendarDays(dateIso: string, dayOffset: number): string {
  const [year = "0", month = "1", day = "1"] = dateIso.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  date.setDate(date.getDate() + dayOffset);
  return formatMockDateKey(date);
}

export function getCurrentMockDateKey(): string {
  return formatMockDateKey(new Date());
}
