import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to Asia/Bangkok
dayjs.tz.setDefault("Asia/Bangkok");

export { dayjs };
export default dayjs;

/**
 * Parse a date string safely — date-only strings (YYYY-MM-DD) are parsed as UTC
 * to prevent timezone-induced day shifting.
 */
function parseDate(dateString: string | Date) {
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dayjs.utc(dateString);
  }
  return dayjs(dateString).tz();
}

export function formatDate(dateString: string | Date, format = "DD/MM/YYYY") {
  return parseDate(dateString).format(format);
}
export function formatDateTime(dateString: string | Date, format = "DD/MM/YYYY HH:mm") {
  return dayjs(dateString).tz().format(format);
}
