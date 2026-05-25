import { BookOpen, Check } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertState, FleetAlert } from "../../../../domain/models/alerts";

interface AlertStateActionButtonProps {
  alert: FleetAlert;
  onAlertStateChange: (alertId: string, state: AlertState) => void;
}

function getNextAlertAction(alert: FleetAlert) {
  if (alert.state === "Active") {
    return {
      label: "Acknowledge",
      nextState: "Acknowledged" as const,
      iconState: "acknowledge",
      Icon: BookOpen,
      className: "border-border-subtle bg-panel text-content-secondary hover:border-warning/35 hover:text-warning",
    };
  }

  if (alert.state === "Acknowledged") {
    return {
      label: "Resolve",
      nextState: "Resolved" as const,
      iconState: "resolve",
      Icon: Check,
      className: "border-danger/20 bg-danger/10 text-danger hover:bg-danger/16",
    };
  }

  return null;
}

export function AlertStateActionButton({ alert, onAlertStateChange }: AlertStateActionButtonProps) {
  const action = getNextAlertAction(alert);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const stableId = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const tooltipId = `alert-action-tooltip-${alert.id}-${stableId}`;
  const [isTooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });

  const updateTooltipPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }

    const bounds = button.getBoundingClientRect();
    setTooltipPosition({
      left: bounds.left + bounds.width / 2,
      top: bounds.top - 8,
    });
  }, []);

  useEffect(() => {
    if (!isTooltipVisible) {
      return;
    }

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);

    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
    };
  }, [isTooltipVisible, updateTooltipPosition]);

  if (!action) {
    return null;
  }

  const Icon = action.Icon;
  const tooltip = typeof document !== "undefined"
    ? createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          data-testid={tooltipId}
          className={`pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 text-[10px] font-semibold text-content-secondary shadow-[0_10px_24px_-18px_rgba(0,0,0,0.7)] transition-opacity ${
            isTooltipVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            transform: "translate(-50%, -100%)",
          }}
        >
          {action.label}
        </span>,
        document.body,
      )
    : null;

  return (
    <span className="relative inline-flex overflow-visible">
      <button
        ref={buttonRef}
        type="button"
        aria-describedby={tooltipId}
        onMouseEnter={() => {
          updateTooltipPosition();
          setTooltipVisible(true);
        }}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => {
          updateTooltipPosition();
          setTooltipVisible(true);
        }}
        onBlur={() => setTooltipVisible(false)}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onAlertStateChange(alert.id, action.nextState);
        }}
        className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${action.className}`}
        aria-label={`${action.label} ${alert.type}`}
      >
        <Icon data-testid={`alert-action-icon-${alert.id}`} data-icon-state={action.iconState} className="h-3.5 w-3.5" />
      </button>
      {tooltip}
    </span>
  );
}
