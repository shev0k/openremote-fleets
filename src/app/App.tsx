import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AlertsProvider } from "./contexts/AlertsContext";
import { AppServicesProvider } from "./providers/AppServicesProvider";
import { AppThemeProvider } from "./providers/AppThemeProvider";
import { AppSessionProvider } from "./providers/session/AppSessionProvider";
import { AppPreferencesProvider } from "./providers/AppPreferencesProvider";
import { DesktopOnlyOverlay } from "./components/DesktopOnlyOverlay";
import "leaflet/dist/leaflet.css";

export default function App() {
  return (
    <AppThemeProvider>
      <AppSessionProvider>
        <AppServicesProvider>
          <AppPreferencesProvider>
            <AlertsProvider>
              <RouterProvider router={router} />
              <DesktopOnlyOverlay />
            </AlertsProvider>
          </AppPreferencesProvider>
        </AppServicesProvider>
      </AppSessionProvider>
    </AppThemeProvider>
  );
}
