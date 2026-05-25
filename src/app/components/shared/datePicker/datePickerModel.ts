export interface CalendarMonthModel {
  year: number;
  month: number;
  monthLabel: string;
  days: Array<number | null>;
}

export function createCalendarMonth(dateIso?: string): CalendarMonthModel {
  const baseDate = dateIso ? new Date(`${dateIso}T00:00:00`) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return {
    year,
    month,
    monthLabel: baseDate.toLocaleDateString([], { month: "long", year: "numeric" }),
    days,
  };
}

export function formatDateButtonLabel(dateIso: string, placeholder: string): string {
  if (!dateIso) return placeholder;
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCalendarDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
