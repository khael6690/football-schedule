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
  locale: string = "id-ID",
  timeZone?: string
): string {
  if (!dateInput) return "";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    return "";
  }
}

/** WIB (Asia/Jakarta) is a fixed UTC+7 offset — no DST. */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * ISO `YYYY-MM-DD` key of the WIB calendar day containing `date`,
 * independent of the browser timezone.
 */
export function toWibDateKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Instant at 12:00 WIB of the WIB day containing `date`.
 * Safe anchor: stays inside the same WIB day under any browser timezone
 * and after local DST-affected day arithmetic.
 */
export function wibDayAnchor(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 12) - WIB_OFFSET_MS
  );
}

/** True when both instants fall on the same WIB calendar day. */
export function isSameWibDay(a: Date, b: Date): boolean {
  return toWibDateKey(a) === toWibDateKey(b);
}

/** True when the instant falls on the current WIB calendar day. */
export function isWibToday(date: Date): boolean {
  return toWibDateKey(date) === toWibDateKey(new Date());
}

/**
 * Helper to convert Date to YYYYMMDD string for API queries (WIB calendar day).
 */
export function toScoreboardDateParam(date: Date = new Date()): string {
  return toWibDateKey(date).replace(/-/g, "");
}

/**
 * Same WIB calendar date as toScoreboardDateParam, but ISO `YYYY-MM-DD`
 * (used by /api/fixtures/date/:date).
 */
export function toIsoDateParam(date: Date = new Date()): string {
  return toWibDateKey(date);
}
