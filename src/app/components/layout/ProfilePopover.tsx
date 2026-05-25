import { ChevronRight, LogOut, MonitorUp, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useAppSession } from "../../providers/session/appSessionContext";
import { useAnchoredPopoverPosition } from "../shared/overlays/useAnchoredPopoverPosition";
import { getProfileIdentity } from "./profileIdentity";

interface ProfilePopoverProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

export function ProfilePopover({ isOpen, onToggle, onClose }: ProfilePopoverProps) {
  const { session, logout } = useAppSession();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileIdentity = useMemo(() => getProfileIdentity(session), [session]);
  const canSignOut = session.authenticated;
  const closePopover = useCallback(() => onClose?.(), [onClose]);
  const popoverStyle = useAnchoredPopoverPosition({
    isOpen,
    anchorRef: buttonRef,
    popoverRef: menuRef,
    onClose: closePopover,
    align: "end",
    width: 260,
  });

  const handleSignOut = () => {
    if (!canSignOut) {
      return;
    }

    onClose?.();
    logout();
  };

  const handleOpenWallDisplay = () => {
    onClose?.();
    navigate("/wall-display");
  };

  const handleOpenPreferences = () => {
    onClose?.();
    navigate("/preferences");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const popover =
    isOpen && popoverStyle
      ? createPortal(
          <div ref={menuRef} style={popoverStyle} className="app-overlay nav-acrylic-popover z-[5000] rounded-[24px]">
            <div className="overflow-hidden rounded-[inherit] flex flex-col">
              <div className="nav-acrylic-chip flex items-center gap-3 border-b border-border-subtle p-5">
                <div className="nav-acrylic-chip flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-sm font-semibold text-content-secondary">
                  {profileIdentity.initials}
                </div>
                <div>
                  <h3 className="max-w-[180px] truncate text-[15px] font-semibold text-content-primary">
                    {profileIdentity.displayName}
                  </h3>
                  <p className="max-w-[180px] truncate text-[12px] text-content-muted">
                    {profileIdentity.secondaryLabel}
                  </p>
                </div>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <button
                  onClick={handleOpenWallDisplay}
                  className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium text-content-secondary transition-colors hover:bg-surface-elevated/70 hover:text-content-primary"
                >
                  <div className="flex items-center gap-3">
                    <MonitorUp className="h-4 w-4 text-content-muted/80" />
                    Wall Display
                  </div>
                  <ChevronRight className="h-4 w-4 text-content-muted/50" />
                </button>
                <button
                  onClick={handleOpenPreferences}
                  className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium text-content-secondary transition-colors hover:bg-surface-elevated/70 hover:text-content-primary"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-content-muted/80" />
                    Preferences
                  </div>
                  <ChevronRight className="h-4 w-4 text-content-muted/50" />
                </button>
              </div>
              <div className="flex flex-col gap-1 border-t border-border-subtle p-2">
                <button
                  disabled={!canSignOut}
                  onClick={handleSignOut}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    canSignOut
                      ? "text-danger hover:bg-danger/10"
                      : "cursor-not-allowed text-content-muted/60"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={onToggle}
          className={`app-control flex h-10 items-center gap-2 overflow-hidden rounded-full pl-1 pr-3 transition-all ${isOpen ? "!border-brand/30 !bg-brand/14 !text-brand" : ""}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated/55 text-xs font-semibold text-content-secondary">
            {profileIdentity.initials}
          </div>
          <div className="hidden min-w-0 text-left sm:flex sm:flex-col">
            <span className="max-w-[140px] truncate text-[12px] font-semibold leading-tight text-content-primary">
              {profileIdentity.displayName}
            </span>
            <span className="max-w-[140px] truncate text-[11px] leading-tight text-content-muted">
              {profileIdentity.secondaryLabel}
            </span>
          </div>
        </button>
      </div>
      {popover}
    </>
  );
}
