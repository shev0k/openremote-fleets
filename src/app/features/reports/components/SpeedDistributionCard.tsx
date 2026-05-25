import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { SpeedDistributionPoint } from "../../../../domain/models/reports";

const CHART_COLORS = ["var(--surface-sunken)", "var(--brand)", "var(--info)", "var(--danger)"];

interface SpeedDistributionCardProps {
  averageSpeedLabel: number;
  distribution: SpeedDistributionPoint[];
}

export function SpeedDistributionCard({
  averageSpeedLabel,
  distribution,
}: SpeedDistributionCardProps) {
  return (
    <div className="app-panel flex h-[300px] min-h-[400px] flex-col overflow-hidden p-6 lg:h-full lg:min-h-0">
      <h3 className="mb-2 text-[15px] font-medium text-content-primary">Speed Distribution</h3>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart id="pie-chart-reports">
            <Pie
              data={distribution.map((point) => ({ name: point.bucketLabel, value: point.percentage }))}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {distribution.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "var(--panel)",
                borderColor: "var(--border-strong)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--content-primary)",
              }}
              itemStyle={{ color: "var(--content-primary)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col mt-2">
          <span className="text-[24px] font-bold text-content-primary">{averageSpeedLabel}</span>
          <span className="text-[10px] uppercase tracking-wider text-content-muted">Avg km/h</span>
        </div>
      </div>
      <div className="mt-4 shrink-0 grid grid-cols-2 gap-2 text-[11px] font-medium text-content-muted">
        {distribution.map((point, index) => (
          <div key={point.bucketLabel} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
            {point.bucketLabel} ({point.percentage}%)
          </div>
        ))}
      </div>
    </div>
  );
}
