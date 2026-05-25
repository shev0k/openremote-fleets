import {
  GeneratedReportPreview,
  ReportExportOptions,
} from "../../../domain/models/reports";
import { getPreviewSummaryItems } from "./reportBuilderViewModel";
import { bytesFromText } from "./reportExportCommon";
import { getReportPreviewTable } from "./reportExportTable";

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function formatReportExportChartPointValue(value: number, unit?: string): string {
  const numericValue = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  return `${numericValue}${unit ? ` ${unit}` : ""}`;
}

export function createReportPdf(
  preview: GeneratedReportPreview,
  options: ReportExportOptions,
): Uint8Array {
  const pageWidth = options.pageOrientation === "landscape" ? 842 : 595;
  const pageHeight = options.pageOrientation === "landscape" ? 595 : 842;
  const margin = 42;
  const lineHeight = 16;
  const bottom = margin;
  const contentWidth = pageWidth - margin * 2;
  const pages: string[][] = [[]];
  let y = pageHeight - margin;

  const currentPage = () => pages[pages.length - 1];
  const newPage = () => {
    pages.push([]);
    y = pageHeight - margin;
  };
  const ensureSpace = (height = lineHeight) => {
    if (y - height < bottom) {
      newPage();
    }
  };
  const addText = (text: string, size = 10, x = margin) => {
    ensureSpace(lineHeight);
    currentPage().push("0 0 0 rg");
    currentPage().push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text.slice(0, 120))}) Tj ET`);
    y -= lineHeight;
  };
  const addMutedText = (text: string, size = 9, x = margin) => {
    ensureSpace(lineHeight);
    currentPage().push("0.38 0.38 0.38 rg");
    currentPage().push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text.slice(0, 130))}) Tj ET`);
    y -= lineHeight;
  };
  const addGap = (height = 8) => {
    ensureSpace(height);
    y -= height;
  };
  const addDivider = () => {
    ensureSpace(10);
    currentPage().push("0.82 0.82 0.82 RG");
    currentPage().push(`${margin} ${y} m ${pageWidth - margin} ${y} l S`);
    y -= 10;
  };
  const addBar = (label: string, value: string, widthPercent: number) => {
    ensureSpace(18);
    const labelWidth = 86;
    const valueWidth = 78;
    const barX = margin + labelWidth;
    const barWidth = Math.max(8, (contentWidth - labelWidth - valueWidth - 16) * widthPercent);
    currentPage().push("0 0 0 rg");
    currentPage().push(`BT /F1 9 Tf ${margin} ${y} Td (${escapePdfText(label.slice(0, 28))}) Tj ET`);
    currentPage().push("0.90 0.90 0.90 rg");
    currentPage().push(`${barX} ${y - 2} ${contentWidth - labelWidth - valueWidth - 16} 6 re f`);
    currentPage().push("0.62 0.90 0.02 rg");
    currentPage().push(`${barX} ${y - 2} ${barWidth} 6 re f`);
    currentPage().push("0 0 0 rg");
    currentPage().push(`BT /F1 9 Tf ${pageWidth - margin - valueWidth} ${y} Td (${escapePdfText(value)}) Tj ET`);
    y -= 18;
  };
  const addSectionTitle = (title: string) => {
    addGap(8);
    addText(title, 13);
  };

  addText(preview.metadata?.title ?? "Fleet Report", 18);
  addMutedText(`Generated: ${preview.generatedAtIso}`);
  if (preview.metadata?.periodLabel) addMutedText(`Period: ${preview.metadata.periodLabel}`);
  if (preview.metadata?.selectedVehiclesLabel) addMutedText(`Vehicles: ${preview.metadata.selectedVehiclesLabel}`);
  if (preview.metadata?.filters?.length) addMutedText(`Filters: ${preview.metadata.filters.join(", ")}`);
  addDivider();

  if (options.includeSummary) {
    addSectionTitle("Summary");
    getPreviewSummaryItems(preview).forEach((item) => addText(`${item.label}: ${item.value}`));
  }

  for (const section of preview.sections ?? []) {
    if (section.kind === "summary" && !options.includeSummary) continue;
    if (section.kind === "chart" && !options.includeCharts) continue;
    if (section.kind === "map" && !options.includeMap) continue;
    if (section.kind === "raw" && !options.includeRawData) continue;

    addSectionTitle(section.title);
    if (section.description) addMutedText(section.description);
    section.items?.forEach((item) => {
      addText(`${item.label}: ${item.value}`);
      if (item.detail) addMutedText(item.detail);
    });

    const points = section.chart?.points ?? [];
    if (points.length) {
      const maxValue = Math.max(1, ...points.map((point) => point.value));
      points.forEach((point) => {
        addBar(
          point.label,
          formatReportExportChartPointValue(point.value, point.unit ?? section.chart?.unit),
          Math.max(0.04, Math.min(1, point.value / maxValue)),
        );
      });
    }
  }

  addSectionTitle("Report data");
  getReportPreviewTable(preview).forEach((row, index) => {
    addText(row.join(" | "), index === 0 ? 10 : 9);
  });

  pages.forEach((page, index) => {
    page.push("0.45 0.45 0.45 rg");
    page.push(`BT /F1 8 Tf ${pageWidth - margin - 50} ${margin - 18} Td (${index + 1} / ${pages.length}) Tj ET`);
  });

  const pageContents = pages.map((commands) => commands.join("\n"));
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "",
    "3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  const pageObjectIds: number[] = [];

  pageContents.forEach((content) => {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(
      `${pageObjectId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >> endobj\n`,
      `${contentObjectId} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`,
    );
  });
  objects[1] = `2 0 obj << /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >> endobj\n`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return bytesFromText(pdf);
}
