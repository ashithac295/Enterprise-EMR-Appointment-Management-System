import { FilterQuery, Types } from 'mongoose';
import { Appointment, IAppointment, AppointmentStatus } from '../models/Appointment.model';
import { User } from '../models/User.model';
import { DoctorSchedule } from '../models/DoctorSchedule.model';
import { Patient } from '../models/Patient.model';
import { ApiError } from '../utils/ApiError';
import { todayDateString } from '../utils/time.util';
import { generatePublicId } from '../utils/generateId';
import { createPatient } from './patient.service';

interface BookAppointmentInput {
  patientType: 'Existing' | 'New';
  patientId?: string;
  patientName: string;
  patientMobile: string;
  patientEmail?: string;
  doctorId: string;
  date: string;
  time: string;
  purpose: string;
  notes?: string;
  bookedBy: { userId: string; name: string; role: string };
}

// Status workflow: Scheduled -> Arrived -> Completed | Cancelled.
// Completed and Cancelled are terminal states.
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Scheduled: ['Arrived', 'Cancelled'],
  Arrived: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: []
};

export async function bookAppointment(input: BookAppointmentInput): Promise<IAppointment> {
  const todayStr = todayDateString();
  if (input.date < todayStr) {
    throw ApiError.badRequest('Cannot book appointments in the past.');
  }

  const doctor = await User.findOne({ _id: input.doctorId, role: 'Doctor' });
  if (!doctor) {
    throw ApiError.notFound('Doctor not found.');
  }

  const schedule = await DoctorSchedule.findOne({ doctorId: input.doctorId });
  if (!schedule) {
    throw ApiError.notFound('Doctor schedule not configured.');
  }

  // Resolve / create the patient record first. For a brand-new patient this
  // is a plain insert; for an existing patient we just verify it exists.
  let patient;
  if (input.patientType === 'New') {
    patient = await createPatient({
      name: input.patientName,
      mobile: input.patientMobile,
      email: input.patientEmail
    });
  } else {
    patient = await Patient.findById(input.patientId);
    if (!patient) {
      throw ApiError.notFound('Existing patient not found.');
    }
  }

  try {
    // Single atomic insert. Double-booking is prevented by the partial unique
    // index on (doctorId, date, time) defined in the Appointment model - if
    // two requests race for the same slot, MongoDB guarantees only one insert
    // succeeds; the loser throws a duplicate-key error (code 11000) which we
    // translate into a 409 below. This gives us transaction-level safety
    // without requiring a replica set.
    const appointment = await Appointment.create({
      patientId: patient._id,
      patientName: input.patientName.trim(),
      patientMobile: input.patientMobile.trim(),
      patientType: input.patientType,
      doctorId: doctor._id,
      doctorName: doctor.name,
      department: doctor.doctorInfo?.department || 'General Medicine',
      date: input.date,
      time: input.time,
      duration: schedule.slotDuration,
      purpose: input.purpose.trim(),
      notes: input.notes ? input.notes.trim() : '',
      status: 'Scheduled',
      bookedBy: input.bookedBy
    });

    return appointment;
  } catch (err: any) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Double booking prevented. This slot has already been booked.');
    }
    throw err;
  }
}

interface ListAppointmentsInput {
  requesterRole: string;
  requesterId: string;
  search?: string;
  department?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export async function listAppointments(input: ListAppointmentsInput) {
  const filter: FilterQuery<IAppointment> = {};

  // Doctors are restricted to their own appointments at the query level
  // (not just in the UI) - this is enforced server-side regardless of what
  // the client sends.
  if (input.requesterRole === 'Doctor') {
    filter.doctorId = new Types.ObjectId(input.requesterId);
  }

  if (input.department) filter.department = new RegExp(`^${escapeRegex(input.department)}$`, 'i');
  if (input.status) filter.status = new RegExp(`^${escapeRegex(input.status)}$`, 'i');

  if (input.startDate || input.endDate) {
    filter.date = {};
    if (input.startDate) filter.date.$gte = input.startDate;
    if (input.endDate) filter.date.$lte = input.endDate;
  }

  if (input.search) {
    const regex = new RegExp(escapeRegex(input.search.trim()), 'i');
    filter.$or = [{ patientName: regex }, { doctorName: regex }, { patientMobile: regex }];
  }

  const sortField = input.sortBy || 'date';
  const sortDir = input.sortOrder === 'desc' ? -1 : 1;
  // Tie-break same-day appointments by time so ordering is deterministic.
  const sort: Record<string, 1 | -1> = sortField === 'date' ? { date: sortDir, time: sortDir } : { [sortField]: sortDir };

  const skip = (input.page - 1) * input.limit;

  // Query and count run in parallel; both use the indexes defined on the
  // Appointment model (doctorId+date, date+status, text index) to avoid
  // in-memory full-collection scans as data grows.
  const [results, total] = await Promise.all([
    Appointment.find(filter).sort(sort).skip(skip).limit(input.limit),
    Appointment.countDocuments(filter)
  ]);

  return {
    results,
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit) || 1
    }
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getAppointmentById(id: string): Promise<IAppointment> {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found.');
  return appt;
}

export async function updateAppointment(
  _id: string,
  requester: { _id: string; role: string },
  updates: { purpose?: string; notes?: string; status?: AppointmentStatus }
): Promise<IAppointment> {
  const appt = await Appointment.findById(_id);
  if (!appt) throw ApiError.notFound('Appointment not found.');

  if (requester.role === 'Doctor' && appt.doctorId.toString() !== requester._id) {
    throw ApiError.forbidden('You can only update your own appointments.');
  }

  if (updates.status && updates.status !== appt.status) {
    const allowed = ALLOWED_TRANSITIONS[appt.status];
    if (!allowed.includes(updates.status)) {
      throw ApiError.badRequest(`Invalid status transition from '${appt.status}' to '${updates.status}'.`);
    }
    appt.status = updates.status;
  }

  if (updates.purpose !== undefined) appt.purpose = updates.purpose.trim();
  if (updates.notes !== undefined) appt.notes = updates.notes.trim();

  await appt.save();
  return appt;
}

export async function cancelAppointment(id: string): Promise<IAppointment> {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found.');

  if (appt.status === 'Cancelled' || appt.status === 'Completed') {
    throw ApiError.badRequest(`Cannot cancel an appointment that is already ${appt.status.toLowerCase()}.`);
  }

  appt.status = 'Cancelled';
  await appt.save();
  return appt;
}

export async function markArrived(id: string): Promise<IAppointment> {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found.');

  if (appt.status !== 'Scheduled') {
    throw ApiError.badRequest(
      `Invalid action. Only Scheduled appointments can be marked as Arrived. Current status: '${appt.status}'.`
    );
  }

  appt.status = 'Arrived';
  await appt.save();
  return appt;
}

// Kept for symmetry with the pre-migration public-ID scheme; not currently
// used since Appointment now relies on Mongo's ObjectId as the primary key.
export function generateAppointmentPublicId(): string {
  return generatePublicId('APPT');
}
