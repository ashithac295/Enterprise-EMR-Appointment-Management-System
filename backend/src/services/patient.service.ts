import { Patient } from '../models/Patient.model';
import { Appointment } from '../models/Appointment.model';
import { generatePublicId } from '../utils/generateId';

export async function searchPatients(search?: string, doctorId?: string) {
  let filter: Record<string, any> = {};

  if (doctorId) {
    const patientIds = await Appointment.find({ doctorId }).distinct('patientId');
    filter._id = { $in: patientIds };
  }

  if (!search) {
    return Patient.find(filter).sort({ createdAt: -1 }).limit(50);
  }

  const regex = new RegExp(search.trim(), 'i');
  return Patient.find({
    ...filter,
    $or: [{ name: regex }, { mobile: regex }, { publicId: regex }]
  }).limit(50);
}

/** Creates a new patient record with a generated public-facing ID. */
export async function createPatient(input: { name: string; mobile: string; email?: string }) {
  const publicId = generatePublicId('PAT');
  return Patient.create({
    publicId,
    name: input.name.trim(),
    mobile: input.mobile.trim(),
    email: input.email ? input.email.trim() : ''
  });
}

export async function findPatientById(patientId: string) {
  return Patient.findById(patientId);
}