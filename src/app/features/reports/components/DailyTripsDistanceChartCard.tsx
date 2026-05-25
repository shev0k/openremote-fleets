import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { DailyTripDistancePoint } from "../../../../domain/models/reports";

interface DailyTripsDistanceChartCardProps {
  dateRangeLabel: string;
  data: DailyTripDistancePoint[];
}

export function DailyTripsDistanceChartCard({
  dateRangeLabel,
  data,
}: DailyTripsDistanceChartCardProps) {
  return (
    <PanelCard className="flex h-full min-h-[400px] flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[17px] font-medium text-content-primary">Daily Trips & Distance</h3>
        <span className="text-[12px] font-medium text-content-muted">{dateRangeLabel}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart
            id="bar-chart-reports"
            data={data.map((point) => ({
              name: point.dayLabel,
              trips: point.trips,
              distance: point.distanceKm,
            }))}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--content-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis yAxisId="left" stroke="var(--content-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--content-muted)" fontSize={12} tickLine={false} axisLine={false} dx={10} />
            <RechartsTooltip
              cursor={{ fill: "var(--surface-sunken)", opacity: 0.6 }}
              contentStyle={{ backgroundColor: "var(--panel)", borderColor: "var(--border-strong)", borderRadius: "12px", fontSize: "12px", color: "var(--content-primary)" }}
            />
            <Bar yAxisId="left" dataKey="trips" fill="var(--brand)" radius={[4, 4, 0, 0]} name="Trips" maxBarSize={40} />
            <Bar yAxisId="right" dataKey="distance" fill="var(--info)" radius={[4, 4, 0, 0]} name="Distance (km)" maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
}
