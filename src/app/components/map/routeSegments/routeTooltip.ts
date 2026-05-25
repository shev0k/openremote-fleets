import { getMapTooltipPalette, type MapTooltipThemeMode, type MapTooltipPalette } from "../mapTooltipPalette";

export type RouteTooltipThemeMode = MapTooltipThemeMode;
export type RouteTooltipPalette = Omit<MapTooltipPalette, "markerBorder">;

interface RouteTooltipHtmlInput {
  themeMode: RouteTooltipThemeMode;
  body: string;
  minWidth?: number;
}

export function getRouteTooltipClassName() {
  return "!bg-transparent !border-0 !shadow-none !p-0";
}

export function getRouteTooltipPalette(themeMode: RouteTooltipThemeMode): RouteTooltipPalette {
  const { markerBorder: _markerBorder, ...palette } = getMapTooltipPalette(themeMode);
  return palette;
}

export function escapeTooltipText(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildRouteTooltipHtml({
  themeMode,
  body,
  minWidth = 172,
}: RouteTooltipHtmlInput) {
  const palette = getRouteTooltipPalette(themeMode);

  return `
    <div style="
      min-width: ${minWidth}px;
      border-radius: 16px;
      background: ${palette.background};
      border: 1px solid ${palette.border};
      color: ${palette.text};
      box-shadow: ${palette.shadow};
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    ">
      ${body}
    </div>
  `;
}
