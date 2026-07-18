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
export function formatDate(dateString: string | Date, format = "DD/MM/YYYY") {
  return dayjs(dateString).tz().format(format);
}
export function formatDateTime(dateString: string | Date, format = "DD/MM/YYYY HH:mm") {
  return dayjs(dateString).tz().format(format);
}
