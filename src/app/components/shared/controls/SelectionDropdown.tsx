import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { classNames } from "../utils/classNames";

export interface SelectionDropdownOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SelectionDropdownProps {
  value: string;
  options: SelectionDropdownOption[];
  onChange: (id: string) => void;
  activeOptionId?: string;
  leadingIcon?: ReactNode;
  compact?: boolean;
  menuTitle?: string;
  buttonAriaLabel?: string;
  buttonTitle?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  activeOptionClassName?: string;
  align?: "left" | "right";
  menuSide?: "bottom" | "left" | "top";
}

export function SelectionDropdown({
  value,
  options,
  onChange,
  activeOptionId,
  leadingIcon,
  compact = false,
  menuTitle,
  buttonAriaLabel,
  buttonTitle,
  className,
  triggerClassName,
  menuClassName,
  optionClassName,
  activeOptionClassName,
  align = "left",
  menuSide = "bottom",
}: SelectionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      const target = event.target as Node;
      if (!rootRef.current.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      if (menuSide === "left") {
        setMenuStyle({
          position: "fixed",
          top: rect.top,
          left: rect.left - 12,
          transform: "translateX(-100%)",
        });
        return;
      }

      if (menuSide === "top") {
        setMenuStyle({
          position: "fixed",
          top: rect.top - 8,
          left: align === "right" ? rect.right : rect.left,
          transform: `${align === "right" ? "translateX(-100%) " : ""}translateY(-100%)`.trim(),
        });
        return;
      }

      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: align === "right" ? rect.right : rect.left,
        transform: align === "right" ? "translateX(-100%)" : undefined,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [align, isOpen, menuSide]);

  const menu = isOpen && menuStyle
    ? createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className={classNames("app-overlay z-[5000] flex flex-col gap-1 rounded-xl p-2", menuClassName)}
        >
          {menuTitle ? (
            <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-content-muted">
              {menuTitle}
            </span>
          ) : null}
          {options.map((option) => {
            const isActive = option.id === (activeOptionId ?? value) || option.label === value;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={classNames(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content-primary",
                  optionClassName,
                  isActive && "bg-brand/12 text-brand",
                  isActive && activeOptionClassName,
                )}
              >
                {option.icon ? <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">{option.icon}</span> : null}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div ref={rootRef} className={classNames("relative", className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={buttonAriaLabel}
          title={buttonTitle}
          className={classNames(
            "app-control flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium",
            compact && "h-10 w-10 justify-center p-0",
            triggerClassName,
          )}
        >
          {leadingIcon ? <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">{leadingIcon}</span> : null}
          {!compact ? (
            <>
              <span>{value}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </>
          ) : null}
        </button>
      </div>
      {menu}
    </>
  );
}
