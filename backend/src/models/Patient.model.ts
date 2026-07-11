import { Schema, model, Document } from 'mongoose';

export interface IPatient extends Document {
  publicId: string; // e.g. PAT-482913
  name: string;
  mobile: string;
  email?: string;
  createdAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    // Indexed to support fast lookup during "Existing Patient" search by mobile.
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Supports the combined patient search (name / mobile / publicId) required by
// the Appointment Booking flow without needing a full collection scan.
patientSchema.index({ name: 'text', mobile: 'text', publicId: 'text' });

export const Patient = model<IPatient>('Patient', patientSchema);
