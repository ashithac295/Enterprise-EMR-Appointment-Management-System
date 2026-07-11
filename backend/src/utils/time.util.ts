/** Converts "HH:MM" to minutes since midnight. */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Converts minutes since midnight back to "HH:MM". */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Returns today's date as YYYY-MM-DD in server-local time. */
export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Returns current minutes-since-midnight in server-local time. */
export function currentMinutesOfDay(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
