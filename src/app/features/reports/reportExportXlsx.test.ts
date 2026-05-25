import { describe, expect, it } from "vitest";
import {
  createReportWorksheetXml,
  reportSpreadsheetColumnName,
} from "./reportExportXlsx";

describe("report export XLSX helpers", () => {
  it("maps zero-based column indexes to spreadsheet column names", () => {
    expect(reportSpreadsheetColumnName(0)).toBe("A");
    expect(reportSpreadsheetColumnName(25)).toBe("Z");
    expect(reportSpreadsheetColumnName(26)).toBe("AA");
    expect(reportSpreadsheetColumnName(701)).toBe("ZZ");
  });

  it("escapes inline worksheet values", () => {
    const xml = createReportWorksheetXml([["A&B", "<speed>", "\"quoted\""]]);

    expect(xml).toContain("A&amp;B");
    expect(xml).toContain("&lt;speed&gt;");
    expect(xml).toContain("&quot;quoted&quot;");
  });
});
