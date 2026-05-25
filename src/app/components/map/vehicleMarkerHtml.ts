import L from "leaflet";
import {
  DEFAULT_APP_PREFERENCES,
  type AppMapColorPreferences,
} from "../../../domain/models/preferences";
import type { Vehicle } from "../../../domain/models/vehicle";
import { getMapTooltipPalette, type MapTooltipThemeMode } from "./mapTooltipPalette";
import { escapeTooltipText } from "./routeSegments/routeTooltip";
import { getVehicleMapMarkerStatusMeta, type VehicleMapMarkerStatus } from "./vehicleMapMarkerStatus";

type MapThemeMode = MapTooltipThemeMode;

const TOOLTIP_PLACEHOLDER_DRIVER_VALUES = new Set(["", "--", "Unassigned"]);

function hasTooltipText(value: string | undefined | null): value is string {
  return Boolean(value && !TOOLTIP_PLACEHOLDER_DRIVER_VALUES.has(value.trim()));
}

function getVehicleTooltipDriverLabel(vehicle: Pick<Vehicle, "driverName" | "driverIdentifier">): string {
  if (hasTooltipText(vehicle.driverName)) {
    return vehicle.driverName.trim();
  }

  if (hasTooltipText(vehicle.driverIdentifier)) {
    return `Driver ID ${vehicle.driverIdentifier.trim()}`;
  }

  return "Unassigned";
}

function getStatusHexColor(
  statusId: VehicleMapMarkerStatus,
  mapColors: AppMapColorPreferences = DEFAULT_APP_PREFERENCES.mapColors,
) {
  if (statusId === "alerting") return mapColors.vehicleAlerting;
  if (statusId === "driverBreak") return mapColors.vehicleDriverBreak;
  if (statusId === "signalDegraded") return mapColors.vehicleSignalDegraded;
  if (statusId === "stopped") return mapColors.vehicleIdling;
  if (statusId === "idling") return mapColors.vehicleIdling;
  if (statusId === "parked") return mapColors.vehicleParked;
  if (statusId === "stationary") return mapColors.vehicleStationary;
  if (statusId === "offline") return mapColors.vehicleOffline;
  return mapColors.vehicleMoving;
}

function getMarkerSvg(vehicle: Vehicle) {
  const statusMeta = getVehicleMapMarkerStatusMeta(vehicle);

  if (statusMeta.id === "alerting") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path>
      <path d="M12 9v4"></path>
      <path d="M12 17h.01"></path>
    </svg>`;
  }

  if (statusMeta.id === "offline") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v10"></path>
      <path d="M18.4 6.4A9 9 0 1 1 5.6 6.4"></path>
    </svg>`;
  }

  if (statusMeta.id === "parked") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9"></path>
    </svg>`;
  }

  if (statusMeta.id === "driverBreak") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 8h10v4a5 5 0 0 1-10 0V8Z"></path>
      <path d="M17 9h1a2 2 0 0 1 0 4h-1"></path>
      <path d="M6 20h12"></path>
    </svg>`;
  }

  if (statusMeta.id === "signalDegraded") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 8.82a15 15 0 0 1 20 0"></path>
      <path d="M5 12.86a10 10 0 0 1 14 0"></path>
      <path d="M8.5 16.43a5 5 0 0 1 7 0"></path>
      <path d="M12 20h.01"></path>
    </svg>`;
  }

  if (statusMeta.id === "stopped") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M9 11h6v2H9v-2"></path>
    </svg>`;
  }

  if (statusMeta.id === "idling") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M10 15V9l5 3-5 3Z"></path>
    </svg>`;
  }

  if (statusMeta.id === "stationary") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M8 12h8"></path>
    </svg>`;
  }

  if (vehicle.assetClass === "truck") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="14" height="10" rx="2"></rect>
      <path d="M16 11h3.5a2 2 0 0 1 1.95 1.57l.5 3.43H16"></path>
      <circle cx="6" cy="17" r="2"></circle>
      <circle cx="18" cy="17" r="2"></circle>
    </svg>`;
  }

  if (vehicle.assetClass === "van") {
    return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 17h-.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h11A1.5 1.5 0 0 1 17 9.5v1.28L20.15 13H21a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 1-1.5 1.5h-.5"></path>
      <circle cx="8" cy="17" r="2"></circle>
      <circle cx="17" cy="17" r="2"></circle>
      <path d="M17 11h4"></path>
    </svg>`;
  }

  return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H8.3a2 2 0 0 0-1.6.8L4 11l-5.16.86a1 1 0 0 0-.84.99V16h3"></path>
    <circle cx="6.5" cy="16.5" r="2.5"></circle>
    <circle cx="16.5" cy="16.5" r="2.5"></circle>
  </svg>`;
}

function getNumericTeltonikaAttribute(vehicle: Vehicle, attributeName: string): number | null {
  const value = vehicle.teltonika?.attributes[attributeName]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBooleanTeltonikaAttribute(vehicle: Vehicle, attributeName: string): boolean | null {
  const value = vehicle.teltonika?.attributes[attributeName]?.value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value > 0;
  return null;
}

function normalizeHeading(degrees: number): number {
  return Math.round(((degrees % 360) + 360) % 360);
}

export function getReliableVehicleHeading(vehicle: Vehicle): number | null {
  const statusMeta = getVehicleMapMarkerStatusMeta(vehicle);
  if (
    statusMeta.id === "offline" ||
    statusMeta.id === "idling" ||
    statusMeta.id === "parked" ||
    statusMeta.id === "stationary" ||
    statusMeta.id === "stopped" ||
    statusMeta.id === "driverBreak" ||
    statusMeta.id === "signalDegraded"
  ) {
    return null;
  }

  const speedKph = getNumericTeltonikaAttribute(vehicle, "speed") ?? vehicle.speedKph;
  if (!Number.isFinite(speedKph) || speedKph < 3) {
    return null;
  }

  const movement = getBooleanTeltonikaAttribute(vehicle, "movement");
  if (movement === false || vehicle.ignitionOn === false) {
    return null;
  }

  const satellites = getNumericTeltonikaAttribute(vehicle, "satellites");
  if (satellites !== null && satellites < 4) {
    return null;
  }

  const gnssStatus = getNumericTeltonikaAttribute(vehicle, "gnssStatus");
  if (gnssStatus !== null && gnssStatus <= 0) {
    return null;
  }

  const gnssHdop = getNumericTeltonikaAttribute(vehicle, "gnssHdop");
  if (gnssHdop !== null && gnssHdop > 5) {
    return null;
  }

  const heading = Number.isFinite(vehicle.heading) ? vehicle.heading : getNumericTeltonikaAttribute(vehicle, "direction");
  return typeof heading === "number" && Number.isFinite(heading) ? normalizeHeading(heading) : null;
}

function createCircularVehicleMarkerHtml(
  vehicle: Vehicle,
  themeMode: MapThemeMode,
  isSelected: boolean,
  markerSize: number,
  shouldPulse: boolean,
  backgroundColor: string,
) {
  const statusMeta = getVehicleMapMarkerStatusMeta(vehicle);
  const palette = getMapTooltipPalette(themeMode);
  const pulseShadow = statusMeta.id === "alerting" ? "0 0 18px rgba(239, 68, 68, 0.65)" : `0 0 18px ${backgroundColor}55`;

  return `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${shouldPulse ? `<div class="animate-ping" style="position: absolute; inset: 2px; border-radius: 999px; background: ${backgroundColor}; opacity: 0.34;"></div>` : ""}
        <div style="
          position: relative;
          z-index: 1;
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${backgroundColor};
          box-shadow: ${isSelected || shouldPulse ? pulseShadow : palette.shadow};
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        ">
          ${getMarkerSvg(vehicle)}
        </div>
      </div>
    `;
}

function createPinVehicleMarkerHtml(
  vehicle: Vehicle,
  heading: number,
  themeMode: MapThemeMode,
  isSelected: boolean,
  markerSize: number,
  shouldPulse: boolean,
  backgroundColor: string,
) {
  const palette = getMapTooltipPalette(themeMode);
  const pinHeight = markerSize;
  const iconSize = Math.max(15, Math.round(markerSize * 0.44));
  const pulseShadow = shouldPulse ? "0 0 20px rgba(239, 68, 68, 0.62)" : palette.shadow;
  const rotationDegrees = heading - 90;

  return `
      <div class="vehicle-marker-droplet" style="position: relative; width: ${markerSize}px; height: ${pinHeight}px;">
        ${shouldPulse ? `<div class="animate-ping" style="position: absolute; left: 5px; right: 5px; top: 5px; height: ${markerSize - 6}px; border-radius: 999px; background: ${backgroundColor}; opacity: 0.3;"></div>` : ""}
        <div class="vehicle-marker-droplet-shell" style="position: absolute; inset: 0; z-index: 1; transform-origin: 50% 50%; transform: rotate(${rotationDegrees}deg); filter: drop-shadow(${isSelected || shouldPulse ? pulseShadow : palette.shadow});">
          <svg class="vehicle-marker-droplet-shape" width="${markerSize}" height="${pinHeight}" viewBox="0 0 44 44" style="position: absolute; inset: 0;" aria-hidden="true">
            <path d="M42.5 22C34.5 15.8 29.3 7.2 19.6 7.2 11.9 7.2 5.8 13.4 5.8 22s6.1 14.8 13.8 14.8c9.7 0 14.9-8.6 22.9-14.8Z" fill="${backgroundColor}"></path>
            <circle cx="22" cy="22" r="11.5" fill="rgba(255,255,255,0.16)"></circle>
          </svg>
        </div>
        <div class="vehicle-marker-droplet-icon" style="
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 2;
          display: flex;
          width: ${iconSize}px;
          height: ${iconSize}px;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
        ">
          ${getMarkerSvg(vehicle)}
        </div>
      </div>
    `;
}

export function createVehicleMarkerHtml(
  vehicle: Vehicle,
  themeMode: MapThemeMode,
  isSelected: boolean,
  mapColors: AppMapColorPreferences = DEFAULT_APP_PREFERENCES.mapColors,
) {
  const statusMeta = getVehicleMapMarkerStatusMeta(vehicle);
  const backgroundColor = getStatusHexColor(statusMeta.id, mapColors);
  const heading = getReliableVehicleHeading(vehicle);
  const markerSize = heading !== null ? (isSelected ? 46 : 40) : isSelected ? 38 : 32;
  const shouldPulse = statusMeta.id === "alerting" || vehicle.activeAlertCount > 0;

  return heading !== null
    ? createPinVehicleMarkerHtml(vehicle, heading, themeMode, isSelected, markerSize, shouldPulse, backgroundColor)
    : createCircularVehicleMarkerHtml(vehicle, themeMode, isSelected, markerSize, shouldPulse, backgroundColor);
}

export function createIcon(
  vehicle: Vehicle,
  themeMode: MapThemeMode,
  isSelected: boolean,
  mapColors: AppMapColorPreferences,
) {
  const heading = getReliableVehicleHeading(vehicle);
  const markerSize = heading !== null ? (isSelected ? 46 : 40) : isSelected ? 38 : 32;

  return L.divIcon({
    className: "custom-div-icon",
    html: createVehicleMarkerHtml(vehicle, themeMode, isSelected, mapColors),
    iconSize: heading !== null ? [markerSize, markerSize] : [markerSize, markerSize],
    iconAnchor: [markerSize / 2, markerSize / 2],
  });
}

export function createVehicleTooltipHtml(
  vehicle: Vehicle,
  themeMode: MapThemeMode,
  mapColors: AppMapColorPreferences = DEFAULT_APP_PREFERENCES.mapColors,
) {
  const palette = getMapTooltipPalette(themeMode);
  const statusMeta = getVehicleMapMarkerStatusMeta(vehicle);
  const statusColor = getStatusHexColor(statusMeta.id, mapColors);
  const vehicleName = escapeTooltipText(vehicle.name);
  const statusLabel = escapeTooltipText(statusMeta.label);
  const driverName = escapeTooltipText(getVehicleTooltipDriverLabel(vehicle));
  const speedLabel = escapeTooltipText(`${vehicle.speedKph} km/h`);

  return `
    <div style="
      min-width: 160px;
      border-radius: 16px;
      background: ${palette.background};
      border: 1px solid ${palette.border};
      color: ${palette.text};
      box-shadow: ${palette.shadow};
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    ">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:14px; font-weight:700;">
        <span>${vehicleName}</span>
        <span style="display:inline-flex; align-items:center; justify-content:center; min-width:72px; padding:4px 8px; border-radius:999px; background:${statusColor}18; color:${statusColor}; font-size:11px; font-weight:700; text-transform:uppercase;">${statusLabel}</span>
      </div>
      <div style="font-size:12px; color:${palette.subtle};">${driverName}</div>
      <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid ${palette.border}; padding-top:8px; font-size:12px;">
        <span style="color:${palette.subtle}; text-transform:uppercase; letter-spacing:0.08em;">Speed</span>
        <span style="font-weight:700; color:${statusColor};">${speedLabel}</span>
      </div>
    </div>
  `;
}
