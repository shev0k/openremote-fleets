import type { ReactNode } from "react";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Gauge,
  MapPinned,
  Radio,
  Route,
  Server,
} from "lucide-react";
import type { VehicleDetail } from "../../../src/domain/models/vehicle";
import { getVehicleDisplayStatusCatalogue } from "../../../src/app/components/map/vehicleDisplayStatus";
import { LiveTelemetryCard } from "../../../src/app/features/live-fleet/components/LiveTelemetryCard";
import { MetricTileCard } from "../../../src/app/components/shared/cards/MetricTileCard";
import { PageHeaderPanel } from "../../../src/app/components/shared/layout/PageHeaderPanel";
import { SegmentedControl } from "../../../src/app/components/shared/controls/SegmentedControl";

const sampleTimestamp = "2026-05-25T14:20:00.000Z";

const sampleVehicleDetail: VehicleDetail = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "OR-AT-12",
  status: "moving",
  speedKph: 62,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  hasLocation: true,
  telemetryQuality: {
    hasSpeed: true,
    hasIgnition: true,
    hasHeading: true,
    hasLocation: true,
  },
  heading: 84,
  lastUpdatedIso: sampleTimestamp,
  driverName: "Maya Chen",
  trackerId: "352094085231628",
  assetName: "Atlas Prime",
  assetClass: "van",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 0,
  driverIdentifier: "IB-2048",
  fuelLevelPercent: 64,
  batteryLevelPercent: 86,
  latestTelemetrySamples: [
    { signalId: "speed", timestampIso: sampleTimestamp, value: 62, sourceAttribute: "speed" },
    { signalId: "ignition", timestampIso: sampleTimestamp, value: true, sourceAttribute: "ignition" },
    { signalId: "movement", timestampIso: sampleTimestamp, value: true, sourceAttribute: "movement" },
    { signalId: "fuelLevel", timestampIso: sampleTimestamp, value: 64, sourceAttribute: "fuelLevel" },
    { signalId: "batteryLevel", timestampIso: sampleTimestamp, value: 86, sourceAttribute: "batteryLevel" },
    { signalId: "engineRpm", timestampIso: sampleTimestamp, value: 2180, sourceAttribute: "engineRpm" },
    { signalId: "externalVoltage", timestampIso: sampleTimestamp, value: 13.8, sourceAttribute: "externalVoltage" },
    { signalId: "gsmSignal", timestampIso: sampleTimestamp, value: 4, sourceAttribute: "gsmSignal" },
    { signalId: "gnssHdop", timestampIso: sampleTimestamp, value: 0.9, sourceAttribute: "gnssHdop" },
    { signalId: "totalOdometer", timestampIso: sampleTimestamp, value: 1482200, sourceAttribute: "totalOdometer" },
  ],
  teltonika: {
    imei: "352094085231628",
    model: "FMC003",
    protocol: "teltonika:tcp:avl",
    codec: "CODEC_8",
    timestampIso: sampleTimestamp,
    attributes: {
      speed: {
        avlId: "24",
        attributeName: "speed",
        displayName: "Speed",
        value: 62,
        unit: "km/h",
        parameterGroup: "Permanent I/O elements",
        timestampIso: sampleTimestamp,
      },
      ignition: {
        avlId: "239",
        attributeName: "ignition",
        displayName: "Ignition",
        value: true,
        parameterGroup: "Permanent I/O elements",
        timestampIso: sampleTimestamp,
      },
      gsmSignal: {
        avlId: "21",
        attributeName: "gsmSignal",
        displayName: "GSM Signal",
        value: 4,
        parameterGroup: "Permanent I/O elements",
        timestampIso: sampleTimestamp,
      },
    },
  },
  availableTelemetrySignals: [],
  lastCommunicationIso: sampleTimestamp,
  gpsAccuracyMeters: 7,
  todayMileageKm: 83,
  odometerKm: 1482,
  fuelInTankLiters: 42,
  averageFuelConsumptionLitersPer100Km: 7.8,
  stoppedDurationMinutes: 18,
};

function ExampleStack({ children }: { children: ReactNode }) {
  return <div className="doc-example-surface flex flex-col gap-5">{children}</div>;
}

export function AppSurfaceExample() {
  const [segment, setSegment] = useState("live");

  return (
    <ExampleStack>
      <PageHeaderPanel
        icon={<MapPinned className="h-5 w-5 text-brand" />}
        title="Live Fleet"
        description="The real app keeps this screen map-first, then layers fleet lists, alerts, route history, and selected-vehicle context around it."
        actions={<button className="app-control rounded-full px-4 py-2 text-sm">Refresh</button>}
      />

      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { id: "live", label: "Live", count: 5 },
          { id: "alerts", label: "Alerts", count: 3 },
          { id: "history", label: "History" },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetricTileCard
          icon={<Activity className="h-5 w-5 text-brand" />}
          title="Moving"
          value="3"
          subtitle="Route-backed mock simulation"
        />
        <MetricTileCard
          icon={<Bell className="h-5 w-5 text-danger" />}
          title="Open alerts"
          value="5"
          subtitle="Acknowledged and resolved in memory"
        />
        <MetricTileCard
          icon={<Radio className="h-5 w-5 text-warning" />}
          title="Telemetry"
          value="21"
          subtitle="Teltonika and OpenRemote signals"
        />
      </div>
    </ExampleStack>
  );
}

export function LiveTelemetryExample() {
  return (
    <ExampleStack>
      <div className="max-w-2xl">
        <LiveTelemetryCard vehicle={sampleVehicleDetail} detail={sampleVehicleDetail} />
      </div>
    </ExampleStack>
  );
}

export function VehicleStatusBadgeExample() {
  return (
    <ExampleStack>
      <div className="doc-status-grid">
        {getVehicleDisplayStatusCatalogue().map((status) => {
          const Icon = status.icon;
          return (
            <span
              key={status.id}
              className={`${status.badgeClassName} inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold`}
            >
              <Icon className="h-4 w-4" />
              {status.label}
            </span>
          );
        })}
      </div>
    </ExampleStack>
  );
}

export function FeatureRouteExample() {
  const rows = [
    ["Live Fleet", "/", "Map-first dispatch workspace", "layout"],
    ["Route Playback", "/playback", "Historical route review and timeline", "layout"],
    ["Alerts", "/alerts", "Fleet alert review and state updates", "layout"],
    ["Graphs", "/graphs", "Configurable operational dashboard", "layout"],
    ["Reports", "/reports", "Definition-driven report builder", "layout"],
    ["Assets", "/admin", "Tracker inventory and Teltonika metadata", "layout"],
    ["Preferences", "/preferences", "Branding, theme, map, and time settings", "hidden nav"],
    ["Wall Display", "/wall-display", "Standalone operations screen", "standalone"],
  ];

  return (
    <table className="doc-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th>Route</th>
          <th>Purpose</th>
          <th>Placement</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([feature, route, purpose, placement]) => (
          <tr key={feature}>
            <td>{feature}</td>
            <td>
              <code>{route}</code>
            </td>
            <td>{purpose}</td>
            <td>{placement}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ThemeTokenExample() {
  const tokens = [
    ["Page", "var(--page)", "App background"],
    ["Panel", "var(--panel)", "Main panels"],
    ["Panel muted", "var(--panel-muted)", "Nested quiet panels"],
    ["Brand", "var(--brand)", "Primary actions and active states"],
    ["Danger", "var(--danger)", "Critical alerts"],
    ["Warning", "var(--warning)", "Degraded signals"],
  ];

  return (
    <div className="doc-example-surface">
      <div className="doc-token-row">
        {tokens.map(([label, color, help]) => (
          <div className="doc-token" key={label}>
            <div className="doc-token-color" style={{ background: color }} />
            <span className="doc-token-label">
              <strong>{label}</strong>
              <br />
              {help}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MaintenanceChecksExample() {
  return (
    <ExampleStack>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricTileCard
          icon={<Gauge className="h-5 w-5 text-brand" />}
          title="Fast check"
          value="typecheck"
          subtitle="TypeScript only"
        />
        <MetricTileCard
          icon={<BarChart3 className="h-5 w-5 text-brand" />}
          title="App safety"
          value="test"
          subtitle="Vitest over src/"
        />
        <MetricTileCard
          icon={<Server className="h-5 w-5 text-brand" />}
          title="Bundle split"
          value="verify"
          subtitle="Real and mock boundary checks"
        />
      </div>
    </ExampleStack>
  );
}

export function AlertAndAssetExample() {
  return (
    <ExampleStack>
      <div className="grid gap-3 md:grid-cols-2">
        <MetricTileCard
          icon={<AlertTriangle className="h-5 w-5 text-danger" />}
          title="Alert state"
          value="active"
          subtitle="OpenRemote alarms map to FleetAlert"
        />
        <MetricTileCard
          icon={<Server className="h-5 w-5 text-brand" />}
          title="Tracker state"
          value="connected"
          subtitle="Assets map from Teltonika tracker metadata"
        />
      </div>
    </ExampleStack>
  );
}

export function PlaybackExample() {
  return (
    <ExampleStack>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricTileCard
          icon={<Route className="h-5 w-5 text-brand" />}
          title="Trip split"
          value="trip"
          subtitle="Uses Teltonika trip when available"
        />
        <MetricTileCard
          icon={<Gauge className="h-5 w-5 text-brand" />}
          title="Speed"
          value="62 km/h"
          subtitle="Carried to nearby route points"
        />
        <MetricTileCard
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          title="Markers"
          value="stop"
          subtitle="Idle, break, offline, signal, alarm"
        />
      </div>
    </ExampleStack>
  );
}
