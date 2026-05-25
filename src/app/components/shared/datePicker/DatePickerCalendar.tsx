import { classNames } from "../utils/classNames";
import { CalendarMonthModel, formatCalendarDateValue } from "./datePickerModel";

interface DatePickerCalendarProps {
  title: string;
  month: CalendarMonthModel;
  activeDateValue?: string;
  onSelectDate: (dateValue: string) => void;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePickerCalendar({ title, month, activeDateValue, onSelectDate }: DatePickerCalendarProps) {
  return (
    <>
      <div className="mb-3 text-sm font-medium text-content-primary">{title}</div>
      <div className="nav-acrylic-chip date-picker-acrylic-inner rounded-xl p-3">
        <div className="mb-2 text-[12px] font-medium text-content-muted">{month.monthLabel}</div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-content-muted">
          {WEEKDAY_LABELS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {month.days.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} />;

            const nextDateValue = formatCalendarDateValue(new Date(month.year, month.month, day));
            const isActiveDate = activeDateValue === nextDateValue;

            return (
              <button
                key={`${month.month}-${day}`}
                type="button"
                onClick={() => onSelectDate(nextDateValue)}
                className={classNames(
                  "rounded-lg p-1.5 transition-colors",
                  isActiveDate
                    ? "bg-brand font-semibold text-brand-foreground"
                    : "text-content-secondary hover:bg-surface-elevated",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
