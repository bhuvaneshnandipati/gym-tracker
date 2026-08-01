/** Date/time helpers used by the workout editor and lists. */

/** Today's date as a local YYYY-MM-DD string. */
export function todayISODate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Current local time as HH:MM. */
export function nowTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Combine a YYYY-MM-DD date and HH:MM time into an ISO timestamp, or null. */
export function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}`);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

/** Extract HH:MM (local) from an ISO timestamp, or '' when null. */
export function timeFromISO(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Seconds between a start and end time on the same date (handles past-midnight). */
export function durationSeconds(date: string, start: string, end: string): number | null {
  const s = combineDateTime(date, start);
  const e = combineDateTime(date, end);
  if (!s || !e) return null;
  let diff = (new Date(e).getTime() - new Date(s).getTime()) / 1000;
  if (diff < 0) diff += 24 * 3600; // assume the session ran past midnight
  return Math.round(diff);
}

/** Human duration like "1h 12m" or "45m". */
export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Friendly date like "Mon, Jun 24". */
export function formatDateShort(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Full date like "Monday, June 24, 2026". */
export function formatDateLong(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Whole days between a YYYY-MM-DD date and today, or null when unparseable. */
export function daysSince(dateISO: string): number | null {
  const then = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const today = new Date(`${todayISODate()}T00:00:00`);
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/** Relative label such as "today", "yesterday" or "6 days ago". */
export function daysAgoLabel(dateISO: string): string {
  const days = daysSince(dateISO);
  if (days == null) return dateISO;
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Format a number of seconds as a clock: "0:45", "12:00", "1:05:30". */
export function formatClock(totalSeconds: number | null): string {
  if (totalSeconds == null) return '—';
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
