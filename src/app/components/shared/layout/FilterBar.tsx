import { ReactNode } from "react";
import { classNames } from "../utils/classNames";

interface FilterBarProps {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
}

export function FilterBar({
  left,
  right,
  className,
  leftClassName,
  rightClassName,
}: FilterBarProps) {
  return (
    <div
      className={classNames(
        "flex shrink-0 flex-col justify-between gap-4 border-b border-border-subtle p-4 sm:p-6 xl:flex-row xl:items-center",
        className,
      )}
    >
      <div className={classNames("flex flex-wrap items-center gap-3", leftClassName)}>{left}</div>
      {right ? (
        <div className={classNames("flex items-center gap-3 w-full xl:w-auto", rightClassName)}>{right}</div>
      ) : null}
    </div>
  );
}
