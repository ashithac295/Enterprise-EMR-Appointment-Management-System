import { Schema, model, Document, Types } from 'mongoose';

export type AppointmentStatus = 'Scheduled' | 'Arrived' | 'Completed' | 'Cancelled';
export type PatientType = 'Existing' | 'New';

export interface IAppointment extends Document {
  patientId: Types.ObjectId;
  patientName: string;
  patientMobile: string;
  patientType: PatientType;
  doctorId: Types.ObjectId;
  doctorName: string;
  department: string;
  date: string; // YYYY-MM-DD (string keeps timezone handling simple & matches slot generation)
  time: string; // HH:MM
  duration: number;
  purpose: string;
  notes?: string;
  status: AppointmentStatus;
  bookedBy: {
    userId: Types.ObjectId;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientName: { type: String, required: true },
    patientMobile: { type: String, required: true },
    patientType: { type: String, enum: ['Existing', 'New'], required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName: { type: String, required: true },
    department: { type: String, required: true, index: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true },
    purpose: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Scheduled', 'Arrived', 'Completed', 'Cancelled'],
      default: 'Scheduled',
      index: true
    },
    bookedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      role: { type: String, required: true }
    }
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// CONCURRENCY CONTROL (double-booking prevention)
// ---------------------------------------------------------------------------
// A partial unique index on (doctorId, date, time) that only applies to
// non-cancelled appointments. MongoDB enforces this atomically at the storage
// layer: if two requests race to insert the same doctor/date/time slot, only
// the first insert succeeds and the second raises a duplicate key error
// (E11000), which the service layer catches and turns into a 409 Conflict.
// This avoids needing multi-document transactions (which require a replica
// set) while still guaranteeing consistency under concurrent writes.
appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['Scheduled', 'Arrived', 'Completed'] } }
  }
);

// Supports GET /appointments filtering/sorting by doctor+date range and by
// department/status without a collection scan.
appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ patientName: 'text', doctorName: 'text', patientMobile: 'text' });

export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
