import { ReactNode } from "react";
import { Gauge, LayoutPanelLeft, LocateFixed, Map, Minus, Mountain, Plus, Satellite, Timer } from "lucide-react";
import { SelectionDropdown } from "../../../components/shared/controls/SelectionDropdown";
import type { LiveFleetMapType } from "../providers/liveFleetWorkspace.types";

interface MapControlBarProps {
  mapType: LiveFleetMapType;
  isWorkspaceOpen: boolean;
  isTimelineVisible: boolean;
  isTimelineEnabled: boolean;
  overlayOffsetPx?: number;
  simulationSpeed?: number;
  onMapTypeChange: (nextType: LiveFleetMapType) => void;
  onSimulationSpeedChange?: (nextSpeed: number) => void;
  onWorkspaceToggle: () => void;
  onTimelineToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

const MAP_TYPE_OPTIONS: { id: LiveFleetMapType; label: string; icon: ReactNode }[] = [
  { id: "default", label: "Default", icon: <Map className="h-4 w-4" /> },
  { id: "satellite", label: "Satellite", icon: <Satellite className="h-4 w-4" /> },
  { id: "terrain", label: "Terrain", icon: <Mountain className="h-4 w-4" /> },
];
const SIMULATION_SPEED_OPTIONS = [1, 2, 4, 8, 16].map((speed) => ({
  id: String(speed),
  label: `${speed}x`,
}));

const stackClassName = "app-panel !rounded-full flex w-12 flex-col items-center overflow-visible py-1";
const separatorClassName = "mx-auto h-px w-6 bg-border-subtle";
const buttonClassName = "app-control mx-auto my-0.5 flex h-10 w-10 items-center justify-center rounded-full";
const buttonActiveClassName = "app-control-active !border-brand/20 !bg-brand/12 !text-brand";

export function MapControlBar({
  mapType,
  isWorkspaceOpen,
  isTimelineVisible,
  isTimelineEnabled,
  overlayOffsetPx = 24,
  simulationSpeed,
  onMapTypeChange,
  onSimulationSpeedChange,
  onWorkspaceToggle,
  onTimelineToggle,
  onZoomIn,
  onZoomOut,
  onResetView,
}: MapControlBarProps) {
  return (
    <div
      className="absolute right-6 top-[104px] sm:top-[120px] z-[1400] flex flex-col items-end gap-3 xl:right-[var(--map-controls-right)]"
      style={{ ["--map-controls-right" as string]: `${overlayOffsetPx}px` }}
    >
      <div className={stackClassName}>
        <button
          type="button"
          onClick={onWorkspaceToggle}
          className={`${buttonClassName} ${isWorkspaceOpen ? buttonActiveClassName : ""}`}
          aria-label="Toggle workspace panels"
          title="Toggle workspace panels"
        >
          <LayoutPanelLeft className="h-4 w-4" />
        </button>
        <div className={separatorClassName} />
        <button
          type="button"
          onClick={onTimelineToggle}
          disabled={!isTimelineEnabled}
          className={`${buttonClassName} mt-1 ${
            isTimelineVisible && isTimelineEnabled ? buttonActiveClassName : ""
          } disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Toggle timeline"
          title="Toggle timeline"
        >
          <Timer className="h-4 w-4" />
        </button>
        <div className={separatorClassName} />
        <SelectionDropdown
          align="right"
          compact
          value={MAP_TYPE_OPTIONS.find((option) => option.id === mapType)?.label ?? "Default"}
          onChange={(next) => onMapTypeChange(next as LiveFleetMapType)}
          leadingIcon={MAP_TYPE_OPTIONS.find((option) => option.id === mapType)?.icon ?? <Map className="h-4 w-4" />}
          options={MAP_TYPE_OPTIONS}
          buttonAriaLabel="Change map layer"
          buttonTitle="Change map layer"
          menuSide="left"
          menuClassName="w-40 map-layer-menu"
          triggerClassName={`app-control !mx-auto !my-0.5 !flex !h-10 !w-10 !items-center !justify-center !rounded-full !border !p-0 ${
            mapType !== "default"
              ? "app-control-active !border-brand/20 !bg-brand/12 !text-brand"
              : "!text-content-secondary hover:!text-content-primary"
          }`}
        />
        {onSimulationSpeedChange && typeof simulationSpeed === "number" ? (
          <>
            <div className={separatorClassName} />
            <SelectionDropdown
              align="right"
              compact
              value={`${simulationSpeed}x`}
              activeOptionId={String(simulationSpeed)}
              onChange={(next) => onSimulationSpeedChange(Number(next))}
              leadingIcon={<Gauge className="h-4 w-4" />}
              options={SIMULATION_SPEED_OPTIONS}
              buttonAriaLabel="Simulation speed"
              buttonTitle="Simulation speed"
              menuSide="left"
              menuClassName="w-28 map-layer-menu"
              triggerClassName="app-control !mx-auto !my-0.5 !flex !h-10 !w-10 !items-center !justify-center !rounded-full !border !p-0 !text-content-secondary hover:!text-content-primary"
            />
          </>
        ) : null}
      </div>

      <div className={stackClassName}>
        <button type="button" onClick={onZoomIn} className={buttonClassName} aria-label="Zoom in" title="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <div className={separatorClassName} />
        <button type="button" onClick={onZoomOut} className={buttonClassName} aria-label="Zoom out" title="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
        <div className={separatorClassName} />
        <button type="button" onClick={onResetView} className={buttonClassName} aria-label="Reset view" title="Reset view">
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
