import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'Super Admin' | 'Receptionist' | 'Doctor';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  doctorInfo?: {
    specialty: string;
    department: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    // Password hash lives on the User document but is excluded from default
    // query results (select: false) so it is never accidentally serialized
    // back to a client - defense in depth alongside the toJSON transform below.
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['Super Admin', 'Receptionist', 'Doctor'],
      required: true,
      index: true
    },
    doctorInfo: {
      specialty: { type: String },
      department: { type: String }
    },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const User = model<IUser>('User', userSchema);
