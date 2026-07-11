import { Schema, model, Document, Types } from 'mongoose';

export interface ISession {
  name: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface IBreak {
  name: string;
  startTime: string;
  endTime: string;
}

export interface IDoctorSchedule extends Document {
  doctorId: Types.ObjectId;
  workingDays: number[]; // 0=Sunday ... 6=Saturday
  sessions: ISession[];
  slotDuration: number; // minutes
  breakTimings: IBreak[];
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { _id: false }
);

const breakSchema = new Schema<IBreak>(
  {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { _id: false }
);

const doctorScheduleSchema = new Schema<IDoctorSchedule>(
  {
    // One schedule document per doctor - unique index doubles as the lookup key.
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    workingDays: { type: [Number], required: true },
    sessions: { type: [sessionSchema], required: true },
    slotDuration: { type: Number, required: true, min: 5 },
    breakTimings: { type: [breakSchema], default: [] }
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const DoctorSchedule = model<IDoctorSchedule>('DoctorSchedule', doctorScheduleSchema);
