import { AlertTriangle, Bell, ShieldAlert } from "lucide-react";
import { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPopoverPosition } from "../shared/overlays/useAnchoredPopoverPosition";

interface LayoutNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "critical" | "warning" | "info";
  isRead: boolean;
}

interface NotificationsPopoverProps {
  isOpen: boolean;
  unreadCount: number;
  notifications: LayoutNotification[];
  onToggle: () => void;
  onNotificationClick: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onViewAll: () => void;
}

export function NotificationsPopover({
  isOpen,
  unreadCount,
  notifications,
  onToggle,
  onNotificationClick,
  onMarkAllAsRead,
  onViewAll,
}: NotificationsPopoverProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closePopover = useCallback(() => {
    if (isOpen) {
      onToggle();
    }
  }, [isOpen, onToggle]);
  const popoverStyle = useAnchoredPopoverPosition({
    isOpen,
    anchorRef: buttonRef,
    popoverRef: menuRef,
    onClose: closePopover,
    align: "end",
    width: 380,
  });

  const popover =
    isOpen && popoverStyle
      ? createPortal(
          <div
            ref={menuRef}
            style={popoverStyle}
            className="app-overlay nav-acrylic-popover z-[5000] flex flex-col rounded-[24px]"
          >
            <div className="overflow-hidden rounded-[inherit] flex flex-col">
              <div className="nav-acrylic-chip flex items-center justify-between border-b border-border-subtle p-4">
                <h3 className="text-[15px] font-semibold text-content-primary">
                  Notifications{" "}
                  {unreadCount > 0 && (
                    <span className="ml-2 rounded-full bg-brand/12 px-2 py-0.5 text-[10px] text-brand">{unreadCount} new</span>
                  )}
                </h3>
                {unreadCount > 0 && (
                  <button onClick={onMarkAllAsRead} className="text-[12px] font-medium text-brand hover:underline">
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => onNotificationClick(notification.id)}
                    className={`nav-acrylic-chip group relative flex cursor-pointer gap-3 border-b border-border-subtle p-4 transition-colors hover:text-content-primary ${notification.isRead ? "text-content-secondary" : ""}`}
                  >
                    {!notification.isRead && <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-brand"></div>}
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      notification.type === "critical"
                        ? "bg-danger/12 text-danger"
                        : notification.type === "warning"
                        ? "bg-warning/12 text-warning"
                        : "bg-brand/12 text-brand"
                    }`}>
                      {notification.type === "critical" ? <AlertTriangle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-[14px] font-medium text-content-primary transition-colors group-hover:text-brand">{notification.title}</h4>
                        <span className="text-[11px] text-content-muted">{notification.time}</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-content-muted">{notification.desc}</p>
                    </div>
                  </div>
                ))}
                {!notifications.length && (
                  <div className="p-6 text-center text-[13px] text-content-muted">No notifications available.</div>
                )}
              </div>

              <div
                onClick={onViewAll}
                className="nav-acrylic-chip cursor-pointer border-t border-border-subtle p-3 text-center text-[13px] font-medium text-content-muted transition-colors hover:text-content-primary"
              >
                View all in Alerts Center
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
        className={`app-control relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isOpen ? "!border-brand/30 !bg-brand/14 !text-brand" : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
        )}
      </button>
    </div>
    {popover}
    </>
  );
}
