export type PeriodMode = "all" | "today" | "this-month" | "last-month" | "this-year" | "date" | "month" | "custom";
export type DateRange = { from: string | null; to: string | null; valid: boolean };

export function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthBounds(month: string): DateRange {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { from: null, to: null, valid: false };
  const [year, monthNumber] = month.split("-").map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthNumber - 1];
  return { from: `${month}-01`, to: `${month}-${days}`, valid: true };
}

export function getDateRange(mode: PeriodMode, day: string, month: string, from: string, to: string, now: Date): DateRange {
  const today = localDateValue(now);
  if (mode === "all") return { from: null, to: null, valid: true };
  if (mode === "today") return { from: today, to: today, valid: true };
  if (mode === "this-month") return monthBounds(today.slice(0, 7));
  if (mode === "last-month") return monthBounds(localDateValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7));
  if (mode === "this-year") return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31`, valid: true };
  if (mode === "month") return monthBounds(month);
  if (mode === "date") return { from: day || null, to: day || null, valid: /^\d{4}-\d{2}-\d{2}$/.test(day) };
  return { from: from || null, to: to || null, valid: /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to };
}

export function isWithinDateRange(date: string, range: DateRange) {
  return range.valid && (!range.from || date >= range.from) && (!range.to || date <= range.to);
}