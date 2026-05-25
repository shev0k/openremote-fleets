import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPopoverPosition } from "../shared/overlays/useAnchoredPopoverPosition";

interface ThemeToggleButtonProps {
  isAcrylicMode?: boolean;
  onAcrylicModeChange?: (enabled: boolean) => void;
  onOpenMenu?: () => void;
}

export function ThemeToggleButton({ isAcrylicMode = true, onAcrylicModeChange, onOpenMenu }: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme !== "light";
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const menuStyle = useAnchoredPopoverPosition({
    isOpen,
    anchorRef: buttonRef,
    popoverRef: menuRef,
    onClose: closeMenu,
    align: "end",
    width: 224,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const menu =
    isOpen && menuStyle
      ? createPortal(
          <div ref={menuRef} style={menuStyle} className="app-overlay nav-acrylic-popover z-[5000] rounded-2xl p-3">
            <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Appearance</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setTheme("light");
                  setIsOpen(false);
                }}
                className={`nav-acrylic-chip flex h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${!isDarkMode ? "border-brand/30 bg-brand/15 text-brand" : "text-content-secondary hover:text-content-primary"}`}
              >
                <span>Light mode</span>
                <Sun className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme("dark");
                  setIsOpen(false);
                }}
                className={`nav-acrylic-chip flex h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${isDarkMode ? "border-brand/30 bg-brand/15 text-brand" : "text-content-secondary hover:text-content-primary"}`}
              >
                <span>Dark mode</span>
                <Moon className="h-4 w-4" />
              </button>
            </div>

            {onAcrylicModeChange ? (
              <div className="mt-3 border-t border-border-subtle pt-3">
                <button
                  type="button"
                  onClick={() => onAcrylicModeChange(!isAcrylicMode)}
                  className="nav-acrylic-chip flex h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium text-content-secondary transition-colors hover:text-content-primary"
                  aria-label="Toggle acrylic mode"
                >
                  <span>{isAcrylicMode ? "Acrylic mode" : "Solid mode"}</span>
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAcrylicMode ? "bg-brand/50" : "bg-content-muted/35"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isAcrylicMode ? "translate-x-4" : "translate-x-1"}`}
                    />
                  </span>
                </button>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() =>
          setIsOpen((open) => {
            const next = !open;
            if (next) {
              onOpenMenu?.();
            }
            return next;
          })
        }
        className={`app-control flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isOpen ? "!border-brand/30 !bg-brand/14 !text-brand" : ""}`}
        aria-label="Open appearance settings"
        title="Open appearance settings"
      >
        {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>
    </div>
    {menu}
    </>
  );
}
