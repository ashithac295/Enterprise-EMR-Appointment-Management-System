import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
