import { ComponentPropsWithoutRef, ReactNode } from "react";
import { classNames } from "../utils/classNames";

interface PanelCardProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

export function PanelCard({ children, className, ...props }: PanelCardProps) {
  return (
    <div className={classNames("app-panel", className)} {...props}>
      {children}
    </div>
  );
}
