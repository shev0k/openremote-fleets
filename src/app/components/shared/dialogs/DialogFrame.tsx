import { ReactNode } from "react";
import { X } from "lucide-react";
import { classNames } from "../utils/classNames";

interface DialogFrameProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

export function DialogFrame({
  title,
  subtitle,
  onClose,
  children,
  footer,
  widthClassName = "max-w-lg",
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: DialogFrameProps) {
  return (
    <div
      className={classNames("fixed inset-0 z-[5000] flex items-center justify-center bg-backdrop/80 p-4 backdrop-blur-sm", overlayClassName)}
      onClick={onClose}
    >
      <div
        className={classNames(
          "app-overlay flex w-full flex-col overflow-hidden rounded-[24px] animate-in zoom-in-95 duration-200",
          widthClassName,
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={classNames("flex items-center justify-between border-b border-border-subtle bg-surface-elevated p-6", headerClassName)}>
          <div>
            <h2 className="text-[19px] font-medium text-content-primary">{title}</h2>
            {subtitle && <p className="mt-1 text-[13px] text-content-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="app-control flex h-8 w-8 items-center justify-center rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={classNames("p-6 space-y-5", bodyClassName)}>{children}</div>

        {footer && <div className={classNames("border-t border-border-subtle bg-surface-elevated p-6", footerClassName)}>{footer}</div>}
      </div>
    </div>
  );
}
