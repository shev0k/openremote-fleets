import { ReactNode } from "react";
import { FleetReportSnapshot } from "../../../../domain/models/reports";
import { Vehicle } from "../../../../domain/models/vehicle";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import {
  GRAPH_WIDGET_CATALOG,
  GraphDashboardSummary,
  GraphWidgetDefinition,
  GraphWidgetId,
  createGraphDashboardSummary,
} from "../graphsDashboardModel";
import { formatChartValue, formatKilometers, formatNumber, formatPercent } from "./graphWidgetPrimitives";

interface GraphPrintPreviewProps {
  dateRangeLabel: string;
  snapshot: FleetReportSnapshot;
  vehicles: Vehicle[];
  selectedWidgetIds: GraphWidgetId[];
}

interface PrintChartPoint {
  label: string;
  value: number;
}

function PrintWidgetSection({ widget, children }: { widget: GraphWidgetDefinition; children: ReactNode }) {
  return (
    <section
      data-testid={`graph-print-widget-${widget.id}`}
      className="report-print-section rounded-[16px] border border-border-subtle bg-panel-muted p-4 print:border-neutral-300 print:bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted print:text-neutral-500">
            {widget.category}
          </div>
          <h2 className="mt-1 text-[16px] font-semibold text-content-primary print:text-black">{widget.title}</h2>
          <p className="mt-1 text-[12px] leading-5 text-content-muted print:text-neutral-600">{widget.description}</p>
        </div>
        <span className="rounded-full border border-border-subtle bg-panel px-2.5 py-1 text-[11px] text-content-muted print:border-neutral-300 print:bg-white print:text-neutral-600">
          {widget.sourceLabel}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PrintMetricGrid({ items }: { items: Array<{ label: string; value: string; detail?: string }> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[12px] border border-border-subtle bg-panel px-3 py-2 print:border-neutral-300 print:bg-white">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted print:text-neutral-500">{item.label}</div>
          <div className="mt-1 text-[15px] font-semibold text-content-primary print:text-black">{item.value}</div>
          {item.detail ? <div className="mt-1 text-[11px] leading-4 text-content-muted print:text-neutral-600">{item.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

function PrintTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number | null>>;
}) {
  return (
    <table className="w-full border-collapse text-left text-[12px] print:text-[11px]">
      <thead>
        <tr className="border-b border-border-subtle text-[10px] uppercase tracking-[0.14em] text-content-muted print:border-neutral-300 print:text-neutral-500">
          {columns.map((column) => (
            <th key={column} className="py-2 pr-3">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={row.join("-") || rowIndex} className="border-b border-border-subtle/70 print:border-neutral-200">
            {row.map((cell, cellIndex) => (
              <td key={`${rowIndex}-${cellIndex}`} className="py-2 pr-3 text-content-secondary print:text-neutral-700">
                {cell ?? "--"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[12px] border border-border-subtle bg-panel px-3 py-4 text-center text-[12px] text-content-muted print:border-neutral-300 print:bg-white print:text-neutral-600">
      {label}
    </div>
  );
}

function pointCoordinate(point: PrintChartPoint, index: number, pointCount: number, maxValue: number) {
  const chartWidth = 520;
  const chartHeight = 116;
  const left = 24;
  const top = 14;
  const x = left + (pointCount <= 1 ? chartWidth / 2 : (index / (pointCount - 1)) * chartWidth);
  const y = top + chartHeight - (point.value / maxValue) * chartHeight;
  return `${roundCoordinate(x)},${roundCoordinate(y)}`;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function PrintLineChart({
  averagePoints,
  maxPoints,
}: {
  averagePoints: PrintChartPoint[];
  maxPoints: PrintChartPoint[];
}) {
  const maxValue = Math.max(1, ...averagePoints.map((point) => point.value), ...maxPoints.map((point) => point.value));
  const averageLine = averagePoints.map((point, index) => pointCoordinate(point, index, averagePoints.length, maxValue)).join(" ");
  const maxLine = maxPoints.map((point, index) => pointCoordinate(point, index, maxPoints.length, maxValue)).join(" ");

  return (
    <div>
      <svg
        aria-label="Average and maximum speed trend"
        className="graph-print-chart-graphic h-44 w-full overflow-visible"
        data-testid="graph-print-line-chart"
        role="img"
        viewBox="0 0 568 160"
      >
        {[0, 1, 2, 3].map((line) => (
          <line key={line} stroke="#d4d4d4" strokeDasharray="3 3" x1="24" x2="544" y1={20 + line * 36} y2={20 + line * 36} />
        ))}
        <polyline
          data-testid="graph-print-line-series-average"
          fill="none"
          points={averageLine}
          stroke="#9fca16"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <polyline
          data-testid="graph-print-line-series-max"
          fill="none"
          points={maxLine}
          stroke="#ef4444"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {averagePoints.map((point, index) => (
          <text key={point.label} fill="#525252" fontSize="10" textAnchor="middle" x={24 + (averagePoints.length <= 1 ? 260 : (index / (averagePoints.length - 1)) * 520)} y="154">
            {point.label}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex gap-4 text-[11px] text-content-muted print:text-neutral-600">
        <span>Average speed</span>
        <span>Maximum speed</span>
      </div>
    </div>
  );
}

function PrintBarChart({
  testId,
  points,
  unit,
  color = "#9fca16",
}: {
  testId: string;
  points: PrintChartPoint[];
  unit?: string;
  color?: string;
}) {
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const barWidth = 480 / Math.max(1, points.length);

  return (
    <svg
      aria-label={testId}
      className="graph-print-chart-graphic h-44 w-full overflow-visible"
      data-testid={testId}
      role="img"
      viewBox="0 0 568 160"
    >
      {[0, 1, 2, 3].map((line) => (
        <line key={line} stroke="#d4d4d4" strokeDasharray="3 3" x1="32" x2="536" y1={20 + line * 34} y2={20 + line * 34} />
      ))}
      {points.map((point, index) => {
        const height = Math.max(4, (point.value / maxValue) * 104);
        const x = 44 + index * barWidth + barWidth * 0.18;
        const width = Math.max(10, barWidth * 0.62);
        const y = 126 - height;

        return (
          <g key={point.label}>
            <rect fill={color} height={height} rx="5" width={width} x={x} y={y} />
            <text fill="#171717" fontSize="10" fontWeight="700" textAnchor="middle" x={x + width / 2} y={Math.max(12, y - 6)}>
              {formatChartValue(point.value, unit)}
            </text>
            <text fill="#525252" fontSize="10" textAnchor="middle" x={x + width / 2} y="150">
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function renderPrintWidget(widget: GraphWidgetDefinition, snapshot: FleetReportSnapshot, summary: GraphDashboardSummary) {
  if (widget.id === "fleet-kpis") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintMetricGrid
          items={[
            { label: "Max speed", value: `${snapshot.metrics.maxSpeedKph} km/h`, detail: `${snapshot.metrics.maxSpeedDeltaPercent}% delta` },
            { label: "Avg trip", value: snapshot.metrics.averageTripDurationLabel },
            { label: "Overspeed", value: formatNumber(snapshot.metrics.overspeedEvents), detail: `${snapshot.metrics.overspeedDeltaPercent}% delta` },
            { label: "Distance", value: `${formatNumber(snapshot.metrics.totalDistanceKm)} km` },
          ]}
        />
      </PrintWidgetSection>
    );
  }

  if (widget.id === "daily-activity") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintBarChart
          testId="graph-print-daily-bars"
          points={snapshot.dailyTrips.map((point) => ({ label: point.dayLabel, value: point.distanceKm }))}
          unit="km"
        />
        <div className="mt-3">
          <PrintTable
            columns={["Period", "Trips", "Distance"]}
            rows={snapshot.dailyTrips.map((point) => [point.dayLabel, point.trips, `${point.distanceKm} km`])}
          />
        </div>
      </PrintWidgetSection>
    );
  }

  if (widget.id === "speed-trend") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintLineChart
          averagePoints={snapshot.dailySpeed.map((point) => ({ label: point.dayLabel, value: point.averageSpeedKph }))}
          maxPoints={snapshot.dailySpeed.map((point) => ({ label: point.dayLabel, value: point.maxSpeedKph }))}
        />
        <div className="mt-3">
          <PrintTable
            columns={["Period", "Average", "Max"]}
            rows={snapshot.dailySpeed.map((point) => [point.dayLabel, `${point.averageSpeedKph} km/h`, `${point.maxSpeedKph} km/h`])}
          />
        </div>
      </PrintWidgetSection>
    );
  }

  if (widget.id === "speed-distribution") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintBarChart
          testId="graph-print-speed-distribution-bars"
          points={snapshot.speedDistribution.map((point) => ({ label: point.bucketLabel, value: point.percentage }))}
          unit="%"
          color="#0ea5e9"
        />
      </PrintWidgetSection>
    );
  }

  if (widget.id === "vehicle-activity") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintTable
          columns={["Vehicle", "Trips", "Distance", "Score"]}
          rows={snapshot.mostActiveVehicles.map((vehicle) => [
            vehicle.vehicleId,
            vehicle.tripCount,
            vehicle.distanceLabel,
            vehicle.score,
          ])}
        />
      </PrintWidgetSection>
    );
  }

  if (widget.id === "fleet-status") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintMetricGrid
          items={summary.statusRows.map((row) => ({
            label: row.label,
            value: `${row.count} vehicles`,
            detail: `${row.percentage}% of fleet`,
          }))}
        />
      </PrintWidgetSection>
    );
  }

  if (widget.id === "alerts-by-vehicle") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        {summary.alertRows.length ? (
          <PrintTable
            columns={["Vehicle", "Active alerts", "Current speed"]}
            rows={summary.alertRows.map((row) => [row.vehicleName, row.activeAlertCount, `${row.speedKph} km/h`])}
          />
        ) : (
          <p className="text-[12px] text-content-muted print:text-neutral-600">No vehicles have active alerts.</p>
        )}
      </PrintWidgetSection>
    );
  }

  if (widget.id === "fuel-battery") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintTable
          columns={["Vehicle", "Fuel", "Battery", "Alerts"]}
          rows={summary.fuelBatteryRows.map((row) => [
            row.vehicleName,
            formatPercent(row.fuelLevel),
            formatPercent(row.batteryLevel),
            row.activeAlertCount,
          ])}
        />
      </PrintWidgetSection>
    );
  }

  if (widget.id === "tracker-health") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintMetricGrid
          items={summary.trackerHealthRows.map((row) => ({
            label: row.label,
            value: row.averageLabel,
            detail: row.detail,
          }))}
        />
      </PrintWidgetSection>
    );
  }

  if (widget.id === "telemetry-coverage") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintTable
          columns={["Signal", "Coverage", "Source"]}
          rows={summary.telemetryCoverageRows.map((row) => [
            row.label,
            `${row.supportedVehicleCount}/${summary.vehicleCount} (${row.percentage}%)`,
            row.sourceLabel,
          ])}
        />
      </PrintWidgetSection>
    );
  }

  if (widget.id === "driver-coverage") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        <PrintMetricGrid
          items={[
            { label: "Assigned", value: `${summary.driverCoverage.assignedCount}` },
            { label: "Unassigned", value: `${summary.driverCoverage.unassignedCount}` },
            { label: "Coverage", value: `${summary.driverCoverage.percentage}%` },
          ]}
        />
        <div className="mt-3">
          <PrintTable
            columns={["Vehicle", "Driver", "Identifier"]}
            rows={summary.driverCoverage.driverRows.map((row) => [row.vehicleName, row.driverName, row.driverIdentifier])}
          />
        </div>
      </PrintWidgetSection>
    );
  }

  if (widget.id === "engine-load") {
    return (
      <PrintWidgetSection key={widget.id} widget={widget}>
        {summary.engineRows.length ? (
          <PrintTable
            columns={["Vehicle", "RPM", "Speed"]}
            rows={summary.engineRows.map((row) => [row.vehicleName, `${formatNumber(row.rpm)} rpm`, `${row.speedKph} km/h`])}
          />
        ) : (
          <PrintEmptyState label="No engine RPM data for this fleet." />
        )}
      </PrintWidgetSection>
    );
  }

  const odometerTripPoints = summary.odometerRows
    .filter((row) => row.tripOdometerKm !== null)
    .slice(0, 6)
    .map((row) => ({ label: row.vehicleName, value: row.tripOdometerKm ?? 0 }));

  return (
    <PrintWidgetSection key={widget.id} widget={widget}>
      {summary.odometerRows.length ? (
        <>
          {odometerTripPoints.length ? (
            <PrintBarChart
              testId="graph-print-odometer-bars"
              points={odometerTripPoints}
              unit="km"
              color="#64748b"
            />
          ) : (
            <PrintEmptyState label="No trip odometer chart data for this fleet." />
          )}
          <div className="mt-3">
            <PrintTable
              columns={["Vehicle", "Total odometer", "Trip odometer"]}
              rows={summary.odometerRows.map((row) => [
                row.vehicleName,
                formatKilometers(row.totalOdometerKm),
                formatKilometers(row.tripOdometerKm),
              ])}
            />
          </div>
        </>
      ) : (
        <PrintEmptyState label="No odometer data for this fleet." />
      )}
    </PrintWidgetSection>
  );
}

export function GraphPrintPreview({
  dateRangeLabel,
  snapshot,
  vehicles,
  selectedWidgetIds,
}: GraphPrintPreviewProps) {
  const summary = createGraphDashboardSummary(snapshot, vehicles);
  const selectedWidgets = selectedWidgetIds
    .map((widgetId) => GRAPH_WIDGET_CATALOG.find((widget) => widget.id === widgetId))
    .filter((widget): widget is GraphWidgetDefinition => Boolean(widget));

  return (
    <PanelCard className="report-print-surface report-preview-a4 overflow-hidden p-0 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:text-black">
      <div className="border-b border-border-subtle p-6 print:border-neutral-300">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-content-muted print:text-neutral-500">
          Fleet Graphs
        </div>
        <h1 className="mt-1 text-[24px] font-semibold text-content-primary print:text-black">Graphs Dashboard</h1>
        <p className="mt-2 text-[13px] text-content-muted print:text-neutral-600">
          {dateRangeLabel} - {vehicles.length} vehicles - {selectedWidgets.length} widgets
        </p>
      </div>

      <div className="space-y-4 p-6 print:space-y-3">
        {selectedWidgets.map((widget) => renderPrintWidget(widget, snapshot, summary))}
      </div>
    </PanelCard>
  );
}
