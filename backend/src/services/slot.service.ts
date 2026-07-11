import { DoctorSchedule } from '../models/DoctorSchedule.model';
import { Appointment } from '../models/Appointment.model';
import { ApiError } from '../utils/ApiError';
import { parseTimeToMinutes, formatMinutesToTime, todayDateString, currentMinutesOfDay } from '../utils/time.util';

export interface SlotResult {
  time: string;
  available: boolean;
  reason?: string;
}

/**
 * Dynamically generates the day's appointment slots from the doctor's
 * schedule (sessions + slotDuration), excludes anything overlapping a break,
 * and marks slots unavailable if they're in the past or already booked.
 * Nothing is persisted - slots are a derived view, not stored documents,
 * which keeps them always in sync with the schedule and existing bookings.
 */
export async function generateSlots(doctorId: string, date: string): Promise<SlotResult[]> {
  const schedule = await DoctorSchedule.findOne({ doctorId });
  if (!schedule) {
    throw ApiError.notFound('Schedule not found for this doctor.');
  }

  const { workingDays, sessions, slotDuration, breakTimings } = schedule;

  // JS Date.getDay(): 0 = Sunday ... 6 = Saturday. Appending T00:00:00 avoids
  // UTC-shift bugs where new Date('YYYY-MM-DD') can roll to the previous day
  // depending on server timezone.
  const queryDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = queryDate.getDay();

  if (!workingDays.includes(dayOfWeek)) {
    return [];
  }

  const bookedAppointments = await Appointment.find({
    doctorId,
    date,
    status: { $ne: 'Cancelled' }
  }).select('time');
  const bookedTimes = new Set(bookedAppointments.map((a) => a.time));

  const todayStr = todayDateString();
  const currentMinutes = currentMinutesOfDay();
  const isToday = date === todayStr;
  const isPastDate = date < todayStr;

  const slots: SlotResult[] = [];

  for (const session of sessions) {
    const sessionStart = parseTimeToMinutes(session.startTime);
    const sessionEnd = parseTimeToMinutes(session.endTime);

    for (let timeMin = sessionStart; timeMin + slotDuration <= sessionEnd; timeMin += slotDuration) {
      const slotTimeStr = formatMinutesToTime(timeMin);

      const overlapsBreak = breakTimings.some((brk) => {
        const breakStart = parseTimeToMinutes(brk.startTime);
        const breakEnd = parseTimeToMinutes(brk.endTime);
        return timeMin < breakEnd && timeMin + slotDuration > breakStart;
      });
      // Appointment slots must never be generated during break periods.
      if (overlapsBreak) continue;

      let available = true;
      let reason: string | undefined;

      if (isPastDate) {
        available = false;
        reason = 'Past date';
      } else if (isToday && timeMin < currentMinutes) {
        available = false;
        reason = 'Past time';
      } else if (bookedTimes.has(slotTimeStr)) {
        available = false;
        reason = 'Booked';
      }

      slots.push({ time: slotTimeStr, available, ...(reason ? { reason } : {}) });
    }
  }

  slots.sort((a, b) => a.time.localeCompare(b.time));
  return slots;
}
