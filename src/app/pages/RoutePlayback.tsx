import { Calendar, Fingerprint, Hash, KeyRound, Route as RouteIcon, Truck, User } from "lucide-react";
import { ReactNode, useRef, useState } from "react";
import { CustomMap } from "../components/map/CustomMap";
import { SelectionDropdown } from "../components/shared/controls/SelectionDropdown";
import { DatePickerPopover } from "../components/shared/datePicker/DatePickerPopover";
import { PageHeaderPanel } from "../components/shared/layout/PageHeaderPanel";
import { SegmentGraphOverlay } from "../components/playback/SegmentGraphOverlay";
import { PlaybackTimelineDock } from "../components/playback/PlaybackTimelineDock";
import { TripSegmentsPanel } from "../components/playback/TripSegmentsPanel";
import { PlaybackQuery, PlaybackQueryPreset } from "../../domain/models/playback";
import { Vehicle } from "../../domain/models/vehicle";
import { useRoutePlaybackWorkspace } from "../features/playback/useRoutePlaybackWorkspace";
import { formatVehicleDriverDisplay, formatVehiclePlateDisplay } from "../features/live-fleet/components/vehicleIdentityDisplay";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

function getPresetLabel(query: PlaybackQuery) {
  if (query.preset === "last7Days") return "Last 7 Days";
  if (query.preset === "last24Hours") return "Last 24 Hours";
  if (query.preset === "customDate" && query.customDateIso) {
    return new Date(`${query.customDateIso}T00:00:00`).toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return query.preset.charAt(0).toUpperCase() + query.preset.slice(1);
}

function getDriverIdValue(vehicle: Vehicle): string {
  const teltonikaIButton = vehicle.teltonika?.attributes.iButton?.value;
  return vehicle.driverIdentifier ?? (teltonikaIButton !== undefined ? String(teltonikaIButton) : "--");
}

function VehicleSelectorMetricCard({
  id,
  label,
  value,
  icon,
  isMono = false,
}: {
  id: string;
  label: string;
  value: string;
  icon: ReactNode;
  isMono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[12px] border border-border-subtle bg-panel-muted px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-1.5 text-content-muted">
        <span
          data-testid={`route-playback-selector-${id}-icon`}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-sunken [&_svg]:h-3 [&_svg]:w-3"
        >
          {icon}
        </span>
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className={`mt-1 truncate text-[13px] font-semibold text-content-primary ${isMono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function RoutePlayback() {
  const { preferences } = useAppPreferences();
  const {
    activeCalendarDateValue,
    activeSegmentLine,
    beginTimelineScrub,
    calendarMonth,
    endTimelineScrub,
    fastForwardPlayback,
    graphSegment,
    isLoadingRoute,
    isLoadingVehicles,
    isPlaybackRunning,
    playbackProgress,
    playbackSpeed,
    playbackVehicle,
    query,
    rewindPlayback,
    routeLine,
    routeWithAlertMarkers,
    selectTripSegment,
    selectedSegmentId,
    selectedVehicle,
    selectedVehicleId,
    setGraphSegmentId,
    setPlaybackProgress,
    setPlaybackSpeed,
    setQuery,
    setSelectedVehicleId,
    setTimelineHeightPx,
    timelineHeightPx,
    togglePlayback,
    vehicles,
  } = useRoutePlaybackWorkspace();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="flex h-full flex-col gap-6 text-content-primary">
      <PageHeaderPanel
        className="relative z-[1500]"
        title="Route Playback"
        description="Replay trips, inspect segments, and keep route context synchronized with the map."
        icon={<RouteIcon className="h-6 w-6 text-brand" />}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative z-[2600]">
              <button
                ref={datePickerButtonRef}
                type="button"
                onClick={() => setShowDatePicker((open) => !open)}
                className="app-control flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium"
              >
                <Calendar className="h-4 w-4 text-content-muted" />
                {getPresetLabel(query)}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="mr-1 text-[13px] font-medium text-content-muted">Presets:</span>
              {[
                { label: "Today", preset: "today" },
                { label: "Yesterday", preset: "yesterday" },
                { label: "Last 7 Days", preset: "last7Days" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setQuery({ preset: preset.preset as PlaybackQueryPreset });
                    setShowDatePicker(false);
                  }}
                  className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                    query.preset === preset.preset
                      ? "border-brand/20 bg-brand/10 text-brand"
                      : "border-transparent bg-surface-elevated text-content-secondary hover:bg-surface-sunken"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row">
        <div className="relative flex min-h-[460px] flex-1 overflow-hidden rounded-[30px] border border-border-subtle bg-panel">
          <CustomMap
            vehicles={playbackVehicle ? [playbackVehicle] : []}
            selectedVehicleId={playbackVehicle?.id}
            routeLine={routeLine}
            activeSegmentLine={activeSegmentLine}
            route={routeWithAlertMarkers}
            activeSegmentId={selectedSegmentId}
            onRouteSegmentClick={selectTripSegment}
            mapType={preferences.behavior.defaultMapLayer}
            isRouteLoading={isLoadingRoute}
            fitPaddingBottomPx={timelineHeightPx ? timelineHeightPx + 32 : 260}
          />

          {!playbackVehicle ? (
            <div className="absolute inset-6 z-[1000] flex items-center justify-center">
              <div className="app-overlay rounded-[22px] px-5 py-4 text-center text-[13px] text-content-muted">
                {isLoadingVehicles ? "Loading playback vehicles..." : "No playback vehicle available."}
              </div>
            </div>
          ) : null}

          <div
            data-testid="route-playback-vehicle-selector"
            className="absolute left-6 top-6 z-[1000] w-[min(340px,calc(100%-3rem))] app-overlay rounded-[18px] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-content-muted">
                <Truck className="h-4 w-4 shrink-0" />
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em]">Vehicle selector</p>
              </div>
              <span className="shrink-0 rounded-full border border-border-subtle bg-panel-muted px-2 py-0.5 text-[10px] font-semibold text-content-secondary">
                {vehicles.length} vehicles
              </span>
            </div>

            <div className="mt-3">
              <SelectionDropdown
                align="left"
                value={selectedVehicle?.name ?? (isLoadingVehicles ? "Loading vehicles..." : "No vehicles")}
                options={vehicles.map((vehicle) => ({ id: vehicle.id, label: vehicle.name }))}
                activeOptionId={selectedVehicleId ?? undefined}
                onChange={setSelectedVehicleId}
                leadingIcon={<Truck className="h-4 w-4" />}
                menuTitle="Playback vehicles"
                buttonAriaLabel="Select playback vehicle"
                triggerClassName="min-h-[42px] w-full justify-between rounded-[14px] px-3 text-[14px]"
                menuClassName="w-[min(316px,calc(100vw-3rem))]"
                optionClassName="py-2 text-[14px]"
              />
            </div>

            {selectedVehicle ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <VehicleSelectorMetricCard id="plate" label="Plate" value={formatVehiclePlateDisplay(selectedVehicle, "No plate")} icon={<Hash />} />
                <VehicleSelectorMetricCard id="driver" label="Driver" value={formatVehicleDriverDisplay(selectedVehicle)} icon={<User />} />
                <VehicleSelectorMetricCard id="ibutton" label="Driver ID" value={getDriverIdValue(selectedVehicle)} icon={<KeyRound />} isMono />
                <VehicleSelectorMetricCard id="imei" label="IMEI" value={selectedVehicle.teltonika?.imei ?? selectedVehicle.trackerId} icon={<Fingerprint />} isMono />
              </div>
            ) : null}
          </div>

          {routeWithAlertMarkers ? (
            <div className="absolute inset-x-4 bottom-4 z-[1100]">
              <PlaybackTimelineDock
                route={routeWithAlertMarkers}
                progress={playbackProgress}
                isPlaying={isPlaybackRunning}
                playbackSpeed={playbackSpeed}
                currentSpeedKph={playbackVehicle?.speedKph ?? 0}
                onProgressChange={setPlaybackProgress}
                onPlayPause={togglePlayback}
                onRewind={rewindPlayback}
                onFastForward={fastForwardPlayback}
                onPlaybackSpeedChange={setPlaybackSpeed}
                onScrubStart={beginTimelineScrub}
                onScrubEnd={endTimelineScrub}
                onHeightChange={setTimelineHeightPx}
              />
            </div>
          ) : null}
        </div>

        <div className="w-full xl:w-[360px]">
          <TripSegmentsPanel
            title="Trip segments"
            subtitle={query.preset === "customDate" ? query.customDateIso ?? "Custom date" : getPresetLabel(query)}
            trips={routeWithAlertMarkers?.tripSegments ?? []}
            activeTripId={selectedSegmentId}
            onTripSelect={selectTripSegment}
            onOpenGraph={setGraphSegmentId}
            emptyState={isLoadingRoute ? "Loading route history..." : "No route data available for this filter."}
            showTripDates={query.preset === "last7Days"}
          />
        </div>
      </div>

      <SegmentGraphOverlay
        isOpen={Boolean(graphSegment)}
        segment={graphSegment}
        onClose={() => setGraphSegmentId(null)}
      />
      <DatePickerPopover
        isOpen={showDatePicker}
        anchorRef={datePickerButtonRef}
        title="Select Date"
        month={calendarMonth}
        activeDateValue={activeCalendarDateValue}
        onSelectDate={(nextDateValue) => {
          setQuery({ preset: "customDate", customDateIso: nextDateValue });
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </div>
  );
}
