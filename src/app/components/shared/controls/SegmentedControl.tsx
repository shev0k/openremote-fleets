import { classNames } from "../utils/classNames";

export interface SegmentedControlOption {
  id: string;
  label: string;
  count?: number;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
  activeCountClassName?: string;
  inactiveCountClassName?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  activeItemClassName,
  inactiveItemClassName,
  activeCountClassName,
  inactiveCountClassName,
}: SegmentedControlProps) {
  return (
    <div className={classNames("app-panel-muted !rounded-full flex gap-1.5 overflow-x-auto p-1.5 custom-scrollbar", className)}>
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={classNames(
            "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border",
            value === option.id
              ? classNames("border-brand/20 bg-brand/10 text-brand", activeItemClassName)
              : classNames("border-transparent text-content-muted hover:bg-panel hover:text-content-primary", inactiveItemClassName),
          )}
        >
          {option.label}
          {option.count !== undefined && option.count > 0 && (
            <span
              className={classNames(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                value === option.id
                  ? classNames("bg-brand text-brand-foreground", activeCountClassName)
                  : classNames("border border-transparent bg-surface-sunken text-content-secondary", inactiveCountClassName),
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
