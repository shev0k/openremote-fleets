import { Search } from "lucide-react";
import { classNames } from "../utils/classNames";

interface ToolbarSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function ToolbarSearchField({
  value,
  onChange,
  placeholder = "Search...",
  className,
  inputClassName,
}: ToolbarSearchFieldProps) {
  return (
    <div className={classNames("relative", className)}>
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={classNames(
          "w-full rounded-full border border-border-subtle bg-toolbar-surface py-2 pl-10 pr-4 text-[13px] font-medium text-content-secondary placeholder:text-content-muted transition-colors focus:border-border-strong focus:outline-none",
          inputClassName,
        )}
      />
    </div>
  );
}
