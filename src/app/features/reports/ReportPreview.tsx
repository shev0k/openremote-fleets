import { FileText } from "lucide-react";
import { GeneratedReportPreview, ReportPreviewChartPoint, ReportPreviewSection } from "../../../domain/models/reports";
import { PanelCard } from "../../components/shared/cards/PanelCard";
import { formatReportPreviewValue, getPreviewSummaryItems } from "./reportBuilderViewModel";

interface ReportPreviewProps {
  preview: GeneratedReportPreview | null;
  isLoading: boolean;
}

function formatChartPointValue(point: ReportPreviewChartPoint, fallbackUnit?: string): string {
  const unit = point.unit ?? fallbackUnit ?? "";
  const value = Number.isInteger(point.value) ? point.value.toLocaleString() : point.value.toFixed(1);
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function renderSummarySection(section: ReportPreviewSection) {
  return (
    <div key={section.id} className="report-print-section rounded-[16px] border border-border-subtle bg-panel-muted p-4 print:border-neutral-300 print:bg-white">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted print:text-neutral-500">Summary</div>
        <h3 className="mt-1 text-[15px] font-semibold text-content-primary print:text-black">{section.title}</h3>
        {section.description ? (
          <p className="mt-1 text-[12px] leading-5 text-content-muted print:text-neutral-600">{section.description}</p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 print:grid-cols-3">
        {(section.items ?? []).map((item) => (
          <div key={item.label} className="rounded-[12px] border border-border-subtle bg-panel px-3 py-2 print:border-neutral-300 print:bg-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted print:text-neutral-500">{item.label}</div>
            <div className="mt-1 text-[14px] font-semibold text-content-primary print:text-black">{item.value}</div>
            {item.detail ? <div className="mt-1 text-[11px] leading-4 text-content-muted print:text-neutral-600">{item.detail}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderChartSection(section: ReportPreviewSection) {
  const points = section.chart?.points ?? [];
  const maxValue = Math.max(1, ...points.map((point) => point.value));

  return (
    <div key={section.id} className="report-print-section rounded-[16px] border border-border-subtle bg-panel-muted p-4 print:border-neutral-300 print:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted print:text-neutral-500">Chart</div>
          <h3 className="mt-1 text-[15px] font-semibold text-content-primary print:text-black">{section.title}</h3>
          {section.description ? (
            <p className="mt-1 text-[12px] leading-5 text-content-muted print:text-neutral-600">{section.description}</p>
          ) : null}
        </div>
        {section.chart?.unit ? (
          <span className="rounded-full border border-border-subtle bg-panel px-2.5 py-1 text-[11px] text-content-muted print:border-neutral-300 print:bg-white">
            {section.chart.unit}
          </span>
        ) : null}
      </div>
      {points.length ? (
        <div data-testid={`report-chart-${section.id}`} className="mt-4 space-y-2">
          {points.map((point) => {
            const barWidth = Math.max(5, Math.min(100, (point.value / maxValue) * 100));

            return (
              <div key={`${section.id}-${point.label}`} className="grid grid-cols-[92px_minmax(0,1fr)_72px] items-center gap-3 text-[12px]">
                <span className="truncate font-semibold text-content-secondary print:text-neutral-700">{point.label}</span>
                <svg
                  aria-label={`${point.label} ${formatChartPointValue(point, section.chart?.unit)}`}
                  className="report-chart-bar-graphic h-2 w-full overflow-visible"
                  data-testid="report-chart-bar-graphic"
                  preserveAspectRatio="none"
                  role="img"
                  viewBox="0 0 100 8"
                >
                  <rect data-testid="report-chart-bar-fill" fill="#9fca16" height="8" rx="4" width={barWidth} x="0" y="0" />
                </svg>
                <span className="text-right font-semibold text-content-primary print:text-black">
                  {formatChartPointValue(point, section.chart?.unit)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-[12px] border border-border-subtle bg-panel px-3 py-2 text-[12px] text-content-muted print:border-neutral-300 print:bg-white">
          No chart datapoints are available for this report selection.
        </div>
      )}
    </div>
  );
}

function renderInfoSection(section: ReportPreviewSection) {
  return (
    <div key={section.id} className="report-print-section rounded-[16px] border border-border-subtle bg-panel-muted p-4 print:border-neutral-300 print:bg-white">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted print:text-neutral-500">{section.kind}</div>
      <h3 className="mt-1 text-[15px] font-semibold text-content-primary print:text-black">{section.title}</h3>
      {section.description ? (
        <p className="mt-1 text-[12px] leading-5 text-content-muted print:text-neutral-600">{section.description}</p>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(section.items ?? []).map((item) => (
          <div key={item.label} className="rounded-[12px] border border-border-subtle bg-panel px-3 py-2 print:border-neutral-300 print:bg-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted print:text-neutral-500">{item.label}</div>
            <div className="mt-1 text-[14px] font-semibold text-content-primary print:text-black">{item.value}</div>
            {item.detail ? <div className="mt-1 text-[11px] leading-4 text-content-muted print:text-neutral-600">{item.detail}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPreviewSection(section: ReportPreviewSection) {
  if (section.kind === "summary") return renderSummarySection(section);
  if (section.kind === "chart") return renderChartSection(section);
  return renderInfoSection(section);
}

export function ReportPreview({ preview, isLoading }: ReportPreviewProps) {
  if (!preview) {
    return (
      <PanelCard data-testid="report-preview-empty" className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
        <FileText className="h-8 w-8 text-content-muted" />
        <div>
          <h2 className="text-[18px] font-semibold text-content-primary">Preview</h2>
          <p className="mt-1 max-w-md text-[13px] text-content-muted">
            Build a report request to inspect the generated payload, table columns, charts, and output metadata before exporting, printing, emailing, or scheduling.
          </p>
        </div>
      </PanelCard>
    );
  }

  const summaryItems = getPreviewSummaryItems(preview);

  return (
    <PanelCard className="report-print-surface report-preview-a4 overflow-hidden p-0 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle p-5 print:border-neutral-300">
        <div>
          <h2 className="text-[20px] font-semibold text-content-primary print:text-black">
            {preview.metadata?.title ?? "Preview"}
          </h2>
          <p className="mt-1 text-[12px] text-content-muted print:text-neutral-600">
            Generated {new Date(preview.generatedAtIso).toLocaleString()}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-content-muted print:text-neutral-600">
            {(preview.metadata?.filters ?? []).map((filter) => (
              <span key={filter} className="rounded-full border border-border-subtle bg-panel-muted px-2 py-1 print:border-neutral-300 print:bg-white">
                {filter}
              </span>
            ))}
          </div>
        </div>
        <div className="grid w-full min-w-[min(100%,560px)] flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-[12px] border border-border-subtle bg-panel-muted px-3 py-2 print:border-neutral-300 print:bg-white">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted print:text-neutral-500">
                {item.label}
              </div>
              <div className="mt-1 text-[14px] font-semibold text-content-primary print:text-black">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {preview.metadata?.warnings?.length ? (
        <div className="border-b border-warning/25 bg-warning/10 px-5 py-3 text-[12px] text-warning print:border-neutral-300 print:bg-white print:text-black">
          {preview.metadata.warnings.join(" ")}
        </div>
      ) : null}

      {preview.sections?.length ? (
        <div className="space-y-3 border-b border-border-subtle p-5 print:border-neutral-300">
          {preview.sections.map(renderPreviewSection)}
        </div>
      ) : null}

      <div className="overflow-auto p-5 custom-scrollbar print:overflow-visible">
        <table data-testid="report-preview-table" className="w-full min-w-[720px] border-collapse text-left text-[13px] print:min-w-0">
          <thead>
            <tr className="border-b border-border-subtle text-[11px] uppercase tracking-[0.14em] text-content-muted print:border-neutral-300 print:text-neutral-500">
              <th className="py-3 pr-4">Vehicle</th>
              <th className="py-3 pr-4">Time</th>
              {preview.columns.map((column) => (
                <th key={column.id} className="py-3 pr-4">
                  {column.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.length ? (
              preview.rows.map((row, rowIndex) => (
                <tr key={`${row.vehicleId}-${row.timestampIso ?? rowIndex}`} className="border-b border-border-subtle/70 print:border-neutral-200">
                  <td className="py-3 pr-4 font-semibold text-content-primary print:text-black">{row.vehicleId}</td>
                  <td className="py-3 pr-4 text-content-muted print:text-neutral-600">
                    {row.timestampIso ? new Date(row.timestampIso).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "--"}
                  </td>
                  {preview.columns.map((column) => (
                    <td key={column.id} className="py-3 pr-4 text-content-secondary print:text-neutral-700">
                      {formatReportPreviewValue(column, row.values[column.id] ?? null)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={preview.columns.length + 2} className="py-6 text-center text-[12px] text-content-muted print:text-neutral-600">
                  No rows match the selected vehicles, period, and report capabilities.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {isLoading ? (
          <p className="mt-4 text-[12px] text-content-muted">Refreshing preview...</p>
        ) : null}
      </div>
    </PanelCard>
  );
}
