import { User } from '../models/User.model';
import { DoctorSchedule } from '../models/DoctorSchedule.model';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from './auth.service';

export async function listDoctors() {
  return User.find({ role: 'Doctor', isActive: true }).sort({ name: 1 });
}

const DEFAULT_SCHEDULE_TEMPLATE = {
  workingDays: [1, 2, 3, 4, 5],
  sessions: [
    { name: 'Morning Session', startTime: '09:00', endTime: '12:00' },
    { name: 'Evening Session', startTime: '13:00', endTime: '17:00' }
  ],
  slotDuration: 15,
  breakTimings: [{ name: 'Lunch Break', startTime: '12:00', endTime: '13:00' }]
};

export async function createDoctor(input: {
  email: string;
  password: string;
  name: string;
  specialty: string;
  department: string;
}) {
  const existing = await User.findOne({ email: input.email.trim().toLowerCase() });
  if (existing) {
    throw ApiError.badRequest('Email already registered.');
  }

  const passwordHash = await hashPassword(input.password);
  const doctor = await User.create({
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    passwordHash,
    role: 'Doctor',
    doctorInfo: { specialty: input.specialty, department: input.department }
  });

  // Every doctor gets a sensible default schedule so they immediately have
  // bookable slots; Super Admin can reconfigure it afterwards.
  await DoctorSchedule.create({ doctorId: doctor._id, ...DEFAULT_SCHEDULE_TEMPLATE });

  return doctor;
}

export async function createReceptionist(input: { email: string; password: string; name: string }) {
  const existing = await User.findOne({ email: input.email.trim().toLowerCase() });
  if (existing) {
    throw ApiError.badRequest('Email already registered.');
  }

  const passwordHash = await hashPassword(input.password);
  return User.create({
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    passwordHash,
    role: 'Receptionist'
  });
}
