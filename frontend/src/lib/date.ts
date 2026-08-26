/**
 * Date & Timezone utilities for Football Live
 * Default timezone: Asia/Jakarta (WIB, UTC+7)
 */

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

/**
 * Returns the timezone abbreviation (e.g. "WIB", "WITA", "WIT", "UTC+X")
 */
export function getTimezoneLabel(timeZone: string = DEFAULT_TIMEZONE): string {
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone;
    if (userTz === "Asia/Jakarta" || userTz === "Asia/Pontianak") return "WIB";
    if (userTz === "Asia/Makassar" || userTz === "Asia/Ujung_Pandang") return "WITA";
    if (userTz === "Asia/Jayapura") return "WIT";
    
    // Fallback timezone abbreviation
    const formatter = new Intl.DateTimeFormat("id-ID", { timeZone: userTz, timeZoneName: "short" });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart ? tzPart.value : "WIB";
  } catch {
    return "WIB";
  }
}

/**
 * Formats match kickoff time in 24-hour format with timezone suffix
 * e.g. "02:00 WIB" or "22:30 WIB"
 */
export function formatKickoffTime(
  dateInput: string | Date | null | undefined,
  showTz: boolean = true
): string {
  if (!dateInput) return "";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return "";

    const timeStr = date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(".", ":");

    if (!showTz) return timeStr;
    const tzLabel = getTimezoneLabel();
    return `${timeStr} ${tzLabel}`;
  } catch {
    return "";
  }
}

/**
 * Formats full match date (e.g. "Rabu, 26 Agustus 2026" or "Wednesday, August 26, 2026")
 */
export function formatFullMatchDate(
  dateInput: string | Date | null | undefined,
  locale: string = "id-ID"
): string {
  if (!dateInput) return "";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Formats short match date (e.g. "Rab, 26 Agu" or "Wed, Aug 26")
 */
export function formatShortMatchDate(
  dateInput: string | Date | null | undefined,
  locale: string = "id-ID"
): string {
  if (!dateInput) return "";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

/**
 * Helper to convert Date to YYYYMMDD string for API queries
 */
export function toScoreboardDateParam(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
