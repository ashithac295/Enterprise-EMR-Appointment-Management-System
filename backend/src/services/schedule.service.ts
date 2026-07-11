import { DoctorSchedule } from '../models/DoctorSchedule.model';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';

export async function getSchedule(doctorId: string) {
  const schedule = await DoctorSchedule.findOne({ doctorId });
  if (!schedule) {
    throw ApiError.notFound('Schedule not found for this doctor.');
  }
  return schedule;
}

export async function upsertSchedule(input: {
  doctorId: string;
  workingDays: number[];
  sessions: { name: string; startTime: string; endTime: string }[];
  slotDuration: number;
  breakTimings: { name: string; startTime: string; endTime: string }[];
}) {
  const doctor = await User.findOne({ _id: input.doctorId, role: 'Doctor' });
  if (!doctor) {
    throw ApiError.notFound('Doctor not found.');
  }

  const schedule = await DoctorSchedule.findOneAndUpdate(
    { doctorId: input.doctorId },
    {
      doctorId: input.doctorId,
      workingDays: input.workingDays,
      sessions: input.sessions,
      slotDuration: input.slotDuration,
      breakTimings: input.breakTimings
    },
    { new: true, upsert: true, runValidators: true }
  );

  return schedule;
}
