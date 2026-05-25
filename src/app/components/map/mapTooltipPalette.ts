export type MapTooltipThemeMode = "light" | "dark";

export interface MapTooltipPalette {
  background: string;
  border: string;
  text: string;
  subtle: string;
  shadow: string;
  markerBorder: string;
}

export function getMapTooltipPalette(themeMode: MapTooltipThemeMode): MapTooltipPalette {
  return themeMode === "light"
    ? {
        background: "rgba(255,255,255,0.96)",
        border: "rgba(15,23,42,0.12)",
        text: "#0f172a",
        subtle: "#64748b",
        shadow: "0 10px 22px rgba(15, 23, 42, 0.25)",
        markerBorder: "#ffffff",
      }
    : {
        background: "rgba(42,42,42,0.95)",
        border: "rgba(255,255,255,0.14)",
        text: "#f5f5f5",
        subtle: "#b8b8b8",
        shadow: "0 10px 24px rgba(0, 0, 0, 0.32)",
        markerBorder: "#242424",
      };
}
