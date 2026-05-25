import { Layers2, ListFilter } from "lucide-react";
import { TimelineSignalDisplayMode, TimelineSignalOption } from "./timelineSignalViewModel";

interface TimelineSignalSelectorProps {
  options: TimelineSignalOption[];
  selectedSignalIds: string[];
  displayMode: TimelineSignalDisplayMode;
  currentValueLabels?: Record<string, string>;
  onSelectedSignalIdsChange: (signalIds: string[]) => void;
  onDisplayModeChange: (displayMode: TimelineSignalDisplayMode) => void;
}

function shouldShowCurrentValueLabel(option: TimelineSignalOption): boolean {
  return option.valueType === "numeric" || option.valueType === "enum";
}

export function TimelineSignalSelector({
  options,
  selectedSignalIds,
  displayMode,
  currentValueLabels,
  onSelectedSignalIdsChange,
  onDisplayModeChange,
}: TimelineSignalSelectorProps) {
  if (!options.length) {
    return null;
  }

  const selectedIds = selectedSignalIds.filter((signalId) => options.some((option) => option.id === signalId));

  const handleSignalClick = (signalId: string) => {
    if (displayMode === "single") {
      onSelectedSignalIdsChange([signalId]);
      return;
    }

    const nextIds = selectedIds.includes(signalId)
      ? selectedIds.filter((selectedId) => selectedId !== signalId)
      : [...selectedIds, signalId];

    onSelectedSignalIdsChange(nextIds.length ? nextIds : [signalId]);
  };

  const handleModeChange = (nextMode: TimelineSignalDisplayMode) => {
    onDisplayModeChange(nextMode);

    if (nextMode === "single" && selectedIds.length > 1) {
      onSelectedSignalIdsChange([selectedIds[0]]);
    }
  };

  return (
    <div className="border-t border-border-subtle pt-4">
      <div data-testid="timeline-signal-selector-controls" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            const currentValueLabel = shouldShowCurrentValueLabel(option) ? currentValueLabels?.[option.id] : undefined;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSignalClick(option.id)}
                aria-label={currentValueLabel ? `${option.label} ${currentValueLabel}` : option.label}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  isSelected
                    ? "border-brand/40 bg-brand/12 text-brand"
                    : "border-border-subtle bg-panel-muted text-content-muted hover:border-border-strong hover:text-content-primary"
                }`}
              >
                {option.label}
                {currentValueLabel ? (
                  <span className={`ml-1 font-mono ${isSelected ? "text-brand" : "text-content-muted"}`}> {currentValueLabel}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 rounded-full border border-border-subtle bg-surface-elevated p-1">
          <button
            type="button"
            onClick={() => handleModeChange("single")}
            className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${displayMode === "single" ? "bg-brand text-brand-foreground" : "text-content-muted hover:text-content-primary"}`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            Single
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("multi")}
            className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${displayMode === "multi" ? "bg-brand text-brand-foreground" : "text-content-muted hover:text-content-primary"}`}
          >
            <Layers2 className="h-3.5 w-3.5" />
            Multi
          </button>
        </div>
      </div>
    </div>
  );
}
