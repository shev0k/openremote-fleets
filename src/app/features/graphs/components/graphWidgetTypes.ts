import { type ComponentType, type ReactNode } from "react";
import { type FleetReportSnapshot } from "../../../../domain/models/reports";
import {
  type GraphDashboardSummary,
  type GraphWidgetId,
  type GraphWidgetLayoutSize,
} from "../graphsDashboardModel";

export interface GraphWidgetRenderProps {
  snapshot: FleetReportSnapshot;
  summary: GraphDashboardSummary;
  dateRangeLabel: string;
  size: GraphWidgetLayoutSize;
}

export interface GraphWidgetRegistration {
  id: GraphWidgetId;
  icon: ReactNode;
  component: ComponentType<GraphWidgetRenderProps>;
}
