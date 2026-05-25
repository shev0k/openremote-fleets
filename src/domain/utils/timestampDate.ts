export function rebaseIsoTimestampDate(timestampIso: string, targetDateIso: string): string {
  const timePart = timestampIso.includes("T") ? timestampIso.slice(timestampIso.indexOf("T")) : "T00:00:00.000Z";
  const rebasedTimestamp = new Date(`${targetDateIso}${timePart}`);

  return Number.isNaN(rebasedTimestamp.valueOf()) ? `${targetDateIso}${timePart}` : rebasedTimestamp.toISOString();
}
