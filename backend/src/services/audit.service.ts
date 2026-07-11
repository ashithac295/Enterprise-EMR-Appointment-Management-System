import { AuditLog } from '../models/AuditLog.model';
import { Types } from 'mongoose';

/**
 * Fire-and-forget audit logging. Failures are logged but never thrown, so a
 * logging hiccup can never block or fail the primary business operation
 * (e.g. an appointment booking should still succeed even if audit write fails).
 */
export async function createAuditLog(
  userId: Types.ObjectId | string,
  userName: string,
  userRole: string,
  action: string,
  entity: string
): Promise<void> {
  try {
    await AuditLog.create({ userId, userName, userRole, action, entity, timestamp: new Date() });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
