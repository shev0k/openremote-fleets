const textEncoder = new TextEncoder();

export function normalizeReportExportFileName(fileName: string): string {
  return (fileName || "fleet-report")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "fleet-report";
}

export function bytesFromText(text: string): Uint8Array {
  return textEncoder.encode(text);
}
