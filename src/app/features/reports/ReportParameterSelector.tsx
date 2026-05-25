import { Check } from "lucide-react";
import { ReportParameterDefinition } from "../../../domain/models/reports";
import { classNames } from "../../components/shared/utils/classNames";

interface ReportParameterSelectorProps {
  parameters: ReportParameterDefinition[];
  selectedParameterIds: string[];
  onToggleParameter: (parameterId: string) => void;
}

function getParameterHint(parameter: ReportParameterDefinition): string {
  const sourceLabel = parameter.source === "teltonika"
    ? "Teltonika AVL"
    : parameter.source === "openRemote"
      ? "OpenRemote attribute"
      : parameter.source === "derived"
        ? "Derived fleet value"
        : "Custom attribute";
  const unitLabel = parameter.unit ? ` Uses ${parameter.unit}.` : "";
  const description = parameter.description ? ` ${parameter.description}` : "";

  return `${sourceLabel}${parameter.teltonikaAvlId ? ` ${parameter.teltonikaAvlId}` : ""}.${unitLabel}${description}`;
}

export function ReportParameterSelector({
  parameters,
  selectedParameterIds,
  onToggleParameter,
}: ReportParameterSelectorProps) {
  const selected = new Set(selectedParameterIds);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {parameters.map((parameter) => {
        const isSelected = selected.has(parameter.id);

        return (
          <button
            key={parameter.id}
            type="button"
            onClick={() => onToggleParameter(parameter.id)}
            className={classNames(
              "flex min-h-[92px] items-start justify-between gap-3 rounded-[14px] border p-3 text-left transition-colors",
              isSelected
                ? "border-brand/35 bg-brand/10 text-content-primary"
                : "border-border-subtle bg-panel-muted text-content-secondary hover:border-border-strong hover:bg-surface-elevated",
            )}
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">{parameter.displayName}</span>
              <span className="mt-1 block text-[11px] text-content-muted">
                {parameter.attributeName}
                {parameter.teltonikaAvlId ? ` / AVL ${parameter.teltonikaAvlId}` : ""}
              </span>
              <span className="mt-2 block text-[11px] leading-4 text-content-muted">{getParameterHint(parameter)}</span>
            </span>
            <span
              className={classNames(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                isSelected ? "border-brand bg-brand text-brand-foreground" : "border-border-subtle text-content-muted",
              )}
            >
              {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
