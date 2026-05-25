/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FleetAlert } from "../../../../domain/models/alerts";
import { PlaybackRoute, TripSegment } from "../../../../domain/models/playback";
import { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";
import { VehicleDetailOverlay } from "./VehicleDetailOverlay";

const vehicle: Vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "moving",
  speedKph: 52,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  heading: 92,
  lastUpdatedIso: "2026-03-29T09:12:00Z",
  driverName: "Mila Janssen",
  driverIdentifier: "0007104552",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 0,
  fuelLevelPercent: 68,
  batteryLevelPercent: 93,
  teltonika: {
    imei: "352093086403655",
    model: "FMC003",
    protocol: "teltonika:tcp:avl",
    codec: "CODEC_8",
    timestampIso: "2026-03-29T09:12:00Z",
    attributes: {
      speed: { avlId: "24", attributeName: "speed", displayName: "Speed", value: 52, unit: "km/h", parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      ignition: { avlId: "239", attributeName: "ignition", displayName: "Ignition", value: true, parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      gsmSignal: { avlId: "21", attributeName: "gsmSignal", displayName: "GSM Signal", value: 5, parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      externalVoltage: { avlId: "66", attributeName: "externalVoltage", displayName: "External Voltage", value: 12.18, unit: "V", parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
    },
  },
} as Vehicle;

const detail: VehicleDetail = {
  ...vehicle,
  lastCommunicationIso: "2026-03-29T09:12:00Z",
  gpsAccuracyMeters: 8,
  todayMileageKm: 142.6,
  odometerKm: 125442,
  fuelInTankLiters: 231,
  averageFuelConsumptionLitersPer100Km: 24.1,
  stoppedDurationMinutes: 36,
};

const segment: TripSegment = {
  id: "seg-1",
  startLabel: "08:00",
  endLabel: "08:45",
  startTimeIso: "2026-03-29T08:00:00Z",
  endTimeIso: "2026-03-29T08:45:00Z",
  durationLabel: "45 min",
  durationMinutes: 45,
  distanceLabel: "32 km",
  distanceKm: 32,
  stopCount: 2,
  maxSpeedLabel: "74 km/h",
  maxSpeedKph: 74,
  averageSpeedLabel: "42 km/h",
  averageSpeedKph: 42,
  startProgressPercent: 10,
  endProgressPercent: 38,
};

const route: PlaybackRoute = {
  vehicleId: vehicle.id,
  points: [],
  tripSegments: [segment],
};

const activeAlert: FleetAlert = {
  id: "alert-speed-atlas",
  severity: "high",
  vehicleId: vehicle.id,
  vehicleName: vehicle.name,
  type: "Overspeed",
  rule: "Speed > 80 km/h",
  timeIso: "2026-03-29T09:13:00Z",
  state: "Active",
};

describe("VehicleDetailOverlay", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("shows a Street View configuration fallback when the embed key is missing", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");

    render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.getByText(/VITE_GOOGLE_MAPS_EMBED_API_KEY/)).toBeInTheDocument();
    expect(screen.queryByTitle(/Atlas 12 street view/i)).not.toBeInTheDocument();
  });

  it("renders the Street View iframe and opens the graph overlay for the selected segment", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "maps-test-key");
    const onOpenGraph = vi.fn();

    render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={true}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={onOpenGraph}
      />,
    );

    expect(screen.getByTitle("Atlas 12 street view")).toHaveAttribute("src", expect.stringContaining("maps-test-key"));

    fireEvent.click(screen.getByRole("button", { name: /view segment graph/i }));

    expect(onOpenGraph).toHaveBeenCalledWith("seg-1");
  });

  it("keeps Street View pinned to the opened overlay location until manually refreshed", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "maps-test-key");
    const updatedVehicle: Vehicle = {
      ...vehicle,
      latitude: 51.4512,
      longitude: 5.4815,
      heading: 138,
    };
    const updatedDetail: VehicleDetail = {
      ...detail,
      ...updatedVehicle,
      gpsAccuracyMeters: 7,
    };

    const { rerender } = render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={true}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    const initialSrc = screen.getByTitle("Atlas 12 street view").getAttribute("src");

    rerender(
      <VehicleDetailOverlay
        vehicle={updatedVehicle}
        detail={updatedDetail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={true}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.getByTitle("Atlas 12 street view")).toHaveAttribute("src", initialSrc);

    fireEvent.click(screen.getByRole("button", { name: /update street view/i }));

    const refreshedSrc = screen.getByTitle("Atlas 12 street view").getAttribute("src");
    expect(refreshedSrc).not.toBe(initialSrc);
    expect(refreshedSrc).toContain("location=51.4512%2C5.4815");
    expect(refreshedSrc).toContain("heading=138");
  });

  it("updates Street View when timeline inspection provides a new snapshot key", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "maps-test-key");
    const timelinePosition = {
      latitude: 51.4529,
      longitude: 5.4863,
      heading: 188,
    };

    const { rerender } = render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={true}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    const initialSrc = screen.getByTitle("Atlas 12 street view").getAttribute("src");

    rerender(
      <VehicleDetailOverlay
        vehicle={{ ...vehicle, latitude: 51.4512, longitude: 5.4815, heading: 138 }}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={true}
        streetViewSnapshotKey={1}
        streetViewPosition={timelinePosition}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    const updatedSrc = screen.getByTitle("Atlas 12 street view").getAttribute("src");
    expect(updatedSrc).not.toBe(initialSrc);
    expect(updatedSrc).toContain("location=51.4529%2C5.4863");
    expect(updatedSrc).toContain("heading=188");
  });

  it("shows selected Teltonika AVL attributes for live diagnostics", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");

    render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.getByText("Tracker attributes")).toBeInTheDocument();
    expect(screen.getByText("AVL 24")).toBeInTheDocument();
    expect(screen.getByText("speed")).toBeInTheDocument();
    expect(screen.getAllByText("52 km/h").length).toBeGreaterThan(0);
    expect(screen.getByText("AVL 66")).toBeInTheDocument();
    expect(screen.getByText("12.18 V")).toBeInTheDocument();
  });

  it("uses the operational context overlay layout with Teltonika identity metadata", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");

    render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.getByText("Last comms")).toBeInTheDocument();
    expect(screen.getByText("GPS accuracy")).toBeInTheDocument();
    expect(screen.getByText("Mileage today")).toBeInTheDocument();
    expect(screen.getByText("Operational context")).toBeInTheDocument();
    expect(screen.getByText("Current speed")).toBeInTheDocument();
    expect(screen.getByText("Stationary")).toBeInTheDocument();
    expect(screen.getByText("IMEI")).toBeInTheDocument();
    expect(screen.getByText("352093086403655")).toBeInTheDocument();
    expect(screen.getByText("Driver ID")).toBeInTheDocument();
    expect(screen.getByText("0007104552")).toBeInTheDocument();
    expect(screen.queryByText("Live telemetry")).not.toBeInTheDocument();
  });

  it("allows an unpinned overlay to collapse without removing the pin action", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");

    render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /collapse overlay/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pin overlay/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse overlay/i }));

    expect(screen.queryByText("Live telemetry")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand overlay/i })).toBeInTheDocument();
  });

  it("omits duplicate pin and collapse controls when rendered inside a pinned window", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");

    render(
      <VehicleDetailOverlay
        vehicle={vehicle}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={true}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
      />,
    );

    expect(screen.queryByRole("button", { name: /unpin overlay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /collapse overlay/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close overlay/i })).toBeInTheDocument();
  });

  it("allows active vehicle alerts to be acknowledged and resolved from the overlay", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");
    const onAlertStateChange = vi.fn();

    const { rerender } = render(
      <VehicleDetailOverlay
        vehicle={{ ...vehicle, status: "alerting", activeAlertCount: 1 }}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        activeAlerts={[activeAlert]}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
        onAlertStateChange={onAlertStateChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /acknowledge overspeed/i }));
    expect(screen.getByText("Acknowledge")).toBeInTheDocument();

    rerender(
      <VehicleDetailOverlay
        vehicle={{ ...vehicle, status: "alerting", activeAlertCount: 1 }}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        activeAlerts={[{ ...activeAlert, state: "Acknowledged" }]}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
        onAlertStateChange={onAlertStateChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /resolve overspeed/i }));

    expect(onAlertStateChange).toHaveBeenCalledWith("alert-speed-atlas", "Acknowledged");
    expect(onAlertStateChange).toHaveBeenCalledWith("alert-speed-atlas", "Resolved");
    expect(screen.getByTestId("alert-action-icon-alert-speed-atlas")).toHaveAttribute("data-icon-state", "resolve");
    expect(screen.getByText("Resolve")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ack$/i })).not.toBeInTheDocument();
  });

  it("keeps vehicle overlay alert state, time, and action controls right aligned", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");

    render(
      <VehicleDetailOverlay
        vehicle={{ ...vehicle, status: "alerting", activeAlertCount: 1 }}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        activeAlerts={[activeAlert]}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
        onAlertStateChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("vehicle-overlay-alert-card-alert-speed-atlas")).toHaveClass(
      "grid",
      "grid-cols-[minmax(0,1fr)_auto]",
    );
    expect(screen.getByTestId("vehicle-overlay-alert-badge-alert-speed-atlas")).toHaveClass("justify-self-end");
    expect(screen.getByTestId("vehicle-overlay-alert-reason-alert-speed-atlas")).toHaveClass("self-center");
    expect(screen.getByTestId("vehicle-overlay-alert-footer-alert-speed-atlas")).toHaveClass(
      "items-center",
      "justify-end",
      "self-center",
    );
  });

  it("hides resolved vehicle alerts while keeping acknowledged alerts actionable", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");

    render(
      <VehicleDetailOverlay
        vehicle={{ ...vehicle, status: "alerting", activeAlertCount: 1 }}
        detail={detail}
        route={route}
        selectedSegment={segment}
        isLoading={false}
        isPinned={false}
        activeAlerts={[activeAlert, { ...activeAlert, id: "alert-resolved", state: "Resolved" }, { ...activeAlert, id: "alert-acknowledged", state: "Acknowledged" }]}
        onClose={() => undefined}
        onTogglePin={() => undefined}
        onOpenGraph={() => undefined}
        onAlertStateChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("vehicle-overlay-alert-card-alert-speed-atlas")).toBeInTheDocument();
    expect(screen.getByTestId("vehicle-overlay-alert-card-alert-acknowledged")).toBeInTheDocument();
    expect(screen.queryByTestId("vehicle-overlay-alert-card-alert-resolved")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resolve overspeed/i })).toBeInTheDocument();
  });
});
