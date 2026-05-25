import { type RefObject, useRef } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPopoverPosition } from "../overlays/useAnchoredPopoverPosition";
import { DatePickerCalendar } from "./DatePickerCalendar";
import type { CalendarMonthModel } from "./datePickerModel";

interface DatePickerPopoverProps {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  title: string;
  month: CalendarMonthModel;
  activeDateValue?: string;
  onSelectDate: (dateValue: string) => void;
  onClose: () => void;
}

export function DatePickerPopover({
  isOpen,
  anchorRef,
  title,
  month,
  activeDateValue,
  onSelectDate,
  onClose,
}: DatePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const style = useAnchoredPopoverPosition({
    isOpen,
    anchorRef,
    popoverRef,
    onClose,
  });

  if (!isOpen || !style || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={popoverRef}
      style={style}
      className="app-overlay nav-acrylic-popover date-picker-acrylic z-[5000] rounded-2xl p-4"
    >
      <DatePickerCalendar
        title={title}
        month={month}
        activeDateValue={activeDateValue}
        onSelectDate={onSelectDate}
      />
    </div>,
    document.body,
  );
}
