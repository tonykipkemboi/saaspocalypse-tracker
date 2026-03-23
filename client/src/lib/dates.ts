/** Format a YYYY-MM-DD date string into a readable short form like "Oct 29, 2025" */
export function formatEarningsDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a quarter + date into a compact label like "Q2 FY2026 · Oct 29, 2025" */
export function formatQuarterDate(quarter: string, earningsDate: string): string {
  const formatted = formatEarningsDate(earningsDate);
  if (formatted && quarter) return `${quarter} · ${formatted}`;
  return quarter || formatted || "";
}
