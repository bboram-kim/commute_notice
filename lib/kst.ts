// All product times are Asia/Seoul (UTC+9, no DST).
const OFFSET_MS = 9 * 60 * 60 * 1000;

export type KstParts = {
  date: string; // YYYY-MM-DD
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
};

export function kstParts(d: Date): KstParts {
  const shifted = new Date(d.getTime() + OFFSET_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function kstHHMM(d: Date): string {
  const p = kstParts(d);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** ISO 8601 with +09:00 offset, second precision. */
export function kstIso(d: Date): string {
  const shifted = new Date(d.getTime() + OFFSET_MS);
  return `${shifted.toISOString().slice(0, 19)}+09:00`;
}

/** Instant for a KST wall-clock date ("YYYY-MM-DD") and time ("HH:MM"). */
export function kstDateAt(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+09:00`);
}

export function floorToMinute(d: Date): Date {
  return new Date(Math.floor(d.getTime() / 60000) * 60000);
}
