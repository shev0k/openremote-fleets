import { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { useAlerts } from "../contexts/AlertsContext";
import { CompactNavigationBar } from "./layout/CompactNavigationBar";
import { DesktopNavigationMenu } from "./layout/DesktopNavigationMenu";
import { LayoutBrand } from "./layout/LayoutBrand";
import { NotificationsPopover } from "./layout/NotificationsPopover";
import { ProfilePopover } from "./layout/ProfilePopover";
import { ThemeToggleButton } from "./layout/ThemeToggleButton";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { getBrowserLocalStorage, readLocalStorageItem } from "./shared/storage/safeStorage";
import {
  ACRYLIC_MODE_STORAGE_KEY,
  ACRYLIC_MODE_OVERRIDE_STORAGE_KEY,
  ACRYLIC_MODE_SYNC_EVENT,
  THEME_STORAGE_KEY,
  dispatchAcrylicModeSync,
  readAcrylicMode,
  writeAcrylicModePreference,
} from "../theme/acrylicMode";

function readInitialAcrylicMode() {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return true;
  }

  return readAcrylicMode(storage);
}

export function Layout() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isAcrylicMode, setAcrylicMode] = useState(readInitialAcrylicMode);

  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const { formatTime } = useAppPreferences();
  const isLiveFleetRoute = location.pathname === "/";
  const isPlaybackRoute = location.pathname === "/playback";
  const isFleetAcrylicScope = isLiveFleetRoute || isPlaybackRoute;

  const { alerts, activeAlertsCount } = useAlerts();
  const [readNotificationIds, setReadNotificationIds] = useState<Record<string, boolean>>({});

  const notifications = useMemo(
    () =>
      alerts.map((alert) => ({
        id: alert.id,
        title: alert.type,
        desc: `${alert.vehicleName} triggered rule "${alert.rule}".`,
        time: alert.timeIso ? formatTime(alert.timeIso) : "--",
        type:
          alert.severity === "high" ? ("critical" as const) : alert.severity === "medium" ? ("warning" as const) : ("info" as const),
        isRead: readNotificationIds[alert.id] ?? false,
      })),
    [alerts, readNotificationIds],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const handleAcrylicModeChange = (enabled: boolean) => {
    setAcrylicMode(enabled);

    const storage = getBrowserLocalStorage();
    if (!storage || typeof window === "undefined") {
      return;
    }

    const activeTheme = resolvedTheme ?? readLocalStorageItem(THEME_STORAGE_KEY);
    writeAcrylicModePreference(storage, enabled, activeTheme);
    dispatchAcrylicModeSync(window);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncAcrylicMode = () => {
      setAcrylicMode(readInitialAcrylicMode());
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === THEME_STORAGE_KEY
        || event.key === ACRYLIC_MODE_OVERRIDE_STORAGE_KEY
        || event.key === ACRYLIC_MODE_STORAGE_KEY
        || event.key?.startsWith(`${ACRYLIC_MODE_STORAGE_KEY}:`)
      ) {
        syncAcrylicMode();
      }
    };

    window.addEventListener(ACRYLIC_MODE_SYNC_EVENT, syncAcrylicMode);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(ACRYLIC_MODE_SYNC_EVENT, syncAcrylicMode);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const storage = getBrowserLocalStorage();
    if (!storage) {
      return;
    }

    setAcrylicMode(readAcrylicMode(storage, resolvedTheme));
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const isFleetAcrylicEnabled = isFleetAcrylicScope && isAcrylicMode;

    document.body.classList.toggle("ui-acrylic", isAcrylicMode);
    document.body.classList.toggle("ui-solid", !isAcrylicMode);
    document.body.classList.toggle("live-fleet-acrylic", isFleetAcrylicEnabled);

    return () => {
      document.body.classList.remove("ui-acrylic");
      document.body.classList.remove("ui-solid");
      document.body.classList.remove("live-fleet-acrylic");
    };
  }, [isAcrylicMode, isFleetAcrylicScope]);

  const closeAllPopovers = () => {
    setShowNotifications(false);
    setShowProfile(false);
  };

  const handleToggleNotifications = () => {
    setShowNotifications((open) => {
      const next = !open;
      if (next) {
        setShowProfile(false);
      }
      return next;
    });
  };

  const handleToggleProfile = () => {
    setShowProfile((open) => {
      const next = !open;
      if (next) {
        setShowNotifications(false);
      }
      return next;
    });
  };

  const handleOpenAlertsCenter = () => {
    setShowNotifications(false);
    navigate("/alerts");
  };

  const handleMarkAllNotificationsAsRead = () => {
    setReadNotificationIds((previous) => {
      const next = { ...previous };
      notifications.forEach((notification) => {
        next[notification.id] = true;
      });
      return next;
    });
  };

  return (
    <div className={`relative flex h-screen flex-col overflow-hidden bg-page font-sans text-content-primary ${isFleetAcrylicScope && isAcrylicMode ? "live-fleet-acrylic" : ""} ${isAcrylicMode ? "" : "ui-solid"}`}>
      {/* ======== TOP BAR ======== */}
      <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 z-[4000] pointer-events-none">
        <header className="app-panel grid h-[72px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 sm:px-6 lg:px-8 pointer-events-auto">
          <div className="min-w-0 justify-self-start">
            <LayoutBrand />
          </div>

          <div className="min-w-0 justify-self-center">
            <DesktopNavigationMenu activeAlertsCount={activeAlertsCount} />
          </div>

          <div className="relative flex min-w-0 shrink-0 items-center gap-2 justify-self-end sm:gap-4">
            <ThemeToggleButton
              isAcrylicMode={isAcrylicMode}
              onAcrylicModeChange={handleAcrylicModeChange}
              onOpenMenu={() => {
                setShowNotifications(false);
                setShowProfile(false);
              }}
            />

            <NotificationsPopover
              isOpen={showNotifications}
              unreadCount={unreadCount}
              notifications={notifications}
              onToggle={handleToggleNotifications}
              onNotificationClick={(notificationId) => {
                setReadNotificationIds((previous) => ({ ...previous, [notificationId]: true }));
                handleOpenAlertsCenter();
              }}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onViewAll={handleOpenAlertsCenter}
            />

            <ProfilePopover isOpen={showProfile} onToggle={handleToggleProfile} onClose={() => setShowProfile(false)} />
          </div>
        </header>
      </div>

      {/* ======== PAGE CONTENT ======== */}
      <main
        className={`relative isolate flex-1 overflow-hidden bg-transparent ${
          isLiveFleetRoute ? "p-0 pb-20 xl:pb-0" : "p-4 pt-[104px] pb-20 sm:p-6 sm:pt-[120px] xl:pb-6"
        }`}
      >
        <Outlet />
      </main>

      {/* ======== COMPACT NAV ======== */}
      <CompactNavigationBar activeAlertsCount={activeAlertsCount} />

      {(showNotifications || showProfile) && (
        <div className="fixed inset-0 z-[3000] bg-backdrop/10" onClick={closeAllPopovers} />
      )}

      <Toaster theme={resolvedTheme === "light" ? "light" : "dark"} position="bottom-right" />
    </div>
  );
}
